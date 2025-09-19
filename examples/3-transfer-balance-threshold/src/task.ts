import { ERC20Token, Transfer } from '@mimicprotocol/lib-ts'

import { ERC20 } from './types/ERC20'
import { inputs } from './types'

export default function main(): void {
  const tokenContract = new ERC20(inputs.token, inputs.chainId)
  const balance = tokenContract.balanceOf(inputs.recipient)

  if (balance.lt(inputs.threshold)) {
    const token = ERC20Token.fromAddress(inputs.token, inputs.chainId)
    Transfer.create(token, inputs.amount, inputs.recipient, inputs.maxFee).send()
  }
}
