import {
  Arbitrum,
  Base,
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

export default function main(): void {
  const chainId = inputs.chainId
  const context = environment.getContext()

  // Find tokens with user's balance > 0
  const amountsIn = environment.relevantTokensQuery(context.user, [chainId], USD.zero(), [], ListType.DenyList).unwrap()
  if (amountsIn.length == 0) {
    log.info(`No tokens found on chain ${chainId}`)
    return
  }

  const USDC = getUsdc(chainId)

  for (let i = 0; i < amountsIn.length; i++) {
    const amountIn = amountsIn[i]
    const amountOut = amountIn.toTokenAmount(USDC).unwrap()
    const minAmountOut = amountOut.applySlippageBps(inputs.slippageBps as i32)

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
