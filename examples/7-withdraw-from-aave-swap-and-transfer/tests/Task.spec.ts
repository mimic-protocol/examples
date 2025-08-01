import { Call, RelevantTokens, runTask, Swap, Transfer } from '@mimicprotocol/test-ts'
import { expect } from 'chai'

describe('Task', () => {
  const taskDir = './'

  const chainId = 10 // Optimism

  const tokens = {
    aUSDC: '0x625e7708f30ca75bfd92586e17077590c60eb4cd',
    USDC: '0x7f5c764cbc14f9669b88837ca1490cca17c31607',
    USDT: '0x94b008aa00579c1307b0ef2c499ad98a8ce58e58',
  }

  const context = {
    user: '0xae7168deb525862f4fee37d987a971b385b96952',
    settlers: [{ address: '0xdcf1d9d12a0488dfb70a8696f44d6d3bc303963d', chainId: 10 }],
    timestamp: Date.now(),
  }

  const inputs = {
    chainId,
    smartAccount: '0x863df6bfa4469f3ead0be8f9f2aae51c91a907b4',
    usdFeeAmount: '1', // 1 USD in USDT
  }

  const prices = [
    { token: tokens.aUSDC, chainId, usdPrice: '1000000' },
    { token: tokens.USDC, chainId, usdPrice: '1000000' },
    { token: tokens.USDT, chainId, usdPrice: '1000000' },
  ]

  const buildTokenBalances = ({
    aUsdcSmartAccountBalance,
    usdcUserBalance,
    aUsdcUserBalance,
  }: {
    aUsdcSmartAccountBalance: string
    usdcUserBalance: string
    aUsdcUserBalance: string
  }): RelevantTokens[] => [
    {
      owner: inputs.smartAccount,
      chainIds: [10],
      usdMinAmount: '0',
      tokenFilter: 0,
      tokens: [{ address: tokens.aUSDC, chainId }],
      // aUSDC balance in smart account
      output: [{ token: { address: tokens.aUSDC, chainId }, amount: aUsdcSmartAccountBalance }],
    },

    {
      owner: context.user,
      chainIds: [10],
      usdMinAmount: '0',
      tokenFilter: 0,
      tokens: [
        { address: tokens.USDC, chainId },
        { address: tokens.aUSDC, chainId },
      ],
      output: [
        // USDC balance in user
        { token: { address: tokens.USDC, chainId }, amount: usdcUserBalance },
        // aUSDC balance in user
        { token: { address: tokens.aUSDC, chainId }, amount: aUsdcUserBalance },
      ],
    },
  ]

  it('produces claim, swap, and transfer when all balances are present', async () => {
    const balances = buildTokenBalances({
      aUsdcSmartAccountBalance: '1000000',
      usdcUserBalance: '1000000',
      aUsdcUserBalance: '1000000',
    })

    const intents = await runTask(taskDir, context, { inputs, balances, prices })

    const claimIntent = intents.find((i) => i.type === 'transfer')
    const swapIntent = intents.find((i) => i.type === 'swap')
    const transferIntent = intents.find((i) => i.type === 'call')

    expect(claimIntent).to.exist
    expect(swapIntent).to.exist
    expect(transferIntent).to.exist
  })

  it('only produces claim when only aUSDC exists in smart account', async () => {
    const balances = buildTokenBalances({
      aUsdcSmartAccountBalance: '1000000',
      usdcUserBalance: '0',
      aUsdcUserBalance: '0',
    })

    const intents = (await runTask(taskDir, context, { inputs, balances, prices })) as Call[]
    expect(intents).to.have.lengthOf(1)
    expect(intents[0].type).to.equal('call')
    expect(intents[0].user).to.equal(inputs.smartAccount)
  })

  it('only produces swap when only USDC exists in user', async () => {
    const amount = '1000000'
    const balances = buildTokenBalances({
      aUsdcSmartAccountBalance: '0',
      usdcUserBalance: amount,
      aUsdcUserBalance: '0',
    })

    const intents = (await runTask(taskDir, context, { inputs, balances, prices })) as Swap[]
    expect(intents).to.have.lengthOf(1)
    expect(intents[0].type).to.equal('swap')
    expect(intents[0].user).to.equal(context.user)
    expect(intents[0].tokensIn[0].token).to.equal(tokens.USDC)
    expect(intents[0].tokensIn[0].amount).to.equal(amount)
    expect(intents[0].tokensOut[0].token).to.equal(tokens.aUSDC)
  })

  it('only produces transfer when only aUSDC exists in user', async () => {
    const amount = '1000000'
    const balances = buildTokenBalances({
      aUsdcSmartAccountBalance: '0',
      usdcUserBalance: '0',
      aUsdcUserBalance: amount,
    })
    const intents = (await runTask(taskDir, context, { inputs, prices, balances })) as Transfer[]
    expect(intents).to.have.lengthOf(1)
    expect(intents[0].type).to.equal('transfer')
    expect(intents[0].transfers[0].recipient).to.equal(inputs.smartAccount)
    expect(intents[0].transfers[0].amount).to.equal(amount)
    expect(intents[0].user).to.equal(context.user)
  })

  it('produces no intents when all balances are zero', async () => {
    const balances = buildTokenBalances({
      aUsdcSmartAccountBalance: '0',
      usdcUserBalance: '0',
      aUsdcUserBalance: '0',
    })

    const intents = await runTask(taskDir, context, { inputs, balances, prices })
    expect(intents).to.be.an('array').that.is.empty
  })
})
