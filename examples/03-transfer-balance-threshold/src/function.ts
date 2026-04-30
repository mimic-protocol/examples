import { BigInt, ERC20Token, TokenAmount, TransferBuilder } from '@mimicprotocol/lib-ts'

import { ERC20 } from './types/ERC20'
import { inputs } from './types'

export default function main(): void {
  const tokenContract = new ERC20(inputs.token, inputs.chainId)
  const balance = tokenContract.balanceOf(inputs.recipient).unwrap()
  const token = ERC20Token.fromAddress(inputs.token, inputs.chainId)
  const threshold = BigInt.fromStringDecimal(inputs.threshold, token.decimals)

  if (balance.lt(threshold)) {
    const amount = TokenAmount.fromStringDecimal(token, inputs.amount)
    const maxFee = TokenAmount.fromStringDecimal(token, inputs.maxFee)
    TransferBuilder.forChain(inputs.chainId).addTransferFromTokenAmount(amount, inputs.recipient).build().send(maxFee)
  }
}
