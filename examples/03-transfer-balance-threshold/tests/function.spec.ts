import { fp, OpType, randomEvmAddress } from '@mimicprotocol/sdk'
import { Context, EvmCallQueryMock, runFunction, Transfer } from '@mimicprotocol/test-ts'
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
    amount: '1', // 1 token
    recipient: randomEvmAddress(),
    maxFee: '0.1', // 0.1 tokens
    threshold: '10.2', // 10.2 tokens
  }

  const buildCalls = (balance: string): EvmCallQueryMock[] => [
    {
      request: {
        to: inputs.token,
        chainId: inputs.chainId,
        fnSelector: ERC20Interface.getFunction('balanceOf')!.selector,
        params: [{ value: inputs.recipient, abiType: 'address' }],
      },
      response: { value: balance, abiType: 'uint256' },
    },
    {
      request: {
        to: inputs.token,
        chainId: inputs.chainId,
        fnSelector: ERC20Interface.getFunction('decimals')!.selector,
      },
      response: { value: '6', abiType: 'uint8' },
    },
  ]

  describe('when the balance is below the threshold', () => {
    const balance = '9000000' // 9 tokens
    const calls = buildCalls(balance)

    it('produces the expected intents', async () => {
      const result = await runFunction(functionDir, context, { inputs, calls })
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

  describe('when the balance is above the threshold', () => {
    const balance = '11000000' // 11 tokens
    const calls = buildCalls(balance)

    it('does not produce any intent', async () => {
      const result = await runFunction(functionDir, context, { inputs, calls })
      expect(result.success).to.be.true
      expect(result.intents).to.be.empty
    })
  })
})
