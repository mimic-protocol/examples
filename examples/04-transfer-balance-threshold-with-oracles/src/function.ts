import { ERC20Token, log, TokenAmount, TransferBuilder, USD } from '@mimicprotocol/lib-ts'

import { ERC20 } from './types/ERC20'
import { inputs } from './types'

export default function main(): void {
  const tokenContract = new ERC20(inputs.token, inputs.chainId)
  const balance = tokenContract.balanceOf(inputs.recipient).unwrap()

  const token = ERC20Token.fromAddress(inputs.token, inputs.chainId)
  const balanceInUsd = TokenAmount.fromBigInt(token, balance).toUsd().unwrap()
  const thresholdUsd = USD.fromStringDecimal(inputs.thresholdUsd)
  log.info(`Balance in USD: ${balanceInUsd}`)

  if (balanceInUsd.lt(thresholdUsd)) {
    const amount = TokenAmount.fromStringDecimal(token, inputs.amount)
    const maxFee = TokenAmount.fromStringDecimal(token, inputs.maxFee)
    TransferBuilder.forChain(inputs.chainId).addTransferFromTokenAmount(amount, inputs.recipient).build().send(maxFee)
  }
}
