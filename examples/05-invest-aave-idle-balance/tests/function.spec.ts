import { OpType, randomEvmAddress } from '@mimicprotocol/sdk'
import { CallOperation, Context, EvmCallQueryMock, runFunction, TokenPriceQueryMock } from '@mimicprotocol/test-ts'
import { expect } from 'chai'
import { Interface } from 'ethers'

import AavePool from '../abis/AavePool.json'
import AaveToken from '../abis/AaveToken.json'
import ERC20Abi from '../abis/ERC20.json'

const AavePoolInterface = new Interface(AavePool)
const AaveTokenInterface = new Interface(AaveToken)
const ERC20Interface = new Interface(ERC20Abi)

describe('Function', () => {
  const functionDir = './build'

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
      request: { token: { address: inputs.aToken, chainId: inputs.chainId } },
      response: ['1000000000000000000'], // 1 aOptUSDC = 1 USD
    },
    {
      request: { token: { address: underlyingToken, chainId: inputs.chainId } },
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
      const result = await runFunction(functionDir, context, { inputs, calls, prices })
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
      const result = await runFunction(functionDir, context, { inputs, calls, prices })
      expect(result.success).to.be.true
      expect(result.timestamp).to.be.equal(context.timestamp)

      expect(result.intents).to.have.lengthOf(1)
      const intent = result.intents[0]
      const op = intent.operations[0] as CallOperation

      expect(op.opType).to.be.equal(OpType.EvmCall)
      expect(intent.settler).to.be.equal(context.settlers?.[0].address)
      expect(op.user).to.be.equal(inputs.smartAccount)
      expect(op.chainId).to.be.equal(inputs.chainId)

      const expectedApproveData = ERC20Interface.encodeFunctionData('approve', [aavePool, balance])
      expect(op.calls[0].target).to.be.equal(underlyingToken)
      expect(op.calls[0].value).to.be.equal('0')
      expect(op.calls[0].data).to.be.equal(expectedApproveData)

      const expectedSupplyData = AavePoolInterface.encodeFunctionData('supply(address,uint256,address,uint16)', [
        underlyingToken,
        balance,
        inputs.smartAccount,
        0,
      ])
      expect(op.calls[1].target).to.be.equal(aavePool)
      expect(op.calls[1].value).to.be.equal('0')
      expect(op.calls[1].data).to.be.equal(expectedSupplyData)

      expect(result.logs).to.have.lengthOf(1)
      expect(result.logs[0]).to.be.equal('[Info] Underlying balance in USD: 11')
    })
  })
})
