import { DenominationToken, ERC20Token, log, TokenAmount, USD } from '@mimicprotocol/lib-ts'

import { AavePool } from './types/AavePool'
import { AaveToken } from './types/AaveToken'
import { ERC20 } from './types/ERC20'
import { inputs } from './types'

export default function main(): void {
  const aToken = ERC20Token.fromAddress(inputs.aToken, inputs.chainId)
  const aTokenContract = new AaveToken(aToken.address, aToken.chainId)

  const underlyingTokenAddress = aTokenContract.UNDERLYING_ASSET_ADDRESS()
  const underlyingToken = ERC20Token.fromAddress(underlyingTokenAddress, aToken.chainId)

  const aavePool = new AavePool(aTokenContract.POOL(), inputs.chainId)

  const underlyingTokenContract = new ERC20(underlyingToken.address, underlyingToken.chainId)
  const underlyingTokenBalanceAmount = underlyingTokenContract.balanceOf(inputs.smartAccount)
  const underlyingTokenBalance = TokenAmount.fromBigInt(underlyingToken, underlyingTokenBalanceAmount)
  const underlyingTokenBalanceInUsd = underlyingTokenBalance.toUsd()
  const thresholdUsd = USD.fromI32(inputs.thresholdUSD)
  log.info('Underlying balance in USD: ' + underlyingTokenBalanceInUsd.toString())

  if (underlyingTokenBalanceInUsd.lt(thresholdUsd)) {
    log.info('Threshold not met')
    return
  }

  const calls = underlyingTokenContract.approve(aavePool.address, underlyingTokenBalanceAmount)

  calls.addCallsFromBuilder(
    aavePool.supply(underlyingToken.address, underlyingTokenBalance.amount, inputs.smartAccount, 0)
  )

  // Use mimic credits to pay for the transaction fee
  const feeWithCredits = TokenAmount.fromStringDecimal(DenominationToken.USD(), inputs.maxFee)
  calls.addUser(inputs.smartAccount).addMaxFee(feeWithCredits).build().send()
}
