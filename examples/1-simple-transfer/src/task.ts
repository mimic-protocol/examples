import { Address, BigInt, Transfer } from '@mimicprotocol/lib-ts'

export default function main(): void {
  const chainId = 10
  const recipient = Address.fromString('0xbcE3248eDE29116e4bD18416dcC2DFca668Eeb84')
  const USDC = Address.fromString('0x7F5c764cBc14f9669B88837ca1490cCa17c31607')
  const amount = BigInt.fromStringDecimal('1', 6)
  const fee = BigInt.fromStringDecimal('0.1', 6)

  Transfer
    .create(chainId, USDC, amount, recipient, fee)
    .send()
}
