import {
  Address,
  BigInt,
  environment,
  ERC20Token,
  ListType,
  Optimism,
  SwapBuilder,
  TokenAmount,
  TokenIn,
  TokenOut,
  TransferBuilder,
  TransferData,
  USD,
} from '@mimicprotocol/lib-ts'

import { AavePool } from './types/AavePool'
import { inputs } from './types'

// CLAIM USDC in Aave, SWAP USDC to aUSDC and TRANSFER aUSDC
// You will have to give allowance to the settler from the EOA that you are signing for all three tokens
export default function main(): void {
  const chainId = Optimism.CHAIN_ID
  const aUSDC = ERC20Token.fromString('0x625E7708f30cA75bfd92586e17077590C60eb4cD', chainId)
  const USDC = ERC20Token.fromString('0x7F5c764cBc14f9669B88837ca1490cCa17c31607', chainId)
  const USDT = ERC20Token.fromString('0x94b008aa00579c1307b0ef2c499ad98a8ce58e58', chainId)
  const aaveV3Pool = new AavePool(Address.fromString('0x794a61358d6845594f94dc1db02a252b5b4814ad'), chainId)

  const context = environment.getContext()

  const userTokens = environment.getRelevantTokens(
    context.user,
    [chainId],
    USD.zero(),
    [USDC, aUSDC],
    ListType.AllowList
  )

  const smartAccountTokens = environment.getRelevantTokens(
    inputs.smartAccount,
    [chainId],
    USD.zero(),
    [aUSDC],
    ListType.AllowList
  )
  const aUsdcSmartAccount = findTokenAmount(smartAccountTokens, aUSDC)
  const usdcUser = findTokenAmount(userTokens, USDC)
  const aUsdcUser = findTokenAmount(userTokens, aUSDC)

  const feeUsdt = TokenAmount.fromStringDecimal(USDT, inputs.usdFeeAmount)

  if (aUsdcSmartAccount && aUsdcSmartAccount.amount > BigInt.zero()) {
    // Claim aUSDC to user EOA using USDC in smart account
    aaveV3Pool
      .withdraw(USDC.address, aUsdcSmartAccount.amount, context.user)
      .addMaxFee(feeUsdt)
      .addUser(inputs.smartAccount)
      .build()
      .send()
  }

  if (usdcUser && usdcUser.amount > BigInt.zero()) {
    // Swap USDC for aUSDC in user EOA
    const minAmount = usdcUser.amount.times(BigInt.fromI32(97)).div(BigInt.fromI32(100))
    SwapBuilder.forChain(chainId)
      .addTokenIn(new TokenIn(USDC.address, usdcUser.amount))
      .addTokenOut(new TokenOut(aUSDC.address, minAmount, context.user))
      .build()
      .send()
  }

  if (aUsdcUser && aUsdcUser.amount > BigInt.zero()) {
    // Transfer aUSDC from user EOA to smart account
    TransferBuilder.forChain(chainId)
      .addTransfer(new TransferData(aUSDC.address, aUsdcUser.amount, inputs.smartAccount))
      .addMaxFee(feeUsdt)
      .build()
      .send()
  }
}

function findTokenAmount(tokenAmounts: TokenAmount[], token: ERC20Token): TokenAmount | null {
  for (let i = 0; i < tokenAmounts.length; i++) {
    if (tokenAmounts[i].token.address == token.address) return tokenAmounts[i]
  }
  return null
}
