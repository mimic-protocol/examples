import { Chains, fp, OpType, randomEvmAddress } from '@mimicprotocol/sdk'
import { EvmCallQueryMock, runFunction, SwapOperation, TokenPriceQueryMock } from '@mimicprotocol/test-ts'
import { expect } from 'chai'

describe('Function', () => {
  const functionDir = './build'

  const chainId = Chains.Optimism

  const context = {
    user: randomEvmAddress(),
    settlers: [{ address: randomEvmAddress(), chainId }],
    timestamp: Date.now(),
  }

  const allocations = [
    { recipient: randomEvmAddress(), pctBps: 7500 }, // 75%
    { recipient: randomEvmAddress(), pctBps: 2500 }, // 25%
  ]

  const inputs = {
    chainId,
    tokenIn: randomEvmAddress(),
    tokenOut: randomEvmAddress(),
    amount: '1.5', // 1.5 tokenIn
    slippageBps: 100, // 1%
    user: context.user,
    allocations: `${allocations[0].recipient}:${allocations[0].pctBps},${allocations[1].recipient}:${allocations[1].pctBps}`,
    maxFeeUsd: '0.1', // 0.1 USD
  }

  const calls: EvmCallQueryMock[] = [
    {
      request: { to: inputs.tokenIn, chainId, fnSelector: '0x313ce567' }, // decimals
      response: { value: '6', abiType: 'uint8' },
    },
    {
      request: { to: inputs.tokenOut, chainId, fnSelector: '0x313ce567' }, // decimals
      response: { value: '18', abiType: 'uint8' },
    },
  ]

  const prices: TokenPriceQueryMock[] = [
    {
      request: { token: { address: inputs.tokenIn, chainId: inputs.chainId } },
      response: ['1000000000000000000'], // 1 tokenIn = 1 USD
    },
    {
      request: { token: { address: inputs.tokenOut, chainId: inputs.chainId } },
      response: ['250000000000000000'], // 1 tokenOut = 0.25 USD
    },
  ]

  it('produces the expected swap operation', async () => {
    const result = await runFunction(functionDir, context, { inputs, calls, prices })
    expect(result.success).to.be.true
    expect(result.timestamp).to.be.equal(context.timestamp)

    expect(result.intents).to.have.lengthOf(1)
    const intent = result.intents[0]

    expect(intent.feePayer).to.be.equal(context.user)
    expect(intent.settler).to.be.equal(context.settlers[0].address)
    expect(intent.maxFees).to.have.lengthOf(1)
    expect(intent.maxFees[0].token).to.be.equal('0x0000000000000000000000000000000000000348')
    expect(intent.maxFees[0].amount).to.be.equal(fp(inputs.maxFeeUsd).toString())

    expect(intent.operations.length).to.be.greaterThan(1)
    const swap = intent.operations[0] as SwapOperation

    expect(swap.opType).to.be.equal(OpType.Swap)
    expect(swap.user).to.be.equal(inputs.user)
    expect(swap.sourceChain).to.be.equal(inputs.chainId)
    expect(swap.destinationChain).to.be.equal(inputs.chainId)

    expect(swap.tokensIn).to.have.lengthOf(1)
    expect(swap.tokensIn[0].token).to.be.equal(inputs.tokenIn)
    expect(swap.tokensIn[0].amount).to.be.equal(fp(inputs.amount, 6).toString())

    expect(swap.tokensOut).to.have.lengthOf(1)
    expect(swap.tokensOut[0].token).to.be.equal(inputs.tokenOut)
    expect(swap.tokensOut[0].minAmount).to.be.equal(fp('5.94').toString())
  })
})
