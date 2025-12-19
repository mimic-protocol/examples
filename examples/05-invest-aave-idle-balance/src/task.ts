import { DenominationToken, ERC20Token, log, TokenAmount, USD } from '@mimicprotocol/lib-ts'

import { AavePool } from './types/AavePool'
import { AaveToken } from './types/AaveToken'
import { ERC20 } from './types/ERC20'
import { inputs } from './types'

export default function main(): void {
  const aToken = ERC20Token.fromAddress(inputs.aToken, inputs.chainId)
  const aTokenContract = new AaveToken(aToken.address, aToken.chainId)

  const underlyingTokenAddressResponse = aTokenContract.UNDERLYING_ASSET_ADDRESS()
  if (underlyingTokenAddressResponse.isError) throw new Error(underlyingTokenAddressResponse.error)
  const underlyingTokenAddress = underlyingTokenAddressResponse.value
  const underlyingToken = ERC20Token.fromAddress(underlyingTokenAddress, aToken.chainId)

  const aavePoolAddressResponse = aTokenContract.POOL()
  if (aavePoolAddressResponse.isError) throw new Error(aavePoolAddressResponse.error)
  const aavePoolAddress = aavePoolAddressResponse.value
  const aavePool = new AavePool(aavePoolAddress, inputs.chainId)

  const underlyingTokenContract = new ERC20(underlyingToken.address, underlyingToken.chainId)
  const underlyingTokenBalanceAmountResponse = underlyingTokenContract.balanceOf(inputs.smartAccount)
  if (underlyingTokenBalanceAmountResponse.isError) throw new Error(underlyingTokenBalanceAmountResponse.error)
  const underlyingTokenBalanceAmount = underlyingTokenBalanceAmountResponse.value

  const underlyingTokenBalance = TokenAmount.fromBigInt(underlyingToken, underlyingTokenBalanceAmount)
  const underlyingTokenBalanceInUsdResult = underlyingTokenBalance.toUsd()
  if (underlyingTokenBalanceInUsdResult.isError) throw new Error(underlyingTokenBalanceInUsdResult.error)
  const underlyingTokenBalanceInUsd = underlyingTokenBalanceInUsdResult.value
  const thresholdUsd = USD.fromStringDecimal(inputs.thresholdUsd)
  log.info(`Underlying balance in USD: ${underlyingTokenBalanceInUsd}`)

  if (underlyingTokenBalanceInUsd.lt(thresholdUsd)) {
    log.info('Threshold not met')
    return
  }

  const calls = underlyingTokenContract.approve(aavePool.address, underlyingTokenBalanceAmount)

  calls.addCallsFromBuilder(
    aavePool.supply(underlyingToken.address, underlyingTokenBalance.amount, inputs.smartAccount, 0)
  )

  // Use mimic credits to pay for the transaction fee
  const feeWithCredits = TokenAmount.fromStringDecimal(DenominationToken.USD(), inputs.maxFeeUsd)
  calls.addUser(inputs.smartAccount).addMaxFee(feeWithCredits).build().send()
}
