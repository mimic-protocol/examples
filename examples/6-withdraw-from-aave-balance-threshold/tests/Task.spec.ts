import { runTask } from '@mimicprotocol/test-ts'
import { expect } from 'chai'

describe('Task', () => {
  const taskDir = './'

  const context = {
    user: '0x756f45e3fa69347a9a973a725e3c98bc4db0b5a0',
    settler: '0xdcf1d9d12a0488dfb70a8696f44d6d3bc303963d',
    timestamp: Date.now().toString(),
  }

  const inputs = {
    chainId: 10, // Optimism
    aToken: '0x625e7708f30ca75bfd92586e17077590c60eb4cd', // Aave Optimism USDC
    slippage: 2, // 2%
    thresholdUSD: 10, // 10 USD
    recipient: '0xbce3248ede29116e4bd18416dcc2dfca668eeb84',
  }

  const underlyingToken = '0x7f5c764cbc14f9669b88837ca1490cca17c31607' // USDC

  const prices = [
    {
      token: inputs.aToken,
      chainId: inputs.chainId,
      usdPrice: '1000000000000000000', // 1 USD = 1 aOptUSDC
    },
    {
      token: underlyingToken,
      chainId: inputs.chainId,
      usdPrice: '1000000000000000000', // 1 USD = 1 USDC
    },
  ]

  const buildCalls = (recipientBalance: string, userBalance: string) => [
    // aOptUSDC
    {
      to: inputs.aToken,
      chainId: inputs.chainId,
      data: '0xb16a19de', // `UNDERLYING_ASSET_ADDRESS` fn selector
      output: underlyingToken,
      outputType: 'address',
    },
    {
      to: inputs.aToken,
      chainId: inputs.chainId,
      data: '0x70a08231', // `balanceOf` fn selector
      output: userBalance,
      outputType: 'uint256',
    },
    {
      to: inputs.aToken,
      chainId: inputs.chainId,
      data: '0x313ce567', // `decimals` fn selector
      output: '6',
      outputType: 'uint8',
    },
    {
      to: inputs.aToken,
      chainId: inputs.chainId,
      data: '0x95d89b41', // `symbol` fn selector
      output: 'aOptUSDC',
      outputType: 'string',
    },
    // USDC
    {
      to: underlyingToken,
      chainId: inputs.chainId,
      data: '0x70a08231', // `balanceOf` fn selector
      output: recipientBalance,
      outputType: 'uint256',
    },
    {
      to: underlyingToken,
      chainId: inputs.chainId,
      data: '0x313ce567', // `decimals` fn selector
      output: '6',
      outputType: 'uint8',
    },
    {
      to: underlyingToken,
      chainId: inputs.chainId,
      data: '0x95d89b41', // `symbol` fn selector
      output: 'USDC',
      outputType: 'string',
    },
  ]

  describe('when the recipient USDC balance is below the threshold', () => {
    const recipientBalance = '9000000' // 9 USDC

    describe('when the user aOptUSDC balance is enough', () => {
      // depositAmount = threshold * 2 - recipientBalance = 10 * 2 - 9 = 11 USD
      const userBalance = '11000000' // 11 aOptUSDC
      const calls = buildCalls(recipientBalance, userBalance)

      it('produces the expected intents', async () => {
        const intents = await runTask(taskDir, context, { inputs, calls, prices })

        expect(intents).to.be.an('array').that.is.not.empty
        expect(intents).to.have.lengthOf(1)

        expect(intents[0].type).to.be.equal('swap')
        expect(intents[0].settler).to.be.equal(context.settler)
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
      })
    })

    describe('when the user aOptUSDC balance is not enough', () => {
      const userBalance = '10999999' // 10.999999 aOptUSDC
      const calls = buildCalls(recipientBalance, userBalance)

      it('does not produce any intent', async () => {
        const intents = await runTask(taskDir, context, { inputs, calls, prices })

        expect(intents).to.be.an('array').that.is.empty
      })
    })
  })

  describe('when the recipient USDC balance is above the threshold', () => {
    const recipientBalance = '11000000' // 11 USDC
    const calls = buildCalls(recipientBalance, '0') // `userBalance` does not matter

    it('does not produce any intent', async () => {
      const intents = await runTask(taskDir, context, { inputs, calls, prices })

      expect(intents).to.be.an('array').that.is.empty
    })
  })
})
