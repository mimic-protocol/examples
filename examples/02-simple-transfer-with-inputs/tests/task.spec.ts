import { fp, OpType, randomEvmAddress } from '@mimicprotocol/sdk'
import { Context, ContractCallMock, runTask, Transfer } from '@mimicprotocol/test-ts'
import { expect } from 'chai'
import { Interface } from 'ethers'

import ERC20Abi from '../abis/ERC20.json'

const ERC20Interface = new Interface(ERC20Abi)

describe('Task', () => {
  const taskDir = './build'

  const context: Context = {
    user: randomEvmAddress(),
    settlers: [{ address: randomEvmAddress(), chainId: 10 }],
    timestamp: Date.now(),
  }

  const inputs = {
    chainId: 10, // Optimism
    token: randomEvmAddress(),
    amount: '1.5', // 1.5 tokens
    recipient: randomEvmAddress(),
    maxFee: '0.1', // 0.1 tokens
  }

  const calls: ContractCallMock[] = [
    {
      request: {
        to: inputs.token,
        chainId: inputs.chainId,
        fnSelector: ERC20Interface.getFunction('decimals')!.selector,
      },
      response: { value: '6', abiType: 'uint8' },
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
    expect(intents[0].chainId).to.be.equal(inputs.chainId)
    expect(intents[0].maxFees).to.have.lengthOf(1)
    expect(intents[0].maxFees[0].token).to.be.equal(inputs.token)
    expect(intents[0].maxFees[0].amount).to.be.equal(fp(inputs.maxFee, 6).toString())

    expect(intents[0].transfers).to.have.lengthOf(1)
    expect(intents[0].transfers[0].token).to.be.equal(inputs.token)
    expect(intents[0].transfers[0].amount).to.be.equal(fp(inputs.amount, 6).toString())
    expect(intents[0].transfers[0].recipient).to.be.equal(inputs.recipient)
  })
})
