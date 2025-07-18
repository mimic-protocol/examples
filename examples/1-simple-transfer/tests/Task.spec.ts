import { runTask } from '@mimicprotocol/test-ts'
import { expect } from 'chai'

describe('Task', () => {
  const taskDir = './'

  it('produces the expected intents', async () => {
    const context = {
      user: '0x756f45e3fa69347a9a973a725e3c98bc4db0b5a0',
      settler: '0xdcf1d9d12a0488dfb70a8696f44d6d3bc303963d',
      timestamp: Date.now().toString(),
    }

    const intents = await runTask(taskDir, context)

    expect(intents).to.be.an('array').that.is.not.empty
    expect(intents).to.have.lengthOf(1)

    expect(intents[0].type).to.be.equal('transfer')
    expect(intents[0].settler).to.be.equal(context.settler)
    expect(intents[0].user).to.be.equal(context.user)
    expect(intents[0].chainId).to.be.equal(10)
    expect(intents[0].feeToken).to.be.equal('0x7f5c764cbc14f9669b88837ca1490cca17c31607')
    expect(intents[0].feeAmount).to.be.equal('100000')

    expect(intents[0].transfers).to.have.lengthOf(1)
    expect(intents[0].transfers[0].token).to.be.equal('0x7f5c764cbc14f9669b88837ca1490cca17c31607')
    expect(intents[0].transfers[0].amount).to.be.equal('1000000')
    expect(intents[0].transfers[0].recipient).to.be.equal('0xbce3248ede29116e4bd18416dcc2dfca668eeb84')
  })
})
