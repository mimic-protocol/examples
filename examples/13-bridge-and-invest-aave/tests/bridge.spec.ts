import { Chains, fp, OpType, randomEvmAddress } from '@mimicprotocol/sdk'
import { Context, EvmCallQueryMock, Inputs, runFunction, Swap } from '@mimicprotocol/test-ts'
import { expect } from 'chai'
import { AbiCoder, Interface, keccak256, toUtf8Bytes } from 'ethers'

import ERC20Abi from '../src/abis/ERC20.json'

const ERC20Interface = new Interface(ERC20Abi)

describe('Bridge', () => {
  const functionDir = './build/bridge'

  const sourceChain = Chains.Arbitrum
  const destinationChain = Chains.Optimism
  const sourceUsdc = '0xaf88d065e77c8cc2239327c5edb3a432268e5831'
  const destinationUsdc = '0x0b2c639c533813f4aa9d7837caf62653d097ff85'
  const decimals = 6
  const settler = randomEvmAddress()

  const context: Context = {
    user: randomEvmAddress(),
    settlers: [
      { address: settler, chainId: sourceChain },
      { address: settler, chainId: destinationChain },
    ],
    timestamp: Date.now(),
  }

  const inputs = {
    sourceChain,
    destinationChain,
    smartAccount: randomEvmAddress(),
    amount: '10000', // 10,000 USDC
    minAmountOut: '9990', // 9,990 USDC
    feeToken: randomEvmAddress(), // On destination chain
    maxFee: '0.5', // 0.5 feeToken
  }

  const calls: EvmCallQueryMock[] = [
    {
      request: { to: sourceUsdc, chainId: sourceChain, fnSelector: ERC20Interface.getFunction('decimals')!.selector },
      response: { value: decimals.toString(), abiType: 'uint8' },
    },
    {
      request: {
        to: destinationUsdc,
        chainId: destinationChain,
        fnSelector: ERC20Interface.getFunction('decimals')!.selector,
      },
      response: { value: decimals.toString(), abiType: 'uint8' },
    },
    {
      request: {
        to: inputs.feeToken,
        chainId: destinationChain,
        fnSelector: ERC20Interface.getFunction('decimals')!.selector,
      },
      response: { value: decimals.toString(), abiType: 'uint8' },
    },
  ]

  const itThrowsAnError = (inputs: Inputs, error: string): void => {
    it('throws an error', async () => {
      const result = await runFunction(functionDir, context, { inputs, calls })
      expect(result.success).to.be.false
      expect(result.intents).to.have.lengthOf(0)

      expect(result.logs).to.have.lengthOf(1)
      expect(result.logs[0]).to.include(error)
    })
  }

  describe('when the chains are supported', () => {
    describe('when the chains are different', () => {
      it('produces the expected intents', async () => {
        const result = await runFunction(functionDir, context, { inputs, calls })
        expect(result.success).to.be.true
        expect(result.timestamp).to.be.equal(context.timestamp)

        const intents = result.intents as Swap[]
        expect(intents).to.have.lengthOf(1)

        expect(intents[0].op).to.be.equal(OpType.Swap)
        expect(intents[0].settler).to.be.equal(context.settlers?.[0].address)
        expect(intents[0].user).to.be.equal(inputs.smartAccount)
        expect(intents[0].sourceChain).to.be.equal(sourceChain)
        expect(intents[0].destinationChain).to.be.equal(destinationChain)

        const amount = fp(inputs.amount, decimals).toString()
        expect(intents[0].tokensIn).to.have.lengthOf(1)
        expect(intents[0].tokensIn[0].token).to.be.equal(sourceUsdc)
        expect(intents[0].tokensIn[0].amount).to.be.equal(amount)

        const minAmountOut = fp(inputs.minAmountOut, decimals).toString()
        expect(intents[0].tokensOut).to.have.lengthOf(1)
        expect(intents[0].tokensOut[0].token).to.be.equal(destinationUsdc)
        expect(intents[0].tokensOut[0].minAmount).to.be.equal(minAmountOut)
        expect(intents[0].tokensOut[0].recipient).to.be.equal(inputs.smartAccount)

        expect(intents[0].maxFees).to.have.lengthOf(1)
        expect(intents[0].maxFees[0].token).to.be.equal(inputs.feeToken)
        expect(intents[0].maxFees[0].amount).to.be.equal(fp(inputs.maxFee, decimals).toString())

        expect(intents[0].events).to.have.lengthOf(1)

        const topic = keccak256(toUtf8Bytes('Bridged USDC'))
        expect(intents[0].events[0].topic).to.be.equal(topic)

        const data = AbiCoder.defaultAbiCoder().encode(['address'], [destinationUsdc])
        expect(intents[0].events[0].data).to.be.equal(data)
      })
    })

    describe('when the chains are the same', () => {
      const inputsSameChain = { ...inputs, destinationChain: inputs.sourceChain }

      itThrowsAnError(inputsSameChain, 'Single-chain swap not supported')
    })
  })

  describe('when the chains are not supported', () => {
    const inputsUnsupportedChain = { ...inputs, destinationChain: Chains.Mainnet }

    itThrowsAnError(inputsUnsupportedChain, 'Invalid chain')
  })
})
