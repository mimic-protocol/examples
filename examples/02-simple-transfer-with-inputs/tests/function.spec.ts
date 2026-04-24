import { fp, OpType, randomEvmAddress } from '@mimicprotocol/sdk'
import { Context, EvmCallQueryMock, runFunction, TransferOperation } from '@mimicprotocol/test-ts'
import { expect } from 'chai'
import { Interface } from 'ethers'

import ERC20Abi from '../abis/ERC20.json'

const ERC20Interface = new Interface(ERC20Abi)

describe('Function', () => {
  const functionDir = './build'

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

  const calls: EvmCallQueryMock[] = [
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
    const result = await runFunction(functionDir, context, { inputs, calls })
    expect(result.success).to.be.true
    expect(result.timestamp).to.be.equal(context.timestamp)

    expect(result.intents).to.have.lengthOf(1)
    const intent = result.intents[0]
    const op = intent.operations[0] as TransferOperation

    expect(op.opType).to.be.equal(OpType.Transfer)
    expect(intent.settler).to.be.equal(context.settlers?.[0].address)
    expect(op.user).to.be.equal(context.user)
    expect(op.chainId).to.be.equal(inputs.chainId)
    expect(intent.maxFees).to.have.lengthOf(1)
    expect(intent.maxFees[0].token).to.be.equal(inputs.token)
    expect(intent.maxFees[0].amount).to.be.equal(fp(inputs.maxFee, 6).toString())

    expect(op.transfers).to.have.lengthOf(1)
    expect(op.transfers[0].token).to.be.equal(inputs.token)
    expect(op.transfers[0].amount).to.be.equal(fp(inputs.amount, 6).toString())
    expect(op.transfers[0].recipient).to.be.equal(inputs.recipient)
  })
})
