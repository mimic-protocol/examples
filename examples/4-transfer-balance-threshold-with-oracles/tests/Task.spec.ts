import { ContractCall, runTask, Transfer } from '@mimicprotocol/test-ts'
import { expect } from 'chai'

describe('Task', () => {
  const taskDir = './'

  const context = {
    user: '0x756f45e3fa69347a9a973a725e3c98bc4db0b5a0',
    settlers: [{ address: '0xdcf1d9d12a0488dfb70a8696f44d6d3bc303963d', chainId: 10 }],
    timestamp: Date.now(),
  }

  const inputs = {
    chainId: 10, // Optimism
    token: '0x7f5c764cbc14f9669b88837ca1490cca17c31607', // USDC
    amount: '1000000', // 1 USDC
    recipient: '0xbce3248ede29116e4bd18416dcc2dfca668eeb84',
    fee: '100000', // 0.1 USDC
    thresholdUSD: 10, // 10 USD
  }

  const prices = [
    {
      token: inputs.token,
      chainId: inputs.chainId,
      usdPrice: '1000000000000000000', // 1 USD = 1 USDC
    },
  ]

  const buildCalls = (balance: string): ContractCall[] => [
    {
      to: inputs.token,
      chainId: inputs.chainId,
      data: '0x70a08231', // `balanceOf` fn selector
      output: balance,
      outputType: 'uint256',
    },
    {
      to: inputs.token,
      chainId: inputs.chainId,
      data: '0x313ce567', // `decimals` fn selector
      output: '6',
      outputType: 'uint8',
    },
  ]

  describe('when the balance is below the threshold', () => {
    const balance = '9000000' // 9 USDC
    const calls = buildCalls(balance)

    it('produces the expected intents', async () => {
      const intents = (await runTask(taskDir, context, { inputs, calls, prices })) as Transfer[]

      expect(intents).to.be.an('array').that.is.not.empty
      expect(intents).to.have.lengthOf(1)

      expect(intents[0].type).to.be.equal('transfer')
      expect(intents[0].settler).to.be.equal(context.settlers[0].address)
      expect(intents[0].user).to.be.equal(context.user)
      expect(intents[0].chainId).to.be.equal(inputs.chainId)
      expect(intents[0].maxFees.length).to.be.equal(1)
      expect(intents[0].maxFees[0].token).to.be.equal(inputs.token)
      expect(intents[0].maxFees[0].amount).to.be.equal(inputs.fee)

      expect(intents[0].transfers).to.have.lengthOf(1)
      expect(intents[0].transfers[0].token).to.be.equal(inputs.token)
      expect(intents[0].transfers[0].amount).to.be.equal(inputs.amount)
      expect(intents[0].transfers[0].recipient).to.be.equal(inputs.recipient)
    })
  })

  describe('when the balance is above the threshold', () => {
    const balance = '11000000' // 11 USDC
    const calls = buildCalls(balance)

    it('does not produce any intent', async () => {
      const intents = await runTask(taskDir, context, { inputs, calls, prices })

      expect(intents).to.be.an('array').that.is.empty
    })
  })
})
