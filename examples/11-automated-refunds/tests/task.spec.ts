import { Chains, fp, OpType } from '@mimicprotocol/sdk'
import { Context, ContractCallMock, runTask, Transfer } from '@mimicprotocol/test-ts'
import { expect } from 'chai'

describe('Task', () => {
  const taskDir = './build'

  const chainId = Chains.Arbitrum

  const context: Context = {
    user: '0x756f45e3fa69347a9a973a725e3c98bc4db0b5a0',
    settlers: [{ address: '0x609d831c0068844e11ef85a273c7f356212fd6d1', chainId }],
    timestamp: Date.now(),
  }

  const inputs = {
    chainId,
    token: '0x833589fcd6edb6e08f4c7c32d4f71b54bda02913', // USDC
    amount: '100', // 100 USDC
    maxFee: '0.3', // 0.3 USDC
    recipient: '0xe35e9842fceaca96570b734083f4a58e8f7c5f2a',
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
