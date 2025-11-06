import { BigInt, ERC20Token, log, SwapBuilder, TokenAmount } from '@mimicprotocol/lib-ts'

import { inputs } from './types'

export default function main(): void {
  // Log input parameters
  log.info('Starting DCA swap: amountFromToken={}, slippageBps={}, chainId={}, recipient={}', [
    inputs.amount,
    inputs.slippageBps.toString(),
    inputs.chainId.toString(),
    inputs.recipient.toString(),
  ])

  // Create token instances
  const tokenIn = ERC20Token.fromAddress(inputs.tokenIn, inputs.chainId)
  const tokenOut = ERC20Token.fromAddress(inputs.tokenOut, inputs.chainId)

  // Create amount from decimal string and estimatate amount out
  const amountIn = TokenAmount.fromStringDecimal(tokenIn, inputs.amount)
  const amountOut = amountIn.toTokenAmount(tokenOut)

  // Apply slippage to calculate the expected minimum amount out
  const basisPoints = BigInt.fromU16(10000)
  const slippageBps = basisPoints.minus(BigInt.fromU16(inputs.slippageBps))
  const minAmountOut = amountOut.times(slippageBps).div(basisPoints)

  log.info('Calculated minOut: {} (equivalent={}, slippageBps={})', [
    minAmountOut.toString(),
    amountOut.toString(),
    inputs.slippageBps.toString(),
  ])

  // Create and execute swap
  SwapBuilder.forChain(inputs.chainId)
    .addTokenInFromTokenAmount(amountIn)
    .addTokenOutFromTokenAmount(minAmountOut, inputs.recipient)
    .build()
    .send()

  log.info('DCA swap executed successfully')
}
