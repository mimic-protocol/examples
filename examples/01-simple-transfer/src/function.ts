import { Address, ChainId, Optimism, TokenAmount, TransferBuilder } from '@mimicprotocol/lib-ts'

export default function main(): void {
  const chainId = ChainId.OPTIMISM
  const recipient = Address.fromString('0xbcE3248eDE29116e4bD18416dcC2DFca668Eeb84')
  const maxFee = TokenAmount.fromStringDecimal(Optimism.USDC, '1')
  TransferBuilder.forChain(chainId).addTransferFromStringDecimal(Optimism.USDC, '1', recipient).build().send(maxFee)
}
