import { Address, BigInt, environment, ERC20Token, Swap } from '@mimicprotocol/lib-ts'
import { JSON } from 'json-as/assembly'

import { ERC20 } from './types/ERC20'
import { inputs } from './types'

@json
class UniswapPair {
  constructor(
    public token0Price: string,
    public token1Price: string
  ) {}
}

@json
class UniswapPairsData {
  constructor(public pairs: UniswapPair[]) {}
}

const PRICE_PRECISION: u8 = 40

export default function main(): void {
  if (inputs.slippage > 100) throw new Error('Slippage must be between 0 and 100')
  if (inputs.tokenIn == inputs.tokenOut) throw new Error('Token in and out must be different')

  const me = environment.getContext().user
  const amountIn = new ERC20(inputs.tokenIn, inputs.chainId).balanceOf(me)
  if (amountIn.isZero()) throw new Error('No amount in to swap')

  const price = getTokenPrice(inputs.chainId, inputs.subgraphId, inputs.tokenIn, inputs.tokenOut)
  const tokenIn = ERC20Token.fromAddress(inputs.tokenIn, inputs.chainId)
  const tokenOut = ERC20Token.fromAddress(inputs.tokenOut, inputs.chainId)
  const expectedOut = amountIn
    .times(price)
    .upscale(tokenOut.decimals)
    .downscale(tokenIn.decimals + PRICE_PRECISION)
  const slippagePct = BigInt.fromI32(100).minus(BigInt.fromI32(inputs.slippage))
  const minAmountOut = expectedOut.times(slippagePct).div(BigInt.fromI32(100))

  Swap.create(inputs.chainId, tokenIn, amountIn, tokenOut, minAmountOut).send()
}

function getTokenPrice(chainId: i32, subgraphId: string, tokenIn: Address, tokenOut: Address): BigInt {
  let token0: Address
  let token1: Address
  if (tokenIn.toString() < tokenOut.toString()) {
    token0 = tokenIn
    token1 = tokenOut
  } else {
    token0 = tokenOut
    token1 = tokenIn
  }

  const query = `
  {
    pair(where: { token0: "${token0.toString()}", token1: "${token1.toString()}" }) {
      token0Price   # token0 per token1
      token1Price   # token1 per token0
    }
  }`

  const response = environment.subgraphQuery(chainId, subgraphId, query, null)
  const data = JSON.parse<UniswapPairsData>(response.data)

  if (tokenIn == token0 && tokenOut === token1) {
    return BigInt.fromStringDecimal(data.pairs[0].token1Price, PRICE_PRECISION)
  } else {
    return BigInt.fromStringDecimal(data.pairs[0].token0Price, PRICE_PRECISION)
  }
}
