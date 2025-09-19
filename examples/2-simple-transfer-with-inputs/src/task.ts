import { ERC20Token, Transfer } from '@mimicprotocol/lib-ts'

import { inputs } from './types'

export default function main(): void {
  const token = ERC20Token.fromAddress(inputs.token, inputs.chainId)
  Transfer.create(token, inputs.amount, inputs.recipient, inputs.maxFee).send()
}
