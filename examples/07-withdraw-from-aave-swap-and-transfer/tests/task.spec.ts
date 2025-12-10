import { Chains, OpType, randomEvmAddress } from '@mimicprotocol/sdk'
import {
  Call,
  Context,
  EvmCallQueryMock,
  RelevantTokensQueryMock,
  runTask,
  Swap,
  TokenPriceQueryMock,
  Transfer,
} from '@mimicprotocol/test-ts'
import { expect } from 'chai'
import { Interface } from 'ethers'

import AavePool from '../abis/AavePool.json'
import ERC20Abi from '../abis/ERC20.json'

const AavePoolInterface = new Interface(AavePool)
const ERC20Interface = new Interface(ERC20Abi)

describe('Task', () => {
  const taskDir = './build'

  const chainId = Chains.Optimism

  const tokens = {
    aUSDC: '0x625e7708f30ca75bfd92586e17077590c60eb4cd',
    USDC: '0x7f5c764cbc14f9669b88837ca1490cca17c31607',
    USDT: '0x94b008aa00579c1307b0ef2c499ad98a8ce58e58',
  }

  const context: Context = {
    user: randomEvmAddress(),
    settlers: [{ address: randomEvmAddress(), chainId: 10 }],
    timestamp: Date.now(),
  }

  const inputs = {
    chainId,
    smartAccount: randomEvmAddress(),
    maxFeeUsdt: '1', // 1 USDT
  }

  const calls: EvmCallQueryMock[] = [
    {
      request: { to: tokens.USDT, chainId, fnSelector: ERC20Interface.getFunction('decimals')!.selector },
      response: { value: '6', abiType: 'uint8' },
    },
  ]

  const prices: TokenPriceQueryMock[] = [
    {
      request: { token: tokens.aUSDC, chainId },
      response: ['1000000'],
    },
    {
      request: { token: tokens.USDC, chainId },
      response: ['1000000'],
    },
    {
      request: { token: tokens.USDT, chainId },
      response: ['1000000'],
    },
  ]

  const buildRelevantTokens = ({
    aUsdcSmartAccountBalance,
    usdcUserBalance,
    aUsdcUserBalance,
  }: {
    aUsdcSmartAccountBalance: string
    usdcUserBalance: string
    aUsdcUserBalance: string
  }): RelevantTokensQueryMock[] => [
    {
      request: {
        owner: inputs.smartAccount,
        chainIds: [10],
        usdMinAmount: '0',
        tokenFilter: 0,
        tokens: [{ address: tokens.aUSDC, chainId }],
      },
      response: [
        {
          timestamp: context.timestamp!,
          balances: [{ token: { address: tokens.aUSDC, chainId }, balance: aUsdcSmartAccountBalance }],
        },
      ],
    },
    {
      request: {
        owner: context.user!,
        chainIds: [10],
        usdMinAmount: '0',
        tokenFilter: 0,
        tokens: [
          { address: tokens.USDC, chainId },
          { address: tokens.aUSDC, chainId },
        ],
      },
      response: [
        {
          timestamp: context.timestamp!,
          balances: [
            { token: { address: tokens.USDC, chainId }, balance: usdcUserBalance },
            { token: { address: tokens.aUSDC, chainId }, balance: aUsdcUserBalance },
          ],
        },
      ],
    },
  ]

  describe('when all relevant tokens are present', () => {
    const relevantTokens = buildRelevantTokens({
      aUsdcSmartAccountBalance: '1000000',
      usdcUserBalance: '1000000',
      aUsdcUserBalance: '1000000',
    })

    it('produces claim, swap, and transfer', async () => {
      const result = await runTask(taskDir, context, { inputs, relevantTokens, prices, calls })

      const claimIntent = result.intents.find((i) => i.op === OpType.EvmCall)
      const swapIntent = result.intents.find((i) => i.op === OpType.Swap)
      const transferIntent = result.intents.find((i) => i.op === OpType.Transfer)

      expect(claimIntent).to.exist
      expect(swapIntent).to.exist
      expect(transferIntent).to.exist
    })
  })

  describe('when all relevant tokens are not present', () => {
    describe('when there is only aUSDC in the smart account', () => {
      const amount = '1000000'
      const relevantTokens = buildRelevantTokens({
        aUsdcSmartAccountBalance: amount,
        usdcUserBalance: '0',
        aUsdcUserBalance: '0',
      })

      it('only produces a claim intent', async () => {
        const result = await runTask(taskDir, context, { inputs, relevantTokens, prices, calls })
        expect(result.success).to.be.true
        expect(result.timestamp).to.be.equal(context.timestamp)

        const intents = result.intents as Call[]
        expect(intents).to.have.lengthOf(1)

        expect(intents[0].op).to.equal(OpType.EvmCall)
        expect(intents[0].user).to.equal(inputs.smartAccount)

        const expectedData = AavePoolInterface.encodeFunctionData('withdraw(address,uint256,address)', [
          tokens.USDC,
          amount,
          context.user,
        ])
        expect(intents[0].calls[0].target).to.be.equal('0x794a61358d6845594f94dc1db02a252b5b4814ad')
        expect(intents[0].calls[0].value).to.be.equal('0')
        expect(intents[0].calls[0].data).to.be.equal(expectedData)
      })
    })

    describe('when there is only USDC in the user account', () => {
      const amount = '1000000'
      const relevantTokens = buildRelevantTokens({
        aUsdcSmartAccountBalance: '0',
        usdcUserBalance: amount,
        aUsdcUserBalance: '0',
      })

      it('only produces a swap intent', async () => {
        const result = await runTask(taskDir, context, { inputs, relevantTokens, prices, calls })
        expect(result.success).to.be.true
        expect(result.timestamp).to.be.equal(context.timestamp)

        const intents = result.intents as Swap[]
        expect(intents).to.have.lengthOf(1)

        expect(intents[0].op).to.equal(OpType.Swap)
        expect(intents[0].user).to.equal(context.user)
        expect(intents[0].tokensIn[0].token).to.equal(tokens.USDC)
        expect(intents[0].tokensIn[0].amount).to.equal(amount)
        expect(intents[0].tokensOut[0].token).to.equal(tokens.aUSDC)
      })
    })

    describe('when there is only aUSDC in the user account', () => {
      const amount = '1000000'
      const relevantTokens = buildRelevantTokens({
        aUsdcSmartAccountBalance: '0',
        usdcUserBalance: '0',
        aUsdcUserBalance: amount,
      })

      it('only produces a transfer intent', async () => {
        const result = await runTask(taskDir, context, { inputs, relevantTokens, prices, calls })
        expect(result.success).to.be.true
        expect(result.timestamp).to.be.equal(context.timestamp)

        const intents = result.intents as Transfer[]
        expect(intents).to.have.lengthOf(1)

        expect(intents[0].op).to.equal(OpType.Transfer)
        expect(intents[0].transfers[0].recipient).to.equal(inputs.smartAccount)
        expect(intents[0].transfers[0].amount).to.equal(amount)
        expect(intents[0].user).to.equal(context.user)
      })
    })

    describe('when all relevantTokens are zero', () => {
      const relevantTokens = buildRelevantTokens({
        aUsdcSmartAccountBalance: '0',
        usdcUserBalance: '0',
        aUsdcUserBalance: '0',
      })

      it('does not produce any intents', async () => {
        const result = await runTask(taskDir, context, { inputs, relevantTokens, prices, calls })
        expect(result.success).to.be.true
        expect(result.intents).to.be.empty
      })
    })
  })
})
