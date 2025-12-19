import { Address, BigInt, environment, ERC20Token, log, Swap, TokenAmount, USD } from '@mimicprotocol/lib-ts'

import { ERC20 } from './types/ERC20'
import { inputs } from './types'

const BPS_DENOMINATOR = BigInt.fromI32(10_000)

function usdMin(left: USD, right: USD): USD {
  return left.lt(right) ? left : right
}

function shareByBps(amountUSD: USD, bps: i32): USD {
  const numerator = amountUSD.times(BigInt.fromI32(bps))
  return numerator.div(BPS_DENOMINATOR)
}

function getTokenAmount(chainId: u32, tokenAddress: Address): TokenAmount {
  const me = environment.getContext().user
  const contract = new ERC20(tokenAddress, chainId)
  const balanceResponse = contract.balanceOf(me)
  if (balanceResponse.isError) throw new Error(balanceResponse.error)
  const balance = balanceResponse.value
  const token = ERC20Token.fromAddress(tokenAddress, chainId)
  return TokenAmount.fromBigInt(token, balance)
}

class Bucket {
  constructor(
    public index: i32,
    public amountUSD: USD
  ) {}
}

export default function main(): void {
  const tokenAddresses = [inputs.tokenA, inputs.tokenB, inputs.tokenC]
  const targetBps = [inputs.targetBpsA as i32, inputs.targetBpsB as i32, inputs.targetBpsC as i32]

  const totalTargetBps = targetBps[0] + targetBps[1] + targetBps[2]
  if (BigInt.fromI32(totalTargetBps) != BPS_DENOMINATOR) throw new Error('Targets BPS must sum to 10000')

  const tokensMetadata = [
    ERC20Token.fromAddress(tokenAddresses[0], inputs.chainId),
    ERC20Token.fromAddress(tokenAddresses[1], inputs.chainId),
    ERC20Token.fromAddress(tokenAddresses[2], inputs.chainId),
  ]

  const tokenAmounts = [
    getTokenAmount(inputs.chainId, tokenAddresses[0]),
    getTokenAmount(inputs.chainId, tokenAddresses[1]),
    getTokenAmount(inputs.chainId, tokenAddresses[2]),
  ]

  const currentBalancesUsd = [
    tokenAmounts[0].toUsd().value,
    tokenAmounts[1].toUsd().value,
    tokenAmounts[2].toUsd().value,
  ]
  const totalPortfolioUSD = currentBalancesUsd[0].plus(currentBalancesUsd[1]).plus(currentBalancesUsd[2])
  if (totalPortfolioUSD.le(USD.zero())) {
    log.info('No rebalance needed (total USD is zero)')
    return
  }

  const desiredBalancesUsd = [
    shareByBps(totalPortfolioUSD, targetBps[0]),
    shareByBps(totalPortfolioUSD, targetBps[1]),
    shareByBps(totalPortfolioUSD, targetBps[2]),
  ]

  const surpluses = new Array<Bucket>()
  const deficits = new Array<Bucket>()
  for (let i: i32 = 0; i < 3; i++) {
    if (currentBalancesUsd[i].gt(desiredBalancesUsd[i])) {
      surpluses.push(new Bucket(i, currentBalancesUsd[i].minus(desiredBalancesUsd[i])))
    } else if (desiredBalancesUsd[i].gt(currentBalancesUsd[i])) {
      deficits.push(new Bucket(i, desiredBalancesUsd[i].minus(currentBalancesUsd[i])))
    }
  }

  if (surpluses.length == 0 || deficits.length == 0) {
    log.info('No rebalance needed (target ratios matched)')
    return
  }

  let surplusIndex: i32 = 0
  let deficitIndex: i32 = 0
  while (surplusIndex < surpluses.length && deficitIndex < deficits.length) {
    const movedUSD = usdMin(surpluses[surplusIndex].amountUSD, deficits[deficitIndex].amountUSD)

    const surplusTokenIndex = surpluses[surplusIndex].index
    const deficitTokenIndex = deficits[deficitIndex].index

    const tokenInAmountResult = movedUSD.toTokenAmount(tokensMetadata[surplusTokenIndex])
    if (tokenInAmountResult.isError) throw new Error(tokenInAmountResult.error)
    const tokenInAmount = tokenInAmountResult.value
    const expectedTokenOutAmounResult = movedUSD.toTokenAmount(tokensMetadata[deficitTokenIndex])
    if (expectedTokenOutAmounResult.isError) throw new Error(expectedTokenOutAmounResult.error)
    const expectedTokenOutAmount = expectedTokenOutAmounResult.value

    const slippageFactor = BPS_DENOMINATOR.minus(BigInt.fromI32(inputs.slippageBps as i32))
    const minAmountOut = expectedTokenOutAmount.amount.times(slippageFactor).div(BPS_DENOMINATOR)

    Swap.create(
      inputs.chainId,
      tokensMetadata[surplusTokenIndex],
      tokenInAmount.amount,
      tokensMetadata[deficitTokenIndex],
      minAmountOut
    ).send()

    surpluses[surplusIndex].amountUSD = surpluses[surplusIndex].amountUSD.minus(movedUSD)
    deficits[deficitIndex].amountUSD = deficits[deficitIndex].amountUSD.minus(movedUSD)

    if (surpluses[surplusIndex].amountUSD.le(USD.zero())) surplusIndex++
    if (deficits[deficitIndex].amountUSD.le(USD.zero())) deficitIndex++
  }

  log.info('Rebalance executed')
}
