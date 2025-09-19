import { Address, BigInt, ERC20Token, Transfer } from '@mimicprotocol/lib-ts'

export default function main(): void {
  const USDC = ERC20Token.fromString('0x7F5c764cBc14f9669B88837ca1490cCa17c31607', 10)
  const amount = BigInt.fromStringDecimal('1', 6)
  const recipient = Address.fromString('0xbcE3248eDE29116e4bD18416dcC2DFca668Eeb84')
  const maxFee = BigInt.fromStringDecimal('0.1', 6)

  Transfer.create(USDC, amount, recipient, maxFee).send()
}
