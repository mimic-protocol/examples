import { ERC20Token, log, TokenAmount, TransferBuilder } from '@mimicprotocol/lib-ts'

import { inputs } from './types'

export default function main(): void {
  const token = ERC20Token.fromString(inputs.token, inputs.chainId)
  const tokenAmount = TokenAmount.fromStringDecimal(token, inputs.amount)
  const maxFee = TokenAmount.fromStringDecimal(token, inputs.maxFee)

  TransferBuilder.forChain(inputs.chainId)
    .addTransferFromTokenAmount(tokenAmount, inputs.recipient)
    .build()
    .send(maxFee)
  log.info(`Created transfer intent of ${tokenAmount}`)
}
