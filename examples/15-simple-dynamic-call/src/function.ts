import {
  Bytes,
  DenominationToken,
  ERC20Token,
  EvmDynamicArg,
  EvmDynamicCallBuilder,
  EvmEncodeParam,
  IntentBuilder,
  SwapBuilder,
  TokenAmount,
} from '@mimicprotocol/lib-ts'

import { inputs } from './types'

export default function main(): void {
  const chainId = inputs.chainId
  const smartAccount = inputs.smartAccount
  const recipient = inputs.recipient

  const tokenIn = ERC20Token.fromAddress(inputs.tokenIn, chainId)
  const tokenOut = ERC20Token.fromAddress(inputs.tokenOut, chainId)

  const amountIn = TokenAmount.fromStringDecimal(tokenIn, inputs.amount)
  const expectedOut = amountIn.toTokenAmount(tokenOut).unwrap()
  const minAmountOut = expectedOut.applySlippageBps(inputs.slippageBps)

  const maxFee = TokenAmount.fromStringDecimal(DenominationToken.USD(), inputs.maxFeeUsd)

  // Swap operation (tokens are received in the smart account)
  const swap = SwapBuilder.forChain(chainId)
    .addTokenInFromTokenAmount(amountIn)
    .addTokenOutFromTokenAmount(minAmountOut, smartAccount)

  /**
   * Dynamic call operation (executed after the swap using the received tokens).
   * Calls the `transfer()` function on the `tokenOut.address` contract.
   * Uses a literal address as the first argument and the swap output as the second.
   *
   * This is equivalent to:
   * `IERC20(tokenOut.address).transfer(to = recipient, value = swapResult)`
   */
  const target = tokenOut.address
  const selector = Bytes.fromHexString('0xa9059cbb') // transfer() selector
  const dynamicCall = EvmDynamicCallBuilder.forChain(chainId)
    .addCall(target, selector, [
      EvmDynamicArg.literal([new EvmEncodeParam('address', recipient.toString())], false),
      EvmDynamicArg.variable(0, 0, false), // swap operation output
    ])
    .addUser(smartAccount)

  new IntentBuilder()
    .addOperationsBuilders([swap, dynamicCall]) // The order is important!
    .addMaxFee(maxFee)
    .send()
}
