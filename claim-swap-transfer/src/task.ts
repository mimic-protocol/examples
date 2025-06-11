import {
  Address,
  BigInt,
  Bytes,
  CallData,
  environment,
  evm,
  EvmEncodeParam,
  ListType,
  Token,
  TokenAmount,
  TokenIn,
  TokenOut,
  TransferData,
  USD,
} from '@mimicprotocol/lib-ts'

import { inputs } from './types'

// call and transfer demo
// CLAIM USDC in Aave, SWAP USDC to aUSDC and TRANSFER aUSDC

export default function main(): void {
  const settler = Address.fromString('0xdcf1d9d12a0488dfb70a8696f44d6d3bc303963d')

  const aUSDC = new Token('0x625E7708f30cA75bfd92586e17077590C60eb4cD', inputs.chainId)
  const USDC = new Token('0x7F5c764cBc14f9669B88837ca1490cCa17c31607', inputs.chainId)
  const USDT = new Token('0x94b008aa00579c1307b0ef2c499ad98a8ce58e58', inputs.chainId)

  const context = environment.getContext()
  const user = Address.fromString(context.user) // TODO: context.user should be an Address

  const userTokens = environment.getRelevantTokens(
    user,
    [inputs.chainId],
    USD.zero(),
    [USDC, aUSDC],
    ListType.AllowList
  )

  const smartAccountTokens = environment.getRelevantTokens(
    inputs.smartAccount,
    [inputs.chainId],
    USD.zero(),
    [aUSDC],
    ListType.AllowList
  )

  // TODO: fix intent.user = smartAccount
  // TODO: this could be improved in getRelevantTokens
  const aUsdcSmartAccount = findTokenAmount(smartAccountTokens, aUSDC)
  const usdcUser = findTokenAmount(userTokens, USDC)
  const aUsdcUser = findTokenAmount(userTokens, aUSDC)

  const feeUsdt = TokenAmount.fromStringDecimal(USDT, inputs.usdFeeAmount)

  if (aUsdcSmartAccount && aUsdcSmartAccount.amount > BigInt.zero()) {
    // Claim aUSDC to user EOA using USDC in smart account
    const target = Address.fromString('0x794a61358d6845594f94dc1db02a252b5b4814ad') // AAVE pool v3
    const encoded = evm.encode([
      EvmEncodeParam.fromValue('address', USDC.address), // underlying
      EvmEncodeParam.fromValue('uint256', aUsdcSmartAccount.amount), // amount
      EvmEncodeParam.fromValue('address', user) // to
    ])
    const bytes = Bytes.fromHexString('0x69328dec' + encoded) // withdraw function selector
    environment.call(
      [new CallData(target, bytes)],
      USDT.address,
      feeUsdt.amount,
      inputs.chainId,
      settler,
      null,
      inputs.smartAccount
    )
  } else if (usdcUser && usdcUser.amount > BigInt.zero()) {
    // Swap USDC for aUSDC in user EOA
    const minAmount = usdcUser.amount.times(BigInt.fromI32(97)).div(BigInt.fromI32(100))
    environment.swap(
      inputs.chainId,
      [new TokenIn(USDC.address, usdcUser.amount)],
      [new TokenOut(aUSDC.address, minAmount, user)],
      inputs.chainId,
      settler
    )
  } else if (aUsdcUser && aUsdcUser.amount > BigInt.zero()) {
    // Transfer aUSDC from user EOA to smart account
    environment.transfer(
      [new TransferData(aUSDC.address, aUsdcUser.amount, inputs.smartAccount)], // TODO: TokenAmount as parameter
      USDT.address,
      feeUsdt.amount,
      inputs.chainId,
      settler
    )
  }
}

function findTokenAmount(tokenAmounts: TokenAmount[], token: Token): TokenAmount | null {
  for (let i = 0; i < tokenAmounts.length; i++) {
    if (tokenAmounts[i].token.address == token.address) return tokenAmounts[i]
  }
  return null
}
