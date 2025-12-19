import { Address, BigInt, environment, ERC20Token, Swap } from '@mimicprotocol/lib-ts'
import { JSON } from 'json-as/assembly'

import { ERC20 } from './types/ERC20'
import { inputs } from './types'

@json
class UniswapPool {
  constructor(
    public token0Price: string,
    public token1Price: string
  ) {}
}

@json
class UniswapPoolsData {
  constructor(public pools: UniswapPool[]) {}
}

const PRICE_PRECISION: u8 = 40
const BPS_DENOMINATOR = BigInt.fromI32(10_000)

export default function main(): void {
  if (inputs.tokenIn == inputs.tokenOut) throw new Error('Token in and out must be different')
  if (BigInt.fromI32(inputs.slippageBps as i32) > BPS_DENOMINATOR) throw new Error('Slippage must be between 0 and 100')

  const me = environment.getContext().user
  const amountInResult = new ERC20(inputs.tokenIn, inputs.chainId).balanceOf(me)
  if (amountInResult.isError) throw new Error(amountInResult.error)
  const amountIn = amountInResult.value
  if (amountIn.isZero()) throw new Error('No amount in to swap')

  const price = getTokenPrice(inputs.chainId, inputs.subgraphId, inputs.tokenIn, inputs.tokenOut)
  const tokenIn = ERC20Token.fromAddress(inputs.tokenIn, inputs.chainId)
  const tokenOut = ERC20Token.fromAddress(inputs.tokenOut, inputs.chainId)
  const expectedOut = amountIn
    .times(price)
    .upscale(tokenOut.decimals)
    .downscale(tokenIn.decimals + PRICE_PRECISION)
  const slippageFactor = BPS_DENOMINATOR.minus(BigInt.fromI32(inputs.slippageBps as i32))
  const minAmountOut = expectedOut.times(slippageFactor).div(BPS_DENOMINATOR)
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

  const query = `{pools(where: { token0: "${token0}", token1: "${token1}" }) {token0Price  token1Price}}`
  const queryResult = environment.subgraphQuery(chainId, subgraphId, query, null)
  if (queryResult.isError) throw new Error(queryResult.error)
  const data = JSON.parse<UniswapPoolsData>(queryResult.value.data)

  if (tokenIn == token0 && tokenOut === token1) {
    return BigInt.fromStringDecimal(data.pools[0].token1Price, PRICE_PRECISION)
  } else {
    return BigInt.fromStringDecimal(data.pools[0].token0Price, PRICE_PRECISION)
  }
}
