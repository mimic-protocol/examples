import { BigInt, environment, ERC20Token, log, SwapBuilder, TokenAmount, USD } from '@mimicprotocol/lib-ts'

import { AaveToken } from './types/AaveToken'
import { ERC20 } from './types/ERC20'
import { inputs } from './types'

const BPS_DENOMINATOR = BigInt.fromI32(10_000)

export default function main(): void {
  if (BigInt.fromI32(inputs.slippageBps as i32) > BPS_DENOMINATOR) throw new Error('Slippage must be between 0 and 100')

  const aToken = ERC20Token.fromAddress(inputs.aToken, inputs.chainId)
  const aTokenContract = new AaveToken(aToken.address, aToken.chainId)

  const underlyingTokenAddress = aTokenContract.UNDERLYING_ASSET_ADDRESS()
  const underlyingToken = ERC20Token.fromAddress(underlyingTokenAddress, aToken.chainId)

  const underlyingTokenContract = new ERC20(underlyingToken.address, underlyingToken.chainId)
  const underlyingTokenBalanceAmount = underlyingTokenContract.balanceOf(inputs.recipient)
  const underlyingTokenBalance = TokenAmount.fromBigInt(underlyingToken, underlyingTokenBalanceAmount)
  const underlyingTokenBalanceInUsd = underlyingTokenBalance.toUsd()
  const thresholdUsd = USD.fromStringDecimal(inputs.thresholdUsd)
  log.info(`Recipient underlying balance in USD: ${underlyingTokenBalanceInUsd}`)

  if (underlyingTokenBalanceInUsd.gt(thresholdUsd)) log.info('Recipient threshold not met')
  else {
    const depositAmountUsd = thresholdUsd.times(BigInt.fromI32(2)).minus(underlyingTokenBalanceInUsd)
    const aTokenDepositAmount = depositAmountUsd.toTokenAmount(aToken)

    const me = environment.getContext().user
    const aTokenBalanceAmount = aTokenContract.balanceOf(me)
    const aTokenBalance = TokenAmount.fromBigInt(aToken, aTokenBalanceAmount)

    if (aTokenBalance.lt(aTokenDepositAmount)) log.info('Sender balance not enough')
    else {
      const slippageFactor = BPS_DENOMINATOR.minus(BigInt.fromI32(inputs.slippageBps as i32))
      const minAmountOut = aTokenDepositAmount.toTokenAmount(underlyingToken).times(slippageFactor).div(BPS_DENOMINATOR)
      log.info(`Min amount out: ${minAmountOut}`)

      SwapBuilder.forChain(inputs.chainId)
        .addTokenInFromTokenAmount(aTokenDepositAmount)
        .addTokenOutFromTokenAmount(minAmountOut, inputs.recipient)
        .build()
        .send()
    }
  }
}
