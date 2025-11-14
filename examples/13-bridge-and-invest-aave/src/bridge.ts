import {
  Arbitrum,
  Base,
  Bytes,
  ChainId,
  ERC20Token,
  evm,
  EvmEncodeParam,
  Optimism,
  SwapBuilder,
  Token,
  TokenAmount,
} from '@mimicprotocol/lib-ts'

import { inputs } from './types/bridge'

export default function main(): void {
  const sourceChain = inputs.sourceChain
  const destinationChain = inputs.destinationChain
  if (sourceChain == destinationChain) throw new Error('Single-chain swap not supported')

  const tokenIn = getUsdc(sourceChain)
  const tokenAmountIn = TokenAmount.fromStringDecimal(tokenIn, inputs.amount)

  const tokenOut = getUsdc(destinationChain)
  const tokenAmountOut = TokenAmount.fromStringDecimal(tokenOut, inputs.minAmountOut)

  const feeToken = new ERC20Token(inputs.feeToken, inputs.destinationChain)
  const maxFee = TokenAmount.fromStringDecimal(feeToken, inputs.maxFee)

  // Set topic hash and encode tokenOut address as extra data
  const topic = evm.keccak('Bridged USDC')
  const data = evm.encode([EvmEncodeParam.fromValue('address', tokenAmountOut.token.address)])

  // Bridge tokens owned by the smart account
  SwapBuilder.forChains(sourceChain, destinationChain)
    .addTokenInFromTokenAmount(tokenAmountIn)
    .addTokenOutFromTokenAmount(tokenAmountOut, inputs.smartAccount)
    .addUser(inputs.smartAccount)
    .addMaxFee(maxFee)
    // Settler smart contract will emit an IntentExecuted event in which `topic2 = keccak256('Bridged USDC')`
    .addEvent(Bytes.fromHexString(topic), Bytes.fromHexString(data)) // Optional
    .build()
    .send()
}

function getUsdc(chainId: i32): Token {
  if (chainId == ChainId.ARBITRUM) return Arbitrum.USDC
  if (chainId == ChainId.BASE) return Base.USDC
  if (chainId == ChainId.OPTIMISM) return Optimism.USDC
  throw new Error('Invalid chain')
}
