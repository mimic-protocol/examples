import { Transfer } from '@mimicprotocol/lib-ts'

import { inputs } from './types'

export default function main(): void {
  Transfer.create(inputs.chainId, inputs.token, inputs.amount, inputs.recipient, inputs.fee).send()
}
