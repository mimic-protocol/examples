import { OpType, randomEvmAddress } from '@mimicprotocol/sdk'
import { Context, EvmCallQueryMock, runTask, Swap, TokenPriceQueryMock } from '@mimicprotocol/test-ts'
import { expect } from 'chai'
import { Interface } from 'ethers'

import AaveToken from '../abis/AaveToken.json'
import ERC20Abi from '../abis/ERC20.json'

const AaveTokenInterface = new Interface(AaveToken)
const ERC20Interface = new Interface(ERC20Abi)

describe('Task', () => {
  const taskDir = './build'

  const context: Context = {
    user: randomEvmAddress(),
    settlers: [{ address: randomEvmAddress(), chainId: 10 }],
    timestamp: Date.now(),
  }

  const inputs = {
    chainId: 10, // Optimism
    aToken: randomEvmAddress(), // Aave Optimism USDC
    slippageBps: 200, // 2%
    thresholdUsd: '10', // 10 USD
    recipient: randomEvmAddress(),
  }

  const underlyingToken = randomEvmAddress() // USDC

  const prices: TokenPriceQueryMock[] = [
    {
      request: { token: inputs.aToken, chainId: inputs.chainId },
      response: ['1000000000000000000'], // 1 aOptUSDC = 1 USD
    },
    {
      request: { token: underlyingToken, chainId: inputs.chainId },
      response: ['1000000000000000000'], // 1 USDC = 1 USD
    },
  ]

  const buildCalls = (recipientBalance: string, userBalance: string): EvmCallQueryMock[] => [
    // aOptUSDC
    {
      request: {
        to: inputs.aToken,
        chainId: inputs.chainId,
        fnSelector: AaveTokenInterface.getFunction('UNDERLYING_ASSET_ADDRESS')!.selector,
      },
      response: { value: underlyingToken, abiType: 'address' },
    },
    {
      request: {
        to: inputs.aToken,
        chainId: inputs.chainId,
        fnSelector: ERC20Interface.getFunction('balanceOf')!.selector,
        params: [{ value: context.user!, abiType: 'address' }],
      },
      response: { value: userBalance, abiType: 'uint256' },
    },
    {
      request: {
        to: inputs.aToken,
        chainId: inputs.chainId,
        fnSelector: ERC20Interface.getFunction('decimals')!.selector,
      },
      response: { value: '6', abiType: 'uint8' },
    },
    {
      request: {
        to: inputs.aToken,
        chainId: inputs.chainId,
        fnSelector: ERC20Interface.getFunction('symbol')!.selector,
      },
      response: { value: 'aOptUSDC', abiType: 'string' },
    },
    // USDC
    {
      request: {
        to: underlyingToken,
        chainId: inputs.chainId,
        fnSelector: ERC20Interface.getFunction('balanceOf')!.selector,
        params: [{ value: inputs.recipient, abiType: 'address' }],
      },
      response: { value: recipientBalance, abiType: 'uint256' },
    },
    {
      request: {
        to: underlyingToken,
        chainId: inputs.chainId,
        fnSelector: ERC20Interface.getFunction('decimals')!.selector,
      },
      response: { value: '6', abiType: 'uint8' },
    },
    {
      request: {
        to: underlyingToken,
        chainId: inputs.chainId,
        fnSelector: ERC20Interface.getFunction('symbol')!.selector,
      },
      response: { value: 'USDC', abiType: 'string' },
    },
  ]

  describe('when the recipient USDC balance is below the threshold', () => {
    const recipientBalance = '9000000' // 9 USDC

    describe('when the user aOptUSDC balance is enough', () => {
      // depositAmount = threshold * 2 - recipientBalance = 10 * 2 - 9 = 11 USD
      const userBalance = '11000000' // 11 aOptUSDC
      const calls = buildCalls(recipientBalance, userBalance)

      it('produces the expected intents', async () => {
        const result = await runTask(taskDir, context, { inputs, calls, prices })
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
        expect(intents[0].tokensIn[0].token).to.be.equal(inputs.aToken)
        expect(intents[0].tokensIn[0].amount).to.be.equal(userBalance)

        expect(intents[0].tokensOut).to.have.lengthOf(1)
        expect(intents[0].tokensOut[0].token).to.be.equal(underlyingToken)
        expect(intents[0].tokensOut[0].minAmount).to.be.equal('10780000') // balance_in_usdc * (1 - slippage) = 11 * 0.98 = 10.78
        expect(intents[0].tokensOut[0].recipient).to.be.equal(inputs.recipient)

        expect(result.logs).to.have.lengthOf(2)
        expect(result.logs[0]).to.be.equal('[Info] Recipient underlying balance in USD: 9')
        expect(result.logs[1]).to.be.equal('[Info] Min amount out: 10.78 USDC')
      })
    })

    describe('when the user aOptUSDC balance is not enough', () => {
      const userBalance = '10999999' // 10.999999 aOptUSDC
      const calls = buildCalls(recipientBalance, userBalance)

      it('does not produce any intent', async () => {
        const result = await runTask(taskDir, context, { inputs, calls, prices })
        expect(result.success).to.be.true
        expect(result.intents).to.be.empty

        expect(result.logs).to.have.lengthOf(2)
        expect(result.logs[0]).to.be.equal('[Info] Recipient underlying balance in USD: 9')
        expect(result.logs[1]).to.be.equal('[Info] Sender balance not enough')
      })
    })
  })

  describe('when the recipient USDC balance is above the threshold', () => {
    const recipientBalance = '11000000' // 11 USDC
    const calls = buildCalls(recipientBalance, '0') // `userBalance` does not matter

    it('does not produce any intent', async () => {
      const result = await runTask(taskDir, context, { inputs, calls, prices })
      expect(result.success).to.be.true
      expect(result.intents).to.be.empty

      expect(result.logs).to.have.lengthOf(2)
      expect(result.logs[0]).to.be.equal('[Info] Recipient underlying balance in USD: 11')
      expect(result.logs[1]).to.be.equal('[Info] Recipient threshold not met')
    })
  })
})
