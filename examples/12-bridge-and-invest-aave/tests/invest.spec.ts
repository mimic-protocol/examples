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
import { Call, Context, ContractCallMock, runTask } from '@mimicprotocol/test-ts'
import { expect } from 'chai'
import { AbiCoder, concat } from 'ethers'

describe('Invest', () => {
  const taskDir = './build/invest'

  const chainId = Chains.Optimism
  const aavePool = '0x794a61358d6845594f94dc1db02a252b5b4814ad'
  const USDC = '0x0b2c639c533813f4aa9d7837caf62653d097ff85'
  const decimals = 6
  const amount = fp(10000, decimals) // 10,000 USDC
  const settler = randomEvmAddress()
  const smartAccount = randomEvmAddress()

  const encodedAmounts = AbiCoder.defaultAbiCoder().encode(['uint256[]'], [[amount]])
  const encodedToken = AbiCoder.defaultAbiCoder().encode(['address'], [USDC])
  const trigger = {
    type: TriggerType.Event,
    data: encodeEventExecution({
      blockHash: randomHex(32),
      index: 0,
      topics: [
        randomHex(32), // topic0
        AbiCoder.defaultAbiCoder().encode(['address'], [smartAccount]), // user
        randomHex(32), // topic
        randomHex(32), // op
      ],
      eventData: encodeEventData(smartAccount, encodedAmounts, encodedToken),
    }),
  }

  const context: Context = {
    user: randomEvmAddress(),
    settlers: [{ address: settler, chainId }],
    timestamp: Date.now(),
    trigger,
  }

  const inputs = {
    chainId,
    smartAccount,
    feeToken: '0x94b008aa00579c1307b0ef2c499ad98a8ce58e58', // USDT
    maxFee: '0.5', // 0.5 USDT
  }

  const calls: ContractCallMock[] = [
    {
      request: { to: USDC, chainId, fnSelector: '0x313ce567' }, // `decimals`
      response: { value: decimals.toString(), abiType: 'uint8' },
    },
    {
      request: { to: inputs.feeToken, chainId, fnSelector: '0x313ce567' }, // `decimals`
      response: { value: decimals.toString(), abiType: 'uint8' },
    },
  ]

  it('produces the expected intents', async () => {
    const result = await runTask(taskDir, context, { inputs, calls })
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
    expect(intents[0].maxFees[0].amount).to.be.equal(fp(inputs.maxFee, decimals).toString())

    expect(intents[0].calls).to.have.lengthOf(2)

    const firstCall = intents[0].calls[0]
    expect(firstCall.target).to.be.equal(USDC)
    expect(firstCall.value).to.be.equal('0')

    const approveData = AbiCoder.defaultAbiCoder().encode(['address', 'uint256'], [aavePool, amount])
    expect(firstCall.data).to.be.equal(concat(['0x095ea7b3', approveData])) // approve

    const secondCall = intents[0].calls[1]
    expect(secondCall.target).to.be.equal(aavePool)
    expect(secondCall.value).to.be.equal('0')

    const supplyData = AbiCoder.defaultAbiCoder().encode(
      ['address', 'uint256', 'address', 'uint16'],
      [USDC, amount, smartAccount, 0]
    )
    expect(secondCall.data).to.be.equal(concat(['0x617ba037', supplyData])) // supply
  })
})

export function encodeEventData(user: string, output: string, data: string): string {
  const intent = [
    OpType.Swap, // op
    user, // user
    randomEvmAddress(), // settler
    randomHex(32), // nonce
    '0', // deadline
    '0x', // data
    [], // maxFees
    [], // events
    randomSig(), // configSig
    0, // minValidations
    [], // validations
  ]
  const proposal = [
    '0', // deadline
    '0x', // executorData
    [], // fees
  ]

  return AbiCoder.defaultAbiCoder().encode(
    [
      '(uint8,address,address,bytes32,uint256,bytes,(address,uint256)[],(bytes32,bytes)[],bytes,uint256,bytes[])',
      '(uint256,bytes,uint256[])',
      'bytes',
      'bytes',
    ],
    [intent, proposal, output, data]
  )
}
