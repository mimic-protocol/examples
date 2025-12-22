import { BigInt, environment, ERC20Token, log, SwapBuilder, TokenAmount, USD } from '@mimicprotocol/lib-ts'

import { AaveToken } from './types/AaveToken'
import { ERC20 } from './types/ERC20'
import { inputs } from './types'

export default function main(): void {
  const aToken = ERC20Token.fromAddress(inputs.aToken, inputs.chainId)
  const aTokenContract = new AaveToken(aToken.address, aToken.chainId)

  const underlyingTokenAddress = aTokenContract.UNDERLYING_ASSET_ADDRESS().unwrap()
  const underlyingToken = ERC20Token.fromAddress(underlyingTokenAddress, aToken.chainId)

  const underlyingTokenContract = new ERC20(underlyingToken.address, underlyingToken.chainId)
  const underlyingTokenBalanceAmount = underlyingTokenContract.balanceOf(inputs.recipient).unwrap()
  const underlyingTokenBalance = TokenAmount.fromBigInt(underlyingToken, underlyingTokenBalanceAmount)

  const underlyingTokenBalanceInUsd = underlyingTokenBalance.toUsd().unwrap()
  const thresholdUsd = USD.fromStringDecimal(inputs.thresholdUsd)
  log.info(`Recipient underlying balance in USD: ${underlyingTokenBalanceInUsd}`)

  if (underlyingTokenBalanceInUsd.gt(thresholdUsd)) log.info('Recipient threshold not met')
  else {
    const depositAmountUsd = thresholdUsd.times(BigInt.fromI32(2)).minus(underlyingTokenBalanceInUsd)
    const aTokenDepositAmount = depositAmountUsd.toTokenAmount(aToken).unwrap()

    const me = environment.getContext().user
    const aTokenBalanceAmount = aTokenContract.balanceOf(me).unwrap()
    const aTokenBalance = TokenAmount.fromBigInt(aToken, aTokenBalanceAmount)

    if (aTokenBalance.lt(aTokenDepositAmount)) log.info('Sender balance not enough')
    else {
      const expectedOut = aTokenDepositAmount.toTokenAmount(underlyingToken).unwrap()
      const minAmountOut = expectedOut.applySlippageBps(inputs.slippageBps as i32)
      log.info(`Min amount out: ${minAmountOut}`)

      SwapBuilder.forChain(inputs.chainId)
        .addTokenInFromTokenAmount(aTokenDepositAmount)
        .addTokenOutFromTokenAmount(minAmountOut, inputs.recipient)
        .build()
        .send()
    }
  }
}
