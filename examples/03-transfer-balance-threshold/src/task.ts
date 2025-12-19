import { BigInt, ERC20Token, Transfer } from '@mimicprotocol/lib-ts'

import { ERC20 } from './types/ERC20'
import { inputs } from './types'

export default function main(): void {
  const tokenContract = new ERC20(inputs.token, inputs.chainId)
  const balanceResult = tokenContract.balanceOf(inputs.recipient)
  if (balanceResult.isError) throw new Error(balanceResult.error)
  const balance = balanceResult.value

  const token = ERC20Token.fromAddress(inputs.token, inputs.chainId)
  const threshold = BigInt.fromStringDecimal(inputs.threshold, token.decimals)

  if (balance.lt(threshold)) {
    const amount = BigInt.fromStringDecimal(inputs.amount, token.decimals)
    const maxFee = BigInt.fromStringDecimal(inputs.maxFee, token.decimals)
    Transfer.create(token, amount, inputs.recipient, maxFee).send()
  }
}
