import { NATIVE_TOKEN_ADDRESS, OpType, randomEvmAddress } from '@mimicprotocol/sdk'
import { EvmCallQueryMock, RelevantTokensQueryMock, runFunction, TransferOperation } from '@mimicprotocol/test-ts'
import { expect } from 'chai'
import { Interface } from 'ethers'

import ERC20Abi from '../abis/ERC20.json'

const ERC20Interface = new Interface(ERC20Abi)

describe('Function', () => {
  const functionDir = './build'

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

  const calls: EvmCallQueryMock[] = [
    {
      request: { chainId, to: USDC, fnSelector: ERC20Interface.getFunction('decimals')!.selector },
      response: { value: '6', abiType: 'uint8' },
    },
    {
      request: { chainId, to: USDC, fnSelector: ERC20Interface.getFunction('symbol')!.selector },
      response: { value: 'USDC', abiType: 'string' },
    },
  ]

  describe('when the user has some balance for the requested tokens', () => {
    const relevantTokens: RelevantTokensQueryMock[] = [
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
      const result = await runFunction(functionDir, context, { inputs, calls, relevantTokens })
      expect(result.success).to.be.true
      expect(result.timestamp).to.be.equal(context.timestamp)

      expect(result.intents).to.have.lengthOf(1)
      const intent = result.intents[0]
      const op = intent.operations[0] as TransferOperation

      expect(op.opType).to.be.equal(OpType.Transfer)
      expect(op.chainId).to.equal(chainId)
      expect(intent.maxFees.length).to.equal(1)
      expect(intent.maxFees[0].token).to.equal('0x0000000000000000000000000000000000000348')
      expect(intent.maxFees[0].amount).to.equal('100000000000000000')
      expect(op.user).to.equal(context.user)
      expect(op.transfers).to.have.lengthOf(2)

      const firstTransfer = op.transfers[0]
      expect(firstTransfer.token).to.equal(USDC)
      expect(firstTransfer.amount).to.equal('10')
      expect(firstTransfer.recipient).to.be.equal(inputs.recipient)

      const secondTransfer = op.transfers[1]
      expect(secondTransfer.token).to.equal(NATIVE_TOKEN_ADDRESS.toLowerCase())
      expect(secondTransfer.amount).to.equal('100')
      expect(secondTransfer.recipient).to.be.equal(inputs.recipient)
    })
  })

  describe('when the user does not have balance for the requested tokens', () => {
    const relevantTokens: RelevantTokensQueryMock[] = [
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
      const result = await runFunction(functionDir, context, { inputs, calls, relevantTokens })
      expect(result.success).to.be.true
      expect(result.timestamp).to.be.equal(context.timestamp)
      expect(result.intents).to.be.empty
    })
  })
})
