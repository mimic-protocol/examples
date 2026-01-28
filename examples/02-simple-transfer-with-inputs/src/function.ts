import { BigInt, ERC20Token, Transfer } from '@mimicprotocol/lib-ts'

import { inputs } from './types'

export default function main(): void {
  const token = ERC20Token.fromAddress(inputs.token, inputs.chainId)
  const amount = BigInt.fromStringDecimal(inputs.amount, token.decimals)
  const maxFee = BigInt.fromStringDecimal(inputs.maxFee, token.decimals)
  Transfer.create(token, amount, inputs.recipient, maxFee).send()
}
