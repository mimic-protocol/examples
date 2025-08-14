import { ERC20Token, log, TokenAmount, Transfer, USD } from '@mimicprotocol/lib-ts'

import { ERC20 } from './types/ERC20'
import { inputs } from './types'

export default function main(): void {
  const tokenContract = new ERC20(inputs.token, inputs.chainId)
  const balance = tokenContract.balanceOf(inputs.recipient)

  const token = ERC20Token.fromAddress(inputs.token, inputs.chainId)
  const balanceInUsd = TokenAmount.fromBigInt(token, balance).toUsd()
  const thresholdUsd = USD.fromI32(inputs.thresholdUSD)
  log.info('Balance in USD: ' + balanceInUsd.toString())

  if (balanceInUsd.lt(thresholdUsd)) {
    Transfer.create(inputs.chainId, inputs.token, inputs.amount, inputs.recipient, inputs.fee).send()
  }
}
