import { Chains, fp, OpType, randomEvmAddress } from '@mimicprotocol/sdk'
import { Context, ContractCallMock, GetPriceMock, GetRelevantTokensMock, runTask, Swap } from '@mimicprotocol/test-ts'
import { expect } from 'chai'
import { Interface } from 'ethers'

import ERC20Abi from '../abis/ERC20.json'

const ERC20Interface = new Interface(ERC20Abi)

describe('Task', () => {
  const taskDir = './build'

  const chainId = Chains.Base
  const USDC = '0x833589fcd6edb6e08f4c7c32d4f71b54bda02913'
  const WETH = randomEvmAddress()
  const WBTC = randomEvmAddress()

  const context: Context = {
    user: randomEvmAddress(),
    settlers: [{ address: randomEvmAddress(), chainId }],
    timestamp: Date.now(),
  }

  const inputs = {
    chainId,
    slippageBps: 50, // 0.5%
    recipient: randomEvmAddress(),
  }

  const prices: GetPriceMock[] = [
    { request: { token: USDC, chainId }, response: [fp(1).toString()] }, // 1 USDC = 1 USD
    { request: { token: WETH, chainId }, response: [fp(50).toString()] }, // 1 WETH = 50 USD
    { request: { token: WBTC, chainId }, response: [fp(100).toString()] }, // 1 WBTC = 100 USD
  ]

  const calls: ContractCallMock[] = [
    // USDC
    {
      request: { chainId, to: USDC, fnSelector: ERC20Interface.getFunction('decimals')!.selector },
      response: { value: '6', abiType: 'uint8' },
    },
    {
      request: { chainId, to: USDC, fnSelector: ERC20Interface.getFunction('symbol')!.selector },
      response: { value: 'USDC', abiType: 'string' },
    },
    // WETH
    {
      request: { chainId, to: WETH, fnSelector: ERC20Interface.getFunction('decimals')!.selector },
      response: { value: '18', abiType: 'uint8' },
    },
    {
      request: { chainId, to: WETH, fnSelector: ERC20Interface.getFunction('symbol')!.selector },
      response: { value: 'WETH', abiType: 'string' },
    },
    // WBTC
    {
      request: { chainId, to: WBTC, fnSelector: ERC20Interface.getFunction('decimals')!.selector },
      response: { value: '8', abiType: 'uint8' },
    },
    {
      request: { chainId, to: WBTC, fnSelector: ERC20Interface.getFunction('symbol')!.selector },
      response: { value: 'WBTC', abiType: 'string' },
    },
  ]

  describe('when the user has some balance for the requested tokens', () => {
    const relevantTokens: GetRelevantTokensMock[] = [
      {
        request: {
          owner: context.user!,
          chainIds: [chainId],
          usdMinAmount: '0',
          tokenFilter: 1,
          tokens: [],
        },
        response: [
          {
            timestamp: Date.now(),
            balances: [
              { token: { address: WETH, chainId }, balance: fp(1).toString() }, // 1 WETH
              { token: { address: WBTC, chainId }, balance: fp(5, 8).toString() }, // 5 WBTC
            ],
          },
        ],
      },
    ]

    it('produces the expected intents for multiple tokens', async () => {
      const result = await runTask(taskDir, context, { inputs, calls, prices, relevantTokens })
      expect(result.success).to.be.true
      expect(result.timestamp).to.be.equal(context.timestamp)

      const intents = result.intents as Swap[]
      expect(intents).to.have.lengthOf(2)

      const firstSwap = intents[0]
      expect(firstSwap.op).to.equal(OpType.Swap)
      expect(firstSwap.settler).to.equal(context.settlers![0].address)
      expect(firstSwap.user).to.equal(context.user)
      expect(firstSwap.sourceChain).to.equal(inputs.chainId)
      expect(firstSwap.destinationChain).to.equal(inputs.chainId)

      expect(firstSwap.tokensIn).to.have.lengthOf(1)
      expect(firstSwap.tokensIn[0].token).to.equal(WETH)
      expect(firstSwap.tokensIn[0].amount).to.equal(fp(1).toString())

      expect(firstSwap.tokensOut).to.have.lengthOf(1)
      expect(firstSwap.tokensOut[0].token).to.equal(USDC)
      expect(firstSwap.tokensOut[0].minAmount).to.equal('49750000') // 50 USDC with 0.5% slippage
      expect(firstSwap.tokensOut[0].recipient).to.equal(inputs.recipient)

      const secondSwap = intents[1]
      expect(secondSwap.op).to.equal(OpType.Swap)
      expect(secondSwap.settler).to.equal(context.settlers![0].address)
      expect(secondSwap.user).to.equal(context.user)
      expect(secondSwap.sourceChain).to.equal(inputs.chainId)
      expect(secondSwap.destinationChain).to.equal(inputs.chainId)

      expect(secondSwap.tokensIn).to.have.lengthOf(1)
      expect(secondSwap.tokensIn[0].token).to.equal(WBTC)
      expect(secondSwap.tokensIn[0].amount).to.equal(fp(5, 8).toString())

      expect(secondSwap.tokensOut).to.have.lengthOf(1)
      expect(secondSwap.tokensOut[0].token).to.equal(USDC)
      expect(secondSwap.tokensOut[0].minAmount).to.equal('497500000') // 500 USDC with 0.5% slippage
      expect(secondSwap.tokensOut[0].recipient).to.equal(inputs.recipient)

      expect(result.logs).to.have.lengthOf(2)
      expect(result.logs[0]).to.be.equal(`[Info] Adding swap of 1 WETH to 49.75 USDC on chain ${chainId}`)
      expect(result.logs[1]).to.be.equal(`[Info] Adding swap of 5 WBTC to 497.5 USDC on chain ${chainId}`)
    })
  })

  describe('when the user does not have balance for the requested tokens', () => {
    const relevantTokens: GetRelevantTokensMock[] = [
      {
        request: {
          owner: context.user!,
          chainIds: [chainId],
          usdMinAmount: '0',
          tokenFilter: 1,
          tokens: [],
        },
        response: [{ timestamp: Date.now(), balances: [] }],
      },
    ]

    it('does not produce any intents', async () => {
      const result = await runTask(taskDir, context, { inputs, calls, prices, relevantTokens })
      expect(result.success).to.be.true
      expect(result.timestamp).to.be.equal(context.timestamp)
      expect(result.intents).to.be.empty

      expect(result.logs).to.have.lengthOf(1)
      expect(result.logs[0]).to.be.equal(`[Info] No tokens found on chain ${chainId}`)
    })
  })
})
