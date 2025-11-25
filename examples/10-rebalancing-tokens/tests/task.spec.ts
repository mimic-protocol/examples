import { Chains, OpType, randomEvmAddress } from '@mimicprotocol/sdk'
import { ContractCallMock, runTask, Swap } from '@mimicprotocol/test-ts'
import { expect } from 'chai'
import { Interface } from 'ethers'

import ERC20Abi from '../abis/ERC20.json'

const ERC20Interface = new Interface(ERC20Abi)

describe('Task', () => {
  const taskDir = './build'

  const chainId = Chains.Optimism

  const context = {
    user: randomEvmAddress(),
    settlers: [{ address: randomEvmAddress(), chainId }],
    timestamp: Date.now(),
  }

  const WBTC = randomEvmAddress() // 8 decimals
  const WETH = randomEvmAddress() // 18 decimals
  const DAI = randomEvmAddress() // 18 decimals

  const inputs = {
    chainId,
    tokenA: WBTC,
    tokenB: WETH,
    tokenC: DAI,
    targetBpsA: 5000, // BTC 50%
    targetBpsB: 3000, // ETH 30%
    targetBpsC: 2000, // DAI 20%
    slippageBps: 50, // 0.50%
  }

  const buildErc20Calls = (balanceWBTC: string, balanceWETH: string, balanceDAI: string): ContractCallMock[] => [
    // WBTC
    {
      request: {
        to: WBTC,
        chainId,
        fnSelector: ERC20Interface.getFunction('balanceOf')!.selector,
        params: [{ value: context.user, abiType: 'address' }],
      },
      response: { value: balanceWBTC, abiType: 'uint256' },
    },
    {
      request: { to: WBTC, chainId, fnSelector: ERC20Interface.getFunction('decimals')!.selector },
      response: { value: '8', abiType: 'uint8' },
    },
    // WETH
    {
      request: {
        to: WETH,
        chainId,
        fnSelector: ERC20Interface.getFunction('balanceOf')!.selector,
        params: [{ value: context.user, abiType: 'address' }],
      },
      response: { value: balanceWETH, abiType: 'uint256' },
    },
    {
      request: { to: WETH, chainId, fnSelector: ERC20Interface.getFunction('decimals')!.selector },
      response: { value: '18', abiType: 'uint8' },
    },
    // DAI
    {
      request: {
        to: DAI,
        chainId,
        fnSelector: ERC20Interface.getFunction('balanceOf')!.selector,
        params: [{ value: context.user, abiType: 'address' }],
      },
      response: { value: balanceDAI, abiType: 'uint256' },
    },
    {
      request: { to: DAI, chainId, fnSelector: ERC20Interface.getFunction('decimals')!.selector },
      response: { value: '18', abiType: 'uint8' },
    },
  ]

  describe('when there are some balances', () => {
    // Prices: BTC=$60k, ETH=$3k, DAI=$1 — all with 1e18 USD precision
    const prices = [
      { request: { token: WBTC, chainId }, response: ['60000000000000000000000'] }, // 60000 * 1e18
      { request: { token: WETH, chainId }, response: ['3000000000000000000000'] }, // 3000  * 1e18
      { request: { token: DAI, chainId }, response: ['1000000000000000000'] }, // 1     * 1e18
    ]

    describe('when rebalancing is needed (ETH surplus → BTC & DAI deficits)', () => {
      // Holdings: 0.8 BTC (8d), 20 WETH (18d), 5000 DAI (18d)
      // USD: BTC 48k, ETH 60k, DAI 5k => total 113k
      // Targets 50/30/20 => BTC 56.5k, ETH 33.9k, DAI 22.6k
      // Deltas: BTC -8.5k, ETH +26.1k, DAI -17.6k
      // Swaps:
      //  1) ETH -> BTC $8,500  => amountIn(WETH)=2.833333333333333333e18 => 2833333333333333333
      //                           minOut(WBTC)=14,095,832 (sat) after 50 bps slippage
      //  2) ETH -> DAI $17,600 => amountIn(WETH)=5.866666666666666666e18 => 5866666666666666666
      //                           minOut(DAI)=17,512 * 1e18
      const calls = buildErc20Calls(
        '80000000', // 0.8 * 1e8 WBTC
        '20000000000000000000', // 20 * 1e18 WETH
        '5000000000000000000000' // 5000 * 1e18 DAI
      )

      it('emits two swap intents with correct legs and slippage protections', async () => {
        const result = await runTask(taskDir, context, { inputs, calls, prices })
        expect(result.success).to.be.true
        expect(result.timestamp).to.be.equal(context.timestamp)

        const intents = result.intents as Swap[]
        expect(intents).to.have.lengthOf(2)

        // ---- First swap: ETH -> BTC ($8,500) ----
        const firstSwap = intents[0]
        expect(firstSwap.op).to.equal(OpType.Swap)
        expect(firstSwap.settler).to.equal(context.settlers[0].address)
        expect(firstSwap.user).to.equal(context.user)
        expect(firstSwap.sourceChain).to.equal(inputs.chainId)
        expect(firstSwap.destinationChain).to.equal(inputs.chainId)

        expect(firstSwap.tokensIn).to.have.lengthOf(1)
        expect(firstSwap.tokensIn[0].token).to.equal(WETH)
        expect(firstSwap.tokensIn[0].amount).to.equal('2833333333333333333') // 2.833333333333333333 WETH

        expect(firstSwap.tokensOut).to.have.lengthOf(1)
        expect(firstSwap.tokensOut[0].token).to.equal(WBTC)
        expect(firstSwap.tokensOut[0].minAmount).to.equal('14095832') // 14,095,832 sat (8d)
        expect(firstSwap.tokensOut[0].recipient).to.equal(context.user)

        // ---- Second swap: ETH -> DAI ($17,600) ----
        const secondSwap = intents[1]
        expect(secondSwap.op).to.equal(OpType.Swap)
        expect(secondSwap.settler).to.equal(context.settlers[0].address)
        expect(secondSwap.user).to.equal(context.user)
        expect(secondSwap.sourceChain).to.equal(inputs.chainId)
        expect(secondSwap.destinationChain).to.equal(inputs.chainId)

        expect(secondSwap.tokensIn).to.have.lengthOf(1)
        expect(secondSwap.tokensIn[0].token).to.equal(WETH)
        expect(secondSwap.tokensIn[0].amount).to.equal('5866666666666666666') // 5.866666666666666666 WETH

        expect(secondSwap.tokensOut).to.have.lengthOf(1)
        expect(secondSwap.tokensOut[0].token).to.equal(DAI)
        expect(secondSwap.tokensOut[0].minAmount).to.equal('17512000000000000000000') // 17,512 DAI (18d)
        expect(secondSwap.tokensOut[0].recipient).to.equal(context.user)

        expect(result.logs).to.have.lengthOf(1)
        expect(result.logs[0]).to.be.equal('[Info] Rebalance executed')
      })
    })

    describe('when the portfolio already matches target ratios', () => {
      // Choose a total USD (BigInt) that’s divisible for all tokens and prices.
      // With T = 1.2e21 (i.e., 1200 USD), targets are:
      //  - BTC 50% → 600 USD  → 0.01 BTC   → 1,000,000 sat
      //  - ETH 30% → 360 USD  → 0.12 ETH   → 120,000,000,000,000,000 wei
      //  - DAI 20% → 240 USD  → 240 DAI    → 240,000,000,000,000,000,000 wei
      const calls = buildErc20Calls(
        '1000000', // WBTC: 0.01 BTC (8 decimals)
        '120000000000000000', // WETH: 0.12 ETH (18 decimals)
        '240000000000000000000' // DAI:  240 DAI (18 decimals)
      )

      it('does not produce any intents', async () => {
        const result = await runTask(taskDir, context, { inputs: inputs, calls, prices })
        expect(result.success).to.be.true
        expect(result.intents).to.be.empty

        expect(result.logs).to.have.lengthOf(1)
        expect(result.logs[0]).to.be.equal('[Info] No rebalance needed (target ratios matched)')
      })
    })
  })

  describe('when total USD is zero (no balances)', () => {
    const calls = buildErc20Calls('0', '0', '0')

    it('does not produce any intents', async () => {
      const result = await runTask(taskDir, context, { inputs: inputs, calls: calls, prices: [] })
      expect(result.success).to.be.true
      expect(result.intents).to.be.empty

      expect(result.logs).to.have.lengthOf(1)
      expect(result.logs[0]).to.be.equal('[Info] No rebalance needed (total USD is zero)')
    })
  })
})
