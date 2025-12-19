import {
  Arbitrum,
  Base,
  BigInt,
  ChainId,
  environment,
  ListType,
  log,
  Optimism,
  SwapBuilder,
  Token,
  USD,
} from '@mimicprotocol/lib-ts'

import { inputs } from './types'

const BPS_DENOMINATOR = BigInt.fromI32(10_000)

export default function main(): void {
  const chainId = inputs.chainId
  const context = environment.getContext()

  // Find tokens with user's balance > 0
  const amountsInResponse = environment.relevantTokensQuery(context.user, [chainId], USD.zero(), [], ListType.DenyList)
  if (amountsInResponse.isError) throw new Error(amountsInResponse.error)
  const amountsIn = amountsInResponse.value

  if (amountsIn.length == 0) {
    log.info(`No tokens found on chain ${chainId}`)
    return
  }

  const USDC = getUsdc(chainId)
  const slippageFactor = BPS_DENOMINATOR.minus(BigInt.fromI32(inputs.slippageBps as i32))

  for (let i = 0; i < amountsIn.length; i++) {
    const amountIn = amountsIn[i]
    const amountOutResult = amountIn.toTokenAmount(USDC)
    if (amountOutResult.isError) throw new Error(amountOutResult.error)
    const amountOut = amountOutResult.value
    const minAmountOut = amountOut.times(slippageFactor).div(BPS_DENOMINATOR)

    // Note that the recipient will receive the USDC
    SwapBuilder.forChain(chainId)
      .addTokenInFromTokenAmount(amountIn)
      .addTokenOutFromTokenAmount(minAmountOut, inputs.recipient)
      .build()
      .send()

    log.info(`Adding swap of ${amountIn} to ${minAmountOut} on chain ${chainId}`)
  }
}

function getUsdc(chainId: i32): Token {
  if (chainId == ChainId.ARBITRUM) return Arbitrum.USDC
  if (chainId == ChainId.BASE) return Base.USDC
  if (chainId == ChainId.OPTIMISM) return Optimism.USDC
  throw new Error('Invalid chain')
}
