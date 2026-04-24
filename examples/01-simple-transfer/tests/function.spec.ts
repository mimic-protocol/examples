import { OpType } from '@mimicprotocol/sdk'
import { Context, runFunction, TransferOperation } from '@mimicprotocol/test-ts'
import { expect } from 'chai'

describe('Function', () => {
  const functionDir = './build'

  const context: Context = {
    user: '0x756f45e3fa69347a9a973a725e3c98bc4db0b5a0',
    settlers: [{ address: '0xdcf1d9d12a0488dfb70a8696f44d6d3bc303963d', chainId: 10 }],
    timestamp: Date.now(),
  }

  it('produces the expected intents', async () => {
    const result = await runFunction(functionDir, context)
    expect(result.success).to.be.true
    expect(result.timestamp).to.be.equal(context.timestamp)

    expect(result.intents).to.have.lengthOf(1)
    const intent = result.intents[0]
    const op = intent.operations[0] as TransferOperation

    expect(op.opType).to.be.equal(OpType.Transfer)
    expect(intent.settler).to.be.equal(context.settlers?.[0].address)
    expect(op.user).to.be.equal(context.user)
    expect(op.chainId).to.be.equal(10)
    expect(intent.maxFees).to.have.lengthOf(1)
    expect(intent.maxFees[0].token).to.be.equal('0x0b2c639c533813f4aa9d7837caf62653d097ff85')
    expect(intent.maxFees[0].amount).to.be.equal('1000000')

    expect(op.transfers).to.have.lengthOf(1)
    expect(op.transfers[0].token).to.be.equal('0x0b2c639c533813f4aa9d7837caf62653d097ff85')
    expect(op.transfers[0].amount).to.be.equal('1000000')
    expect(op.transfers[0].recipient).to.be.equal('0xbce3248ede29116e4bd18416dcc2dfca668eeb84')
  })
})
