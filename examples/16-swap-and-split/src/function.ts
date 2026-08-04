import {
  Address,
  Allocation,
  buildSwapAndSplit,
  DenominationToken,
  ERC20Token,
  TokenAmount,
} from '@mimicprotocol/lib-ts'

import { inputs } from './types'

export default function main(): void {
  const chainId = inputs.chainId

  const tokenIn = ERC20Token.fromAddress(inputs.tokenIn, chainId)
  const amountIn = TokenAmount.fromStringDecimal(tokenIn, inputs.amount)

  const tokenOut = ERC20Token.fromAddress(inputs.tokenOut, chainId)
  const expectedOut = amountIn.toTokenAmount(tokenOut).unwrap()
  const minAmountOut = expectedOut.applySlippageBps(inputs.slippageBps)

  const allocations: Allocation[] = inputs.allocations.split(',').map<Allocation>((s) => {
    const fields = s.split(':')
    const recipient = fields[0]
    const pct = fields[1]
    return new Allocation(Address.fromString(recipient), u16(parseInt(pct)))
  })

  const maxFee = TokenAmount.fromStringDecimal(DenominationToken.USD(), inputs.maxFeeUsd)

  // Creates a swap operation and multiple dynamic call operations to split the output token among multiple recipients.
  // Each recipient receives the percentage of the output token specified in the allocations array.
  // The last recipient receives its specified percentage plus any remaining balance caused by rounding.
  const builder = buildSwapAndSplit(
    chainId,
    amountIn,
    minAmountOut,
    allocations,
    inputs.user // Optional. If not provided, the context user will be used.
  )
  builder.addMaxFee(maxFee).build().send()
}
