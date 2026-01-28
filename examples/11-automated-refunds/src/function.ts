import { BigInt, ERC20Token, log, TokenAmount, Transfer } from '@mimicprotocol/lib-ts'

import { inputs } from './types'

export default function main(): void {
  const token = ERC20Token.fromString(inputs.token, inputs.chainId)
  const tokenAmount = TokenAmount.fromStringDecimal(token, inputs.amount)
  const maxFee = BigInt.fromStringDecimal(inputs.maxFee, token.decimals)

  Transfer.create(token, tokenAmount.amount, inputs.recipient, maxFee).send()
  log.info(`Created transfer intent of ${tokenAmount}`)
}
