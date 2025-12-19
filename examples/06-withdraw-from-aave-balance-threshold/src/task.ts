import { BigInt, environment, ERC20Token, log, SwapBuilder, TokenAmount, USD } from '@mimicprotocol/lib-ts'

import { AaveToken } from './types/AaveToken'
import { ERC20 } from './types/ERC20'
import { inputs } from './types'

export default function main(): void {
  const aToken = ERC20Token.fromAddress(inputs.aToken, inputs.chainId)
  const aTokenContract = new AaveToken(aToken.address, aToken.chainId)

  const underlyingTokenAddressResult = aTokenContract.UNDERLYING_ASSET_ADDRESS()
  if (underlyingTokenAddressResult.isError) throw new Error(underlyingTokenAddressResult.error)
  const underlyingTokenAddress = underlyingTokenAddressResult.value
  const underlyingToken = ERC20Token.fromAddress(underlyingTokenAddress, aToken.chainId)

  const underlyingTokenContract = new ERC20(underlyingToken.address, underlyingToken.chainId)
  const underlyingTokenBalanceAmountResult = underlyingTokenContract.balanceOf(inputs.recipient)
  if (underlyingTokenBalanceAmountResult.isError) throw new Error(underlyingTokenBalanceAmountResult.error)
  const underlyingTokenBalanceAmount = underlyingTokenBalanceAmountResult.value
  const underlyingTokenBalance = TokenAmount.fromBigInt(underlyingToken, underlyingTokenBalanceAmount)

  const underlyingTokenBalanceInUsdResult = underlyingTokenBalance.toUsd()
  if (underlyingTokenBalanceInUsdResult.isError) throw new Error(underlyingTokenBalanceInUsdResult.error)
  const underlyingTokenBalanceInUsd = underlyingTokenBalanceInUsdResult.value
  const thresholdUsd = USD.fromStringDecimal(inputs.thresholdUsd)
  log.info(`Recipient underlying balance in USD: ${underlyingTokenBalanceInUsd}`)

  if (underlyingTokenBalanceInUsd.gt(thresholdUsd)) log.info('Recipient threshold not met')
  else {
    const depositAmountUsd = thresholdUsd.times(BigInt.fromI32(2)).minus(underlyingTokenBalanceInUsd)
    const aTokenDepositAmountResult = depositAmountUsd.toTokenAmount(aToken)
    if (aTokenDepositAmountResult.isError) throw new Error(aTokenDepositAmountResult.error)
    const aTokenDepositAmount = aTokenDepositAmountResult.value

    const me = environment.getContext().user
    const aTokenBalanceAmountResult = aTokenContract.balanceOf(me)
    if (aTokenBalanceAmountResult.isError) throw new Error(aTokenBalanceAmountResult.error)
    const aTokenBalanceAmount = aTokenBalanceAmountResult.value
    const aTokenBalance = TokenAmount.fromBigInt(aToken, aTokenBalanceAmount)

    if (aTokenBalance.lt(aTokenDepositAmount)) log.info('Sender balance not enough')
    else {
      const expectedOutResult = aTokenDepositAmount.toTokenAmount(underlyingToken)
      if (expectedOutResult.isError) throw new Error(expectedOutResult.error)
      const minAmountOut = expectedOutResult.value.applySlippageBps(inputs.slippageBps as i32)
      log.info(`Min amount out: ${minAmountOut}`)

      SwapBuilder.forChain(inputs.chainId)
        .addTokenInFromTokenAmount(aTokenDepositAmount)
        .addTokenOutFromTokenAmount(minAmountOut, inputs.recipient)
        .build()
        .send()
    }
  }
}
