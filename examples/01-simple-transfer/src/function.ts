import { Address, ChainId, Optimism, TokenAmount, TransferBuilder } from '@mimicprotocol/lib-ts'

export default function main(): void {
  const recipient = Address.fromString('0xbcE3248eDE29116e4bD18416dcC2DFca668Eeb84')
  const maxFee = TokenAmount.fromStringDecimal(Optimism.USDC, '1')
  const transfer = TransferBuilder.forChain(ChainId.OPTIMISM)
    .addTransferFromStringDecimal(Optimism.USDC, '1', recipient)
    .build()
  transfer.send(maxFee)
}
