import { ERC20Token, TokenAmount, TransferBuilder } from '@mimicprotocol/lib-ts'

import { inputs } from './types'

export default function main(): void {
  const token = ERC20Token.fromAddress(inputs.token, inputs.chainId)
  const amount = TokenAmount.fromStringDecimal(token, inputs.amount)
  const maxFee = TokenAmount.fromStringDecimal(token, inputs.maxFee)
  TransferBuilder.forChain(inputs.chainId).addTransferFromTokenAmount(amount, inputs.recipient).build().send(maxFee)
}
