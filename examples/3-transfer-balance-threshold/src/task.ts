import { Address, Transfer } from '@mimicprotocol/lib-ts'

import { inputs } from './types'
import { ERC20 } from './types/ERC20'

export default function main(): void {
  const tokenContract = new ERC20(inputs.token, inputs.chainId)
  const balance = tokenContract.balanceOf(inputs.recipient)

  if (balance.lt(inputs.threshold)) {
    Transfer
      .create(inputs.chainId, inputs.token, inputs.amount, inputs.recipient, inputs.fee)
      .send()
  }
}
