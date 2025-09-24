import {
  Call,
  Context,
  ContractCallMock,
  GetPriceMock,
  GetRelevantTokensMock,
  runTask,
  Swap,
  Transfer,
} from '@mimicprotocol/test-ts'
import { expect } from 'chai'

describe('Task', () => {
  const taskDir = './'

  const chainId = 10 // Optimism

  const tokens = {
    aUSDC: '0x625e7708f30ca75bfd92586e17077590c60eb4cd',
    USDC: '0x7f5c764cbc14f9669b88837ca1490cca17c31607',
    USDT: '0x94b008aa00579c1307b0ef2c499ad98a8ce58e58',
  }

  const context: Context = {
    user: '0xae7168deb525862f4fee37d987a971b385b96952',
    settlers: [{ address: '0xdcf1d9d12a0488dfb70a8696f44d6d3bc303963d', chainId: 10 }],
    timestamp: Date.now(),
  }

  const inputs = {
    chainId,
    smartAccount: '0x863df6bfa4469f3ead0be8f9f2aae51c91a907b4',
    usdFeeAmount: '1', // 1 USD in USDT
  }

  const calls: ContractCallMock[] = [
    {
      request: {
        to: tokens.USDT,
        chainId,
        data: '0x313ce567', // `decimals` fn selector
      },
      response: {
        value: '6',
        abiType: 'uint8',
      },
    },
  ]

  const prices: GetPriceMock[] = [
    {
      request: {
        token: tokens.aUSDC,
        chainId,
      },
      response: ['1000000'],
    },
    {
      request: {
        token: tokens.USDC,
        chainId,
      },
      response: ['1000000'],
    },
    {
      request: {
        token: tokens.USDT,
        chainId,
      },
      response: ['1000000'],
    },
  ]

  const buildTokenBalances = ({
    aUsdcSmartAccountBalance,
    usdcUserBalance,
    aUsdcUserBalance,
  }: {
    aUsdcSmartAccountBalance: string
    usdcUserBalance: string
    aUsdcUserBalance: string
  }): GetRelevantTokensMock[] => [
    {
      request: {
        owner: inputs.smartAccount,
        chainIds: [10],
        usdMinAmount: '0',
        tokenFilter: 0,
        tokens: [{ address: tokens.aUSDC, chainId }],
      },
      response: [[{ token: { address: tokens.aUSDC, chainId }, amount: aUsdcSmartAccountBalance }]],
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
        [
          { token: { address: tokens.USDC, chainId }, amount: usdcUserBalance },
          { token: { address: tokens.aUSDC, chainId }, amount: aUsdcUserBalance },
        ],
      ],
    },
  ]

  describe('when all balances are present', () => {
    const balances = buildTokenBalances({
      aUsdcSmartAccountBalance: '1000000',
      usdcUserBalance: '1000000',
      aUsdcUserBalance: '1000000',
    })

    it('produces claim, swap, and transfer', async () => {
      const intents = await runTask(taskDir, context, { inputs, balances, prices, calls })

      const claimIntent = intents.find((i) => i.type === 'transfer')
      const swapIntent = intents.find((i) => i.type === 'swap')
      const transferIntent = intents.find((i) => i.type === 'call')

      expect(claimIntent).to.exist
      expect(swapIntent).to.exist
      expect(transferIntent).to.exist
    })
  })

  describe('when all balances are not present', () => {
    describe('when there is only aUSDC in the smart account', () => {
      const balances = buildTokenBalances({
        aUsdcSmartAccountBalance: '1000000',
        usdcUserBalance: '0',
        aUsdcUserBalance: '0',
      })

      it('only produces a claim intent', async () => {
        const intents = (await runTask(taskDir, context, { inputs, balances, prices, calls })) as Call[]
        expect(intents).to.have.lengthOf(1)

        expect(intents[0].type).to.equal('call')
        expect(intents[0].user).to.equal(inputs.smartAccount)
      })
    })

    describe('when there is only USDC in the user account', () => {
      const amount = '1000000'
      const balances = buildTokenBalances({
        aUsdcSmartAccountBalance: '0',
        usdcUserBalance: amount,
        aUsdcUserBalance: '0',
      })

      it('only produces a swap intent', async () => {
        const intents = (await runTask(taskDir, context, { inputs, balances, prices, calls })) as Swap[]
        expect(intents).to.have.lengthOf(1)

        expect(intents[0].type).to.equal('swap')
        expect(intents[0].user).to.equal(context.user)
        expect(intents[0].tokensIn[0].token).to.equal(tokens.USDC)
        expect(intents[0].tokensIn[0].amount).to.equal(amount)
        expect(intents[0].tokensOut[0].token).to.equal(tokens.aUSDC)
      })
    })

    describe('when there is only aUSDC in the user account', () => {
      const amount = '1000000'
      const balances = buildTokenBalances({
        aUsdcSmartAccountBalance: '0',
        usdcUserBalance: '0',
        aUsdcUserBalance: amount,
      })

      it('only produces a transfer intent', async () => {
        const intents = (await runTask(taskDir, context, { inputs, prices, balances, calls })) as Transfer[]
        expect(intents).to.have.lengthOf(1)

        expect(intents[0].type).to.equal('transfer')
        expect(intents[0].transfers[0].recipient).to.equal(inputs.smartAccount)
        expect(intents[0].transfers[0].amount).to.equal(amount)
        expect(intents[0].user).to.equal(context.user)
      })
    })

    describe('when all balances are zero', () => {
      const balances = buildTokenBalances({
        aUsdcSmartAccountBalance: '0',
        usdcUserBalance: '0',
        aUsdcUserBalance: '0',
      })

      it('does not produce any intents', async () => {
        const intents = await runTask(taskDir, context, { inputs, balances, prices, calls })
        expect(intents).to.be.empty
      })
    })
  })
})
