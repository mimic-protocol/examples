import { Chains, fp, OpType, randomEvmAddress } from '@mimicprotocol/sdk'
import { Context, ContractCallMock, runTask, Transfer } from '@mimicprotocol/test-ts'
import { expect } from 'chai'

describe('Task', () => {
  const taskDir = './build'

  const chainId = Chains.Arbitrum

  const context: Context = {
    user: randomEvmAddress(),
    settlers: [{ address: randomEvmAddress(), chainId }],
    timestamp: Date.now(),
  }

  const inputs = {
    chainId,
    token: randomEvmAddress(),
    amount: '100', // 100 tokens
    maxFee: '0.3', // 0.3 tokens
    recipient: randomEvmAddress(),
  }

  const calls: ContractCallMock[] = [
    {
      request: { to: inputs.token, chainId, fnSelector: '0x313ce567' }, // `decimals`
      response: { value: '6', abiType: 'uint8' },
    },
    {
      request: { to: inputs.token, chainId, fnSelector: '0x95d89b41' }, // `symbol`
      response: { value: 'USDC', abiType: 'string' },
    },
  ]

  it('produces the expected intents', async () => {
    const result = await runTask(taskDir, context, { inputs, calls })
    expect(result.success).to.be.true
    expect(result.timestamp).to.be.equal(context.timestamp)

    const intents = result.intents as Transfer[]
    expect(intents).to.have.lengthOf(1)

    expect(intents[0].op).to.be.equal(OpType.Transfer)
    expect(intents[0].settler).to.be.equal(context.settlers?.[0].address)
    expect(intents[0].user).to.be.equal(context.user)
    expect(intents[0].chainId).to.be.equal(chainId)
    expect(intents[0].maxFees).to.have.lengthOf(1)
    expect(intents[0].maxFees[0].token).to.be.equal(inputs.token)
    expect(intents[0].maxFees[0].amount).to.be.equal(fp(inputs.maxFee, 6).toString())

    expect(intents[0].transfers).to.have.lengthOf(1)
    expect(intents[0].transfers[0].token).to.be.equal(inputs.token)
    expect(intents[0].transfers[0].amount).to.be.equal(fp(inputs.amount, 6).toString())
    expect(intents[0].transfers[0].recipient).to.be.equal(inputs.recipient)

    expect(result.logs).to.have.lengthOf(1)
    expect(result.logs[0]).to.be.equal(`[Info] Created transfer intent of ${inputs.amount} USDC`)
  })
})
