import { Context, ContractCallMock, runTask, SubgraphQueryMock, Swap } from '@mimicprotocol/test-ts'
import { expect } from 'chai'

describe('Task', () => {
  const taskDir = './'

  const context: Context = {
    user: '0x756f45e3fa69347a9a973a725e3c98bc4db0b5a0',
    settlers: [{ address: '0xdcf1d9d12a0488dfb70a8696f44d6d3bc303963d', chainId: 1 }],
    timestamp: Date.now(),
  }

  const inputs = {
    subgraphId: 'subgraph-id',
    chainId: 1,
    tokenIn: '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48', // USDC
    tokenOut: '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2', // WETH
    slippage: 1,
  }

  const subgraphQueries: SubgraphQueryMock[] = [
    {
      request: {
        chainId: inputs.chainId,
        subgraphId: inputs.subgraphId,
        query: `
  {
    pair(where: { token0: "0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48", token1: "0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2" }) {
      token0Price   # token0 per token1
      token1Price   # token1 per token0
    }
  }`,
      },
      response: {
        blockNumber: 1,
        data: '{ "pairs": [{ "token0Price": "4119.946843278424527854752689641976", "token1Price": "0.000242721578224115053025889330520782" }] }',
      },
    },
  ]

  const buildCalls = (balance: string): ContractCallMock[] => [
    {
      request: {
        to: inputs.tokenIn,
        chainId: inputs.chainId,
        data: '0x70a08231', // `balanceOf` fn selector
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
        data: '0x313ce567', // `decimals` fn selector
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
        data: '0x313ce567', // `decimals` fn selector
      },
      response: {
        value: '18',
        abiType: 'uint8',
      },
    },
  ]

  describe('when the balance is not zero', () => {
    const balance = '9000000000' // 9000 USDC
    const calls = buildCalls(balance)

    it('produces the expected intents', async () => {
      const intents = (await runTask(taskDir, context, { inputs, calls, subgraphQueries })) as Swap[]
      expect(intents).to.have.lengthOf(1)

      expect(intents[0].type).to.be.equal('swap')
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

    it('does not produce any intent', async () => {
      try {
        await runTask(taskDir, context, { inputs, calls, subgraphQueries })
        fail()
      } catch (error) {
        expect(error.message).to.include('No amount in to swap')
      }
    })
  })
})
