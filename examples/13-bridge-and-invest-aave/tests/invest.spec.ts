import {
  Chains,
  encodeEventExecution,
  fp,
  OpType,
  randomEvmAddress,
  randomHex,
  randomSig,
  TriggerType,
} from '@mimicprotocol/sdk'
import { Call, Context, EvmCallQueryMock, Inputs, runFunction } from '@mimicprotocol/test-ts'
import { expect } from 'chai'
import { AbiCoder, Interface } from 'ethers'

import AavePool from '../src/abis/AavePool.json'
import ERC20Abi from '../src/abis/ERC20.json'
import SettlerAbi from '../src/abis/Settler.json'

const AavePoolInterface = new Interface(AavePool)
const ERC20Interface = new Interface(ERC20Abi)
const SettlerInterface = new Interface(SettlerAbi)

describe('Invest', () => {
  const functionDir = './build/invest'

  const chainId = Chains.Optimism
  const aavePool = '0x794a61358d6845594f94dc1db02a252b5b4814ad'
  const USDC = randomEvmAddress()
  const decimals = 6
  const amount = fp(10000, decimals) // 10,000 USDC
  const settler = randomEvmAddress()
  const smartAccount = randomEvmAddress()

  const encodedAmounts = AbiCoder.defaultAbiCoder().encode(['uint256[]'], [[amount]])
  const encodedToken = AbiCoder.defaultAbiCoder().encode(['address'], [USDC])
  const encodedEvent = encodeEvent(smartAccount, encodedAmounts, encodedToken)
  const triggerPayload = {
    type: TriggerType.Event,
    data: encodeEventExecution({
      address: settler,
      chainId,
      blockHash: randomHex(32),
      index: 0,
      topics: encodedEvent.topics,
      eventData: encodedEvent.data,
    }),
  }

  const context: Context = {
    user: randomEvmAddress(),
    settlers: [{ address: settler, chainId }],
    timestamp: Date.now(),
    triggerPayload,
  }

  const inputs = {
    chainId,
    smartAccount,
    feeToken: randomEvmAddress(),
    maxFee: '0.5', // 0.5 feeToken
  }

  const calls: EvmCallQueryMock[] = [
    {
      request: { to: USDC, chainId, fnSelector: ERC20Interface.getFunction('decimals')!.selector },
      response: { value: decimals.toString(), abiType: 'uint8' },
    },
    {
      request: { to: inputs.feeToken, chainId, fnSelector: ERC20Interface.getFunction('decimals')!.selector },
      response: { value: '18', abiType: 'uint8' },
    },
  ]

  const itThrowsAnError = (context: Context, inputs: Inputs, error: string): void => {
    it('throws an error', async () => {
      const result = await runFunction(functionDir, context, { inputs, calls })
      expect(result.success).to.be.false
      expect(result.intents).to.have.lengthOf(0)

      expect(result.logs).to.have.lengthOf(1)
      expect(result.logs[0]).to.include(error)
    })
  }

  describe('when the chain is supported', () => {
    describe('when the trigger is event', () => {
      describe('when the event user is the smart account', () => {
        it('produces the expected intents', async () => {
          const result = await runFunction(functionDir, context, { inputs, calls })
          expect(result.success).to.be.true
          expect(result.timestamp).to.be.equal(context.timestamp)

          const intents = result.intents as Call[]
          expect(intents).to.have.lengthOf(1)

          expect(intents[0].op).to.be.equal(OpType.EvmCall)
          expect(intents[0].settler).to.be.equal(context.settlers?.[0].address)
          expect(intents[0].user).to.be.equal(inputs.smartAccount)
          expect(intents[0].chainId).to.be.equal(inputs.chainId)

          expect(intents[0].maxFees).to.have.lengthOf(1)
          expect(intents[0].maxFees[0].token).to.be.equal(inputs.feeToken)
          expect(intents[0].maxFees[0].amount).to.be.equal(fp(inputs.maxFee).toString())

          expect(intents[0].calls).to.have.lengthOf(2)

          const expectedApproveData = ERC20Interface.encodeFunctionData('approve', [aavePool, amount])
          expect(intents[0].calls[0].target).to.be.equal(USDC)
          expect(intents[0].calls[0].value).to.be.equal('0')
          expect(intents[0].calls[0].data).to.be.equal(expectedApproveData)

          const expectedSupplyData = AavePoolInterface.encodeFunctionData('supply(address,uint256,address,uint16)', [
            USDC,
            amount,
            smartAccount,
            0,
          ])
          expect(intents[0].calls[1].target).to.be.equal(aavePool)
          expect(intents[0].calls[1].value).to.be.equal('0')
          expect(intents[0].calls[1].data).to.be.equal(expectedSupplyData)
        })
      })

      describe('when the event user is not the smart account', () => {
        const inputsOtherSmartAccount = { ...inputs, smartAccount: randomEvmAddress() }

        itThrowsAnError(context, inputsOtherSmartAccount, 'Intent user not smart account')
      })
    })

    describe('when the triggerPayload is not event', () => {
      const cronContext = { ...context, triggerPayload: { ...triggerPayload, type: TriggerType.Cron } }

      itThrowsAnError(cronContext, inputs, 'Trigger not event')
    })
  })

  describe('when the chain is not supported', () => {
    const inputsUnsupportedChain = { ...inputs, chainId: Chains.Mainnet }

    itThrowsAnError(context, inputsUnsupportedChain, 'Invalid chain')
  })
})

export function encodeEvent(user: string, output: string, data: string): { topics: string[]; data: string } {
  const topic = randomHex(32)
  const op = OpType.Swap
  const intent = [
    op,
    user,
    randomEvmAddress(), // settler
    randomHex(32), // nonce
    '0', // deadline
    '0x', // data
    [], // maxFees
    [], // events
    randomSig(), // triggerSig
    0, // minValidations
    [], // validations
  ]
  const proposal = [
    '0', // deadline
    '0x', // executorData
    [], // fees
  ]

  return SettlerInterface.encodeEventLog('IntentExecuted', [user, topic, op, intent, proposal, output, data])
}
