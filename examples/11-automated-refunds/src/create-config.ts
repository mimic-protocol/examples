import { config } from 'dotenv'
config()

import { Client, EthersSigner, randomEvmAddress, TriggerType } from '@mimicprotocol/sdk'
import { Wallet } from 'ethers'

/* eslint-disable @typescript-eslint/explicit-function-return-type */

async function main() {
  // Create client with signer
  if (!process.env.PRIVATE_KEY) throw new Error('Missing PRIVATE_KEY in .env file')
  const signer = EthersSigner.fromPrivateKey(process.env.PRIVATE_KEY)
  const client = new Client({ signer })

  // Get task manifest from deployed task
  const taskCid = 'QmPzY1KpVsYdT54Qm1ZHSinZaiM7gJKUjKyQVpjSGSKsMT' // Task must be deployed first
  const manifest = await client.tasks.getManifest(taskCid)

  // Submit the signed task config to Mimic Protocol
  const { chainId, token, amount, recipient, maxFee } = getRefundData()
  await client.configs.signAndCreate({
    description: `Refund execution - ${Date.now()}`,
    taskCid,
    version: '1.0.0',
    manifest,
    trigger: {
      type: TriggerType.Cron,
      schedule: '0 0 * * *', // Everyday at midnight
      delta: '1h',
      endDate: 0,
    },
    input: { chainId, token, amount, recipient, maxFee },
    executionFeeLimit: '0',
    minValidations: 1,
    signer: new Wallet(process.env.PRIVATE_KEY).address,
  })
}

function getRefundData() {
  // TODO: Fetch the refund info from an external service
  return {
    chainId: 8453,
    token: randomEvmAddress(),
    amount: '100',
    recipient: randomEvmAddress(),
    maxFee: '0.3',
  }
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
