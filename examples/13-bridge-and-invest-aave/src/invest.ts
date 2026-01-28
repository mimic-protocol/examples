import {
  Address,
  BigInt,
  ChainId,
  environment,
  ERC20Token,
  evm,
  EvmCallBuilder,
  EvmDecodeParam,
  JSON,
  TokenAmount,
  TriggerType,
} from '@mimicprotocol/lib-ts'

import { inputs } from './types/invest'
import { AavePoolUtils } from './types/invest/AavePool'
import { ERC20Utils } from './types/invest/ERC20'
import { IntentExecutedEvent } from './types/invest/Settler'

export default function main(): void {
  const chainId = inputs.chainId
  const smartAccount = inputs.smartAccount

  const aaveV3Pool = getAaveV3Pool(chainId)

  const trigger = environment.getContext().triggerPayload
  if (trigger.type != TriggerType.EVENT) throw new Error('Trigger not event')

  const triggerData = trigger.getEventData()
  const event = IntentExecutedEvent.decode(triggerData.topics, triggerData.eventData)
  if (event.intent.user != smartAccount) throw new Error('Intent user not smart account')

  // Get the token and the amount from the event emitted by the function that triggered this one
  const tokenStr = evm.decode(new EvmDecodeParam('address', event.data.toHexString()))
  const token = Address.fromString(tokenStr)

  const amountsStr = evm.decode(new EvmDecodeParam('uint256[]', event.output.toHexString()))
  const amounts = JSON.parse<string[]>(amountsStr)
  if (amounts.length == 0) throw new Error('Empty amounts array')
  const amount = BigInt.fromString(amounts[0])

  const feeToken = new ERC20Token(inputs.feeToken, chainId)
  const maxFee = TokenAmount.fromStringDecimal(feeToken, inputs.maxFee)

  const approveData = ERC20Utils.encodeApprove(aaveV3Pool, amount)
  const supplyData = AavePoolUtils.encodeSupply(token, amount, smartAccount, 0)

  // Give approval and deposit the tokens, owned by the smart account
  EvmCallBuilder.forChain(chainId)
    .addCall(token, approveData)
    .addCall(aaveV3Pool, supplyData)
    .addUser(smartAccount)
    .addMaxFee(maxFee)
    .build()
    .send()
}

function getAaveV3Pool(chainId: i32): Address {
  if (chainId == ChainId.ARBITRUM) return Address.fromString('0x794a61358d6845594f94dc1db02a252b5b4814ad')
  if (chainId == ChainId.BASE) return Address.fromString('0xa238dd80c259a72e81d7e4664a9801593f98d1c5')
  if (chainId == ChainId.OPTIMISM) return Address.fromString('0x794a61358d6845594f94dc1db02a252b5b4814ad')
  throw new Error('Invalid chain')
}
