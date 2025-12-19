import { EvmCallIntent, OpType, randomEvmAddress } from '@mimicprotocol/sdk'
import { Context, EvmCallQueryMock, runTask, TokenPriceQueryMock } from '@mimicprotocol/test-ts'
import { expect } from 'chai'
import { Interface } from 'ethers'

import AavePool from '../abis/AavePool.json'
import AaveToken from '../abis/AaveToken.json'
import ERC20Abi from '../abis/ERC20.json'

const AavePoolInterface = new Interface(AavePool)
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
    smartAccount: randomEvmAddress(),
    thresholdUsd: '10.5', // 10.5 USD
    maxFeeUsd: '0.1', // 0.1 USD
  }

  const underlyingToken = randomEvmAddress() // USDC
  const aavePool = randomEvmAddress()

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

  const buildCalls = (balance: string): EvmCallQueryMock[] => [
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
        fnSelector: AaveTokenInterface.getFunction('POOL')!.selector,
      },
      response: { value: aavePool, abiType: 'address' },
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
        params: [{ value: inputs.smartAccount, abiType: 'address' }],
      },
      response: { value: balance, abiType: 'uint256' },
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

  describe('when the balance is below the threshold', () => {
    const balance = '9000000' // 9 USDC
    const calls = buildCalls(balance)

    it('does not produce any intent', async () => {
      const result = await runTask(taskDir, context, { inputs, calls, prices })
      expect(result.success).to.be.true
      expect(result.intents).to.be.empty

      expect(result.logs).to.have.lengthOf(2)
      expect(result.logs[0]).to.be.equal('[Info] Underlying balance in USD: 9')
      expect(result.logs[1]).to.be.equal('[Info] Threshold not met')
    })
  })

  describe('when the balance is above the threshold', () => {
    const balance = '11000000' // 11 USDC
    const calls = buildCalls(balance)

    it('produces the expected intents', async () => {
      const result = await runTask(taskDir, context, { inputs, calls, prices })
      expect(result.success).to.be.true
      expect(result.timestamp).to.be.equal(context.timestamp)

      const intents = result.intents as EvmCallIntent[]
      expect(intents).to.have.lengthOf(1)

      expect(intents[0].op).to.be.equal(OpType.EvmCall)
      expect(intents[0].settler).to.be.equal(context.settlers?.[0].address)
      expect(intents[0].user).to.be.equal(inputs.smartAccount)
      expect(intents[0].chainId).to.be.equal(inputs.chainId)

      const expectedApproveData = ERC20Interface.encodeFunctionData('approve', [aavePool, balance])
      expect(intents[0].calls[0].target).to.be.equal(underlyingToken)
      expect(intents[0].calls[0].value).to.be.equal('0')
      expect(intents[0].calls[0].data).to.be.equal(expectedApproveData)

      const expectedSupplyData = AavePoolInterface.encodeFunctionData('supply(address,uint256,address,uint16)', [
        underlyingToken,
        balance,
        inputs.smartAccount,
        0,
      ])
      expect(intents[0].calls[1].target).to.be.equal(aavePool)
      expect(intents[0].calls[1].value).to.be.equal('0')
      expect(intents[0].calls[1].data).to.be.equal(expectedSupplyData)

      expect(result.logs).to.have.lengthOf(1)
      expect(result.logs[0]).to.be.equal('[Info] Underlying balance in USD: 11')
    })
  })
})
