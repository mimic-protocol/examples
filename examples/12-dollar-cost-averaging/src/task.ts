import { BigInt, ERC20Token, log, SwapBuilder, TokenAmount } from '@mimicprotocol/lib-ts'

import { inputs } from './types'

const BPS_DENOMINATOR = BigInt.fromI32(10_000)

export default function main(): void {
  // Log input parameters
  log.info(
    `Starting DCA swap: amountFromToken=${inputs.amount}, slippageBps=${inputs.slippageBps}, chainId=${inputs.chainId}, recipient=${inputs.recipient}`
  )

  // Create token instances
  const tokenIn = ERC20Token.fromAddress(inputs.tokenIn, inputs.chainId)
  const tokenOut = ERC20Token.fromAddress(inputs.tokenOut, inputs.chainId)

  // Create amount from decimal string and estimate amount out
  const amountIn = TokenAmount.fromStringDecimal(tokenIn, inputs.amount)
  const expectedOut = amountIn.toTokenAmount(tokenOut)

  // Apply slippage to calculate the expected minimum amount out
  const slippageFactor = BPS_DENOMINATOR.minus(BigInt.fromI32(inputs.slippageBps as i32))
  const minAmountOut = expectedOut.times(slippageFactor).div(BPS_DENOMINATOR)
  log.info(`Calculated minOut: ${minAmountOut} (equivalent=${expectedOut}, slippageBps=${inputs.slippageBps})`)

  // Create and execute swap
  SwapBuilder.forChain(inputs.chainId)
    .addTokenInFromTokenAmount(amountIn)
    .addTokenOutFromTokenAmount(minAmountOut, inputs.recipient)
    .build()
    .send()

  log.info('DCA swap executed successfully')
}
