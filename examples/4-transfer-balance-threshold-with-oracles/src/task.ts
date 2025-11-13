import { BigInt, ERC20Token, log, TokenAmount, Transfer, USD } from '@mimicprotocol/lib-ts'

import { ERC20 } from './types/ERC20'
import { inputs } from './types'

export default function main(): void {
  const tokenContract = new ERC20(inputs.token, inputs.chainId)
  const balance = tokenContract.balanceOf(inputs.recipient)

  const token = ERC20Token.fromAddress(inputs.token, inputs.chainId)
  const balanceInUsd = TokenAmount.fromBigInt(token, balance).toUsd()
  const thresholdUsd = USD.fromStringDecimal(inputs.thresholdUsd)
  log.info(`Balance in USD: ${balanceInUsd}`)

  if (balanceInUsd.lt(thresholdUsd)) {
    const amount = BigInt.fromStringDecimal(inputs.amount, token.decimals)
    const maxFee = BigInt.fromStringDecimal(inputs.maxFee, token.decimals)
    Transfer.create(token, amount, inputs.recipient, maxFee).send()
  }
}
