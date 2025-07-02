import { BigInt, environment, Swap, Token, TokenAmount, USD } from '@mimicprotocol/lib-ts'

import { AaveToken } from './types/AaveToken'
import { ERC20 } from './types/ERC20'
import { inputs } from './types'

export default function main(): void {
  if (inputs.slippage > 100) throw new Error('Slippage must be between 0 and 100')

  const aToken = Token.fromAddress(inputs.aToken, inputs.chainId)
  const aTokenContract = new AaveToken(aToken.address, aToken.chainId)

  const underlyingTokenAddress = aTokenContract.UNDERLYING_ASSET_ADDRESS()
  const underlyingToken = Token.fromAddress(underlyingTokenAddress, aToken.chainId)

  const me = environment.getContext().user
  const underlyingTokenContract = new ERC20(underlyingToken.address, underlyingToken.chainId)
  const underlyingTokenBalanceAmount = underlyingTokenContract.balanceOf(me)
  const underlyingTokenBalance = TokenAmount.fromBigInt(underlyingToken, underlyingTokenBalanceAmount)
  const underlyingTokenBalanceInUsd = underlyingTokenBalance.toUsd()
  const thresholdUsd = USD.fromI32(inputs.thresholdUSD)
  console.log('Underlying balance in USD: ' + underlyingTokenBalanceInUsd.toString())

  if (underlyingTokenBalanceInUsd.lt(thresholdUsd)) console.log('Threshold not met')
  else {
    const slippagePct = BigInt.fromI32(100).minus(BigInt.fromI32(inputs.slippage))
    const minAmountOut = underlyingTokenBalance.toTokenAmount(aToken).times(slippagePct).div(BigInt.fromI32(100))
    console.log('Min amount out: ' + minAmountOut.toString())

    Swap.create(
      inputs.chainId,
      underlyingTokenAddress,
      underlyingTokenBalanceAmount,
      inputs.aToken,
      minAmountOut.amount
    ).send()
  }
}
