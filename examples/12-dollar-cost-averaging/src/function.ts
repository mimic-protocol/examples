import { ERC20Token, log, SwapBuilder, TokenAmount } from '@mimicprotocol/lib-ts'

import { inputs } from './types'

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
  const expectedOut = amountIn.toTokenAmount(tokenOut).unwrap()
  // Apply slippage to calculate the expected minimum amount out
  const minAmountOut = expectedOut.applySlippageBps(inputs.slippageBps as i32)
  log.info(`Calculated minOut: ${minAmountOut} (equivalent=${expectedOut}, slippageBps=${inputs.slippageBps})`)

  // Create and execute swap
  SwapBuilder.forChain(inputs.chainId)
    .addTokenInFromTokenAmount(amountIn)
    .addTokenOutFromTokenAmount(minAmountOut, inputs.recipient)
    .build()
    .send()

  log.info('DCA swap executed successfully')
}
