import { Chains, fp, OpType } from '@mimicprotocol/sdk'
import { Context, ContractCallMock, GetPriceMock, runTask, Swap } from '@mimicprotocol/test-ts'
import { expect } from 'chai'

describe('Task', () => {
  const taskDir = './build'

  const chainId = Chains.Base
  const USDC = '0x833589fcd6edb6e08f4c7c32d4f71b54bda02913'
  const WETH = '0x4200000000000000000000000000000000000006'

  const context: Context = {
    user: '0x756f45e3fa69347a9a973a725e3c98bc4db0b5a0',
    settlers: [{ address: '0x609d831c0068844e11ef85a273c7f356212fd6d1', chainId }],
    timestamp: Date.now(),
  }

  const inputs = {
    chainId,
    tokenIn: USDC,
    tokenOut: WETH,
    amountDecimal: '10.5', // 10.5 USDC
    slippageBps: 100, // 1%
    recipient: context.user!,
  }

  const prices: GetPriceMock[] = [
    {
      request: { token: USDC, chainId },
      response: [fp(1).toString()], // 1 USDC = 1 USD
    },
    {
      request: { token: WETH, chainId },
      response: [fp(4200).toString()], // 1 WETH = 4200 USD
    },
  ]

  const calls: ContractCallMock[] = [
    // USDC
    {
      request: { to: USDC, chainId, fnSelector: '0x313ce567' }, // `decimals`
      response: { value: '6', abiType: 'uint8' },
    },
    {
      request: { to: USDC, chainId, fnSelector: '0x95d89b41' }, // `symbol`
      response: { value: 'USDC', abiType: 'string' },
    },
    // WETH
    {
      request: { to: WETH, chainId, fnSelector: '0x313ce567' }, // `decimals`
      response: { value: '18', abiType: 'uint8' },
    },
    {
      request: { to: WETH, chainId, fnSelector: '0x95d89b41' }, // `symbol`
      response: { value: 'WETH', abiType: 'string' },
    },
  ]

  it('produces the expected intents', async () => {
    const result = await runTask(taskDir, context, { inputs, prices, calls })
    expect(result.success).to.be.true
    expect(result.timestamp).to.be.equal(context.timestamp)

    const intents = result.intents as Swap[]
    expect(intents).to.have.lengthOf(1)

    expect(intents[0].op).to.be.equal(OpType.Swap)
    expect(intents[0].settler).to.be.equal(context.settlers?.[0].address)
    expect(intents[0].user).to.be.equal(context.user)
    expect(intents[0].sourceChain).to.be.equal(inputs.chainId)
    expect(intents[0].destinationChain).to.be.equal(inputs.chainId)

    expect(intents[0].tokensIn).to.have.lengthOf(1)
    expect(intents[0].tokensIn[0].token).to.be.equal(inputs.tokenIn)
    expect(intents[0].tokensIn[0].amount).to.be.equal(fp(10.5, 6).toString())

    expect(intents[0].tokensOut).to.have.lengthOf(1)
    expect(intents[0].tokensOut[0].token).to.be.equal(inputs.tokenOut)
    expect(intents[0].tokensOut[0].minAmount).to.be.equal(fp(0.002475).toString()) // amountIn / wethPrice * (1 - slippage) = 10.5 / 4200 * 0.99 = 0.002475
    expect(intents[0].tokensOut[0].recipient).to.be.equal(context.user)

    expect(result.logs).to.have.lengthOf(3)
    expect(result.logs[0]).to.be.equal(
      `[Info] Starting DCA swap: amountFromToken=${inputs.amountDecimal}, slippageBps=${inputs.slippageBps}, chainId=${chainId}, recipient=${context.user}`
    )
    expect(result.logs[1]).to.be.equal(
      `[Info] Calculated minOut: 0.002475 WETH (equivalent=0.0025 WETH, slippageBps=${inputs.slippageBps})`
    )
    expect(result.logs[2]).to.be.equal('[Info] DCA swap executed successfully')
  })
})
