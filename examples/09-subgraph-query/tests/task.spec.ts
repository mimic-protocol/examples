import { OpType, randomEvmAddress } from '@mimicprotocol/sdk'
import { Context, ContractCallMock, runTask, SubgraphQueryMock, Swap } from '@mimicprotocol/test-ts'
import { expect } from 'chai'

describe('Task', () => {
  const taskDir = './build'

  const context: Context = {
    user: randomEvmAddress(),
    settlers: [{ address: randomEvmAddress(), chainId: 1 }],
    timestamp: Date.now(),
  }

  const inputs = {
    subgraphId: 'subgraph-id',
    chainId: 1,
    tokenIn: '0xa' + randomEvmAddress().slice(3),
    tokenOut: '0xb' + randomEvmAddress().slice(3),
    slippageBps: 100, // 1%
  }

  const subgraphQueries: SubgraphQueryMock[] = [
    {
      request: {
        timestamp: context.timestamp!,
        chainId: inputs.chainId,
        subgraphId: inputs.subgraphId,
        query: `{pools(where: { token0: "${inputs.tokenIn}", token1: "${inputs.tokenOut}" }) {token0Price  token1Price}}`,
      },
      response: {
        blockNumber: 1,
        data: '{ "pools": [{ "token0Price": "4119.946843278424527854752689641976", "token1Price": "0.000242721578224115053025889330520782" }] }',
      },
    },
  ]

  const buildCalls = (balance: string): ContractCallMock[] => [
    {
      request: {
        to: inputs.tokenIn,
        chainId: inputs.chainId,
        fnSelector: '0x70a08231', // `balanceOf`
        params: [{ value: context.user!, abiType: 'address' }],
      },
      response: {
        value: balance,
        abiType: 'uint256',
      },
    },
    {
      request: {
        to: inputs.tokenIn,
        chainId: inputs.chainId,
        fnSelector: '0x313ce567', // `decimals`
      },
      response: {
        value: '6',
        abiType: 'uint8',
      },
    },
    {
      request: {
        to: inputs.tokenOut,
        chainId: inputs.chainId,
        fnSelector: '0x313ce567', // `decimals`
      },
      response: {
        value: '18',
        abiType: 'uint8',
      },
    },
  ]

  describe('when the balance is not zero', () => {
    const balance = '9000000000' // 9000 tokenIn
    const calls = buildCalls(balance)

    it('produces the expected intents', async () => {
      const result = await runTask(taskDir, context, { inputs, calls, subgraphQueries })
      expect(result.success).to.be.true
      expect(result.timestamp).to.be.equal(context.timestamp)

      const intents = result.intents as Swap[]
      expect(intents).to.have.lengthOf(1)

      expect(intents[0].op).to.equal(OpType.Swap)
      expect(intents[0].settler).to.be.equal(context.settlers?.[0].address)
      expect(intents[0].user).to.be.equal(context.user)
      expect(intents[0].sourceChain).to.be.equal(inputs.chainId)
      expect(intents[0].destinationChain).to.be.equal(inputs.chainId)

      expect(intents[0].tokensIn).to.have.lengthOf(1)
      expect(intents[0].tokensIn[0].token).to.be.equal(inputs.tokenIn)
      expect(intents[0].tokensIn[0].amount).to.be.equal(balance)

      expect(intents[0].tokensOut).to.have.lengthOf(1)
      expect(intents[0].tokensOut[0].token).to.be.equal(inputs.tokenOut)
      expect(intents[0].tokensOut[0].minAmount).to.be.equal('2162649261976865122')
      expect(intents[0].tokensOut[0].recipient).to.be.equal(context.user)
    })
  })

  describe('when the balance is zero', () => {
    const balance = '0'
    const calls = buildCalls(balance)

    it('throws an error', async () => {
      const result = await runTask(taskDir, context, { inputs, calls, subgraphQueries })
      expect(result.success).to.be.false

      expect(result.logs).to.have.lengthOf(1)
      expect(result.logs[0]).to.include('No amount in to swap')
    })
  })
})
