import { DenominationToken, environment, ListType, log, TokenAmount, TransferBuilder, USD } from '@mimicprotocol/lib-ts'

import { inputs } from './types'

export default function main(): void {
  const context = environment.getContext()
  const tokens = environment.getRelevantTokens(context.user, [inputs.chainId], USD.zero(), [], ListType.DenyList)
  const builder = TransferBuilder.forChain(inputs.chainId)

  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i]
    builder.addTransferFromTokenAmount(token, inputs.recipient)
    log.info(`Adding transfer for ${token} on chain ${inputs.chainId}`)
  }

  if (builder.transfers.length == 0) log.info(`No tokens found on chain ${inputs.chainId}`)
  else builder.addMaxFee(TokenAmount.fromStringDecimal(DenominationToken.USD(), inputs.feeAmountUsd)).build().send()
}
