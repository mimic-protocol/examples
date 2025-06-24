import { Address, BigInt, environment, SwapBuilder, Token, TokenAmount, USD } from '@mimicprotocol/lib-ts'

import { inputs } from './types'
import { ERC20 } from './types/ERC20'
import { AaveToken } from './types/AaveToken'

export default function main(): void {
  if (inputs.slippage > 100) throw new Error('Slippage must be between 0 and 100')

  const aToken = Token.fromAddress(inputs.aToken, inputs.chainId)
  const aTokenContract = new AaveToken(aToken.address, aToken.chainId)

  const underlyingTokenAddress = aTokenContract.UNDERLYING_ASSET_ADDRESS()
  const underlyingToken = Token.fromAddress(underlyingTokenAddress, aToken.chainId)

  const underlyingTokenContract = new ERC20(underlyingToken.address, underlyingToken.chainId)
  const underlyingTokenBalanceAmount = underlyingTokenContract.balanceOf(inputs.recipient)
  const underlyingTokenBalance = TokenAmount.fromBigInt(underlyingToken, underlyingTokenBalanceAmount)
  const underlyingTokenBalanceInUsd = underlyingTokenBalance.toUsd()
  const thresholdUsd = USD.fromI32(inputs.thresholdUSD)
  console.log('Recipient underlying balance in USD: ' + underlyingTokenBalanceInUsd.toString())

  if (underlyingTokenBalanceInUsd.gt(thresholdUsd)) console.log('Recipient threshold not met')
  else {
    const depositAmountUsd = thresholdUsd.times(BigInt.fromI32(2)).minus(underlyingTokenBalanceInUsd)
    const aTokenDepositAmount = depositAmountUsd.toTokenAmount(aToken)

    const me = environment.getContext().user
    const aTokenBalanceAmount = aTokenContract.balanceOf(me)
    const aTokenBalance = TokenAmount.fromBigInt(aToken, aTokenBalanceAmount)

    if (aTokenBalance.lt(aTokenDepositAmount)) console.log('Sender balance not enough')
    else {
      const slippagePct = BigInt.fromI32(100).minus(BigInt.fromI32(inputs.slippage))
      const minAmountOut = aTokenDepositAmount.toTokenAmount(underlyingToken).times(slippagePct).div(BigInt.fromI32(100))
      console.log('Min amount out: ' + minAmountOut.toString())

      SwapBuilder.forChain(inputs.chainId)
        .addTokenInFromTokenAmount(aTokenDepositAmount)
        .addTokenOutFromTokenAmount(minAmountOut, inputs.recipient)
        .build()
        .send()
    }
  }
}
