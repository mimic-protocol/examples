import { EvmCallIntent, OpType } from '@mimicprotocol/sdk'
import { Context, ContractCallMock, GetPriceMock, runTask, Swap } from '@mimicprotocol/test-ts'
import { expect } from 'chai'

describe('Task', () => {
  const taskDir = './build'

  const context: Context = {
    user: '0x756f45e3fa69347a9a973a725e3c98bc4db0b5a0',
    settlers: [{ address: '0xdcf1d9d12a0488dfb70a8696f44d6d3bc303963d', chainId: 10 }],
    timestamp: Date.now(),
  }

  const inputs = {
    chainId: 10, // Optimism
    aToken: '0x625e7708f30ca75bfd92586e17077590c60eb4cd', // Aave Optimism USDC
    smartAccount: '0x756f45e3fa69347a9a973a725e3c98bc4db0b5a1',
    thresholdUSD: 10, // 10 USD
    maxFee: '0.1', // 0.1 USD
  }

  const underlyingToken = '0x7f5c764cbc14f9669b88837ca1490cca17c31607' // USDC
  const pool = '0x794a61358d6845594f94dc1db02a252b5b4814ad' // Aave Pool

  const prices: GetPriceMock[] = [
    {
      request: {
        token: inputs.aToken,
        chainId: inputs.chainId,
      },
      response: ['1000000000000000000'], // 1 USD = 1 aOptUSDC
    },
    {
      request: {
        token: underlyingToken,
        chainId: inputs.chainId,
      },
      response: ['1000000000000000000'], // 1 USD = 1 USDC
    },
  ]

  const buildCalls = (balance: string): ContractCallMock[] => [
    // aOptUSDC
    {
      request: {
        to: inputs.aToken,
        chainId: inputs.chainId,
        fnSelector: '0xb16a19de', // `UNDERLYING_ASSET_ADDRESS`
      },
      response: {
        value: underlyingToken,
        abiType: 'address',
      },
    },
    {
      request: {
        to: inputs.aToken,
        chainId: inputs.chainId,
        fnSelector: '0x7535d246', // `POOL`
      },
      response: {
        value: pool,
        abiType: 'address',
      },
    },
    {
      request: {
        to: inputs.aToken,
        chainId: inputs.chainId,
        fnSelector: '0x313ce567', // `decimals`
      },
      response: {
        value: '6',
        abiType: 'uint8',
      },
    },
    {
      request: {
        to: inputs.aToken,
        chainId: inputs.chainId,
        fnSelector: '0x95d89b41', // `symbol`
      },
      response: {
        value: 'aOptUSDC',
        abiType: 'string',
      },
    },
    // USDC
    {
      request: {
        to: underlyingToken,
        chainId: inputs.chainId,
        fnSelector: '0x70a08231', // `balanceOf`
        params: [
          {
            value: inputs.smartAccount,
            abiType: 'address',
          },
        ],
      },
      response: {
        value: balance,
        abiType: 'uint256',
      },
    },
    {
      request: {
        to: underlyingToken,
        chainId: inputs.chainId,
        fnSelector: '0x313ce567', // `decimals`
      },
      response: {
        value: '6',
        abiType: 'uint8',
      },
    },
    {
      request: {
        to: underlyingToken,
        chainId: inputs.chainId,
        fnSelector: '0x95d89b41', // `symbol`
      },
      response: {
        value: 'USDC',
        abiType: 'string',
      },
    },
  ]

  describe('when the balance is below the threshold', () => {
    const balance = '9000000' // 9 USDC
    const calls = buildCalls(balance)

    it('does not produce any intent', async () => {
      const result = await runTask(taskDir, context, { inputs, calls, prices })
      console.log(result.logs)
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
      // Approval
      expect(intents[0].calls[0].target).to.be.equal(underlyingToken)
      // Supply
      expect(intents[0].calls[1].target).to.be.equal(pool)

      expect(result.logs).to.have.lengthOf(1)
      expect(result.logs[0]).to.be.equal('[Info] Underlying balance in USD: 11')
    })
  })
})
