import { NATIVE_TOKEN_ADDRESS, OpType, randomEvmAddress } from '@mimicprotocol/sdk'
import { ContractCallMock, GetRelevantTokensMock, runTask, Transfer } from '@mimicprotocol/test-ts'
import { expect } from 'chai'

describe('Task', () => {
  const taskDir = './build'

  const chainId = 1
  const USDC = randomEvmAddress()

  const context = {
    user: randomEvmAddress(),
    settlers: [{ address: randomEvmAddress(), chainId }],
    timestamp: 1438223173000,
  }

  const inputs = {
    chainId,
    maxFeeUsd: '0.1',
    recipient: randomEvmAddress(),
  }

  const calls: ContractCallMock[] = [
    {
      request: { chainId, to: USDC, fnSelector: '0x313ce567' },
      response: { value: '6', abiType: 'uint8' },
    },
    {
      request: { chainId, to: USDC, fnSelector: '0x95d89b41' },
      response: { value: 'USDC', abiType: 'string' },
    },
  ]

  describe('when the user has some balance for the requested tokens', () => {
    const relevantTokens: GetRelevantTokensMock[] = [
      {
        request: {
          owner: context.user,
          chainIds: [chainId],
          usdMinAmount: '0',
          tokenFilter: 1,
          tokens: [],
        },
        response: [
          {
            timestamp: Date.now(),
            balances: [
              { token: { address: USDC, chainId }, balance: '10' },
              { token: { address: NATIVE_TOKEN_ADDRESS, chainId }, balance: '100' },
            ],
          },
        ],
      },
    ]

    it('produces the expected intents for multiple tokens', async () => {
      const result = await runTask(taskDir, context, { inputs, calls, relevantTokens })
      expect(result.success).to.be.true
      expect(result.timestamp).to.be.equal(context.timestamp)

      const intents = result.intents as Transfer[]
      expect(intents).to.have.lengthOf(1)

      expect(intents[0].op).to.be.equal(OpType.Transfer)
      expect(intents[0].chainId).to.equal(chainId)
      expect(intents[0].maxFees.length).to.equal(1)
      expect(intents[0].maxFees[0].token).to.equal('0x0000000000000000000000000000000000000348')
      expect(intents[0].maxFees[0].amount).to.equal('100000000000000000')
      expect(intents[0].user).to.equal(context.user)
      expect(intents[0].transfers).to.have.lengthOf(2)

      const firstTransfer = intents[0].transfers[0]
      expect(firstTransfer.token).to.equal(USDC)
      expect(firstTransfer.amount).to.equal('10')
      expect(firstTransfer.recipient).to.be.equal(inputs.recipient)

      const secondTransfer = intents[0].transfers[1]
      expect(secondTransfer.token).to.equal(NATIVE_TOKEN_ADDRESS.toLowerCase())
      expect(secondTransfer.amount).to.equal('100')
      expect(secondTransfer.recipient).to.be.equal(inputs.recipient)
    })
  })

  describe('when the user does not have balance for the requested tokens', () => {
    const relevantTokens: GetRelevantTokensMock[] = [
      {
        request: {
          owner: context.user,
          chainIds: [chainId],
          usdMinAmount: '0',
          tokenFilter: 1,
          tokens: [],
        },
        response: [
          {
            timestamp: Date.now(),
            balances: [],
          },
        ],
      },
    ]

    it('does not produce any intents', async () => {
      const result = await runTask(taskDir, context, { inputs, calls, relevantTokens })
      expect(result.success).to.be.true
      expect(result.timestamp).to.be.equal(context.timestamp)
      expect(result.intents).to.be.empty
    })
  })
})
