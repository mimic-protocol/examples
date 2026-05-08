import { Chains, OpType, randomEvmAddress } from '@mimicprotocol/sdk'
import {
  EvmCallQueryMock,
  EvmDynamicCallOperation,
  runFunction,
  SwapOperation,
  TokenPriceQueryMock,
} from '@mimicprotocol/test-ts'
import { expect } from 'chai'

describe('Function', () => {
  const functionDir = './build'

  const chainId = Chains.Optimism

  const context = {
    user: '0x756f45e3fa69347a9a973a725e3c98bc4db0b5a0',
    settlers: [{ address: '0xdcf1d9d12a0488dfb70a8696f44d6d3bc303963d', chainId }],
    timestamp: Date.now(),
  }

  const inputs = {
    tokenIn: randomEvmAddress(),
    tokenOut: randomEvmAddress(),
    chainId,
    amount: '1.5',
    slippageBps: 1,
    smartAccount: randomEvmAddress(),
    recipient: randomEvmAddress(),
    maxFeeUsd: '0.1',
  }

  const calls: EvmCallQueryMock[] = [
    {
      request: { to: inputs.tokenIn, chainId, fnSelector: '0x313ce567' }, // decimals
      response: { value: '6', abiType: 'uint8' },
    },
    {
      request: { to: inputs.tokenOut, chainId, fnSelector: '0x313ce567' }, // decimals
      response: { value: '6', abiType: 'uint8' },
    },
  ]

  const prices: TokenPriceQueryMock[] = [
    {
      request: { token: { address: inputs.tokenIn, chainId: inputs.chainId } },
      response: ['1000000000000000000'], // 1 token = 1 USD
    },
    {
      request: { token: { address: inputs.tokenOut, chainId: inputs.chainId } },
      response: ['1000000000000000000'], // 1 token = 1 USD
    },
  ]

  it('produces the expected intents', async () => {
    const result = await runFunction(functionDir, context, { inputs, calls, prices })
    expect(result.success).to.be.true
    expect(result.timestamp).to.be.equal(context.timestamp)

    expect(result.intents).to.have.lengthOf(1)
    const intent = result.intents[0]

    expect(intent.feePayer).to.be.equal(context.user)
    expect(intent.maxFees).to.have.lengthOf(1)
    expect(intent.maxFees[0].token).to.be.equal('0x0000000000000000000000000000000000000348')
    expect(intent.maxFees[0].amount).to.be.equal('100000000000000000')
    expect(intent.operations).to.have.lengthOf(2)
    expect(intent.settler).to.be.equal(context.settlers[0].address)

    const swap = intent.operations[0] as SwapOperation
    const call = intent.operations[1] as EvmDynamicCallOperation
    expect(swap.opType).to.be.equal(OpType.Swap)
    expect(call.opType).to.be.equal(OpType.EvmDynamicCall)

    expect(swap.user).to.be.equal(context.user)
    expect(call.user).to.be.equal(inputs.smartAccount)

    expect(swap.sourceChain).to.be.equal(inputs.chainId)
    expect(swap.destinationChain).to.be.equal(inputs.chainId)
    expect(call.chainId).to.be.equal(inputs.chainId)

    expect(call.calls).to.have.lengthOf(1)
    expect(call.calls[0].target).to.be.equal(inputs.tokenOut)
    expect(call.calls[0].arguments).to.have.lengthOf(2)
  })
})
