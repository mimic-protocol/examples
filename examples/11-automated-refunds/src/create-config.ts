import { config } from 'dotenv'
config()

import { Client, EthersSigner, getNextCronDate, HOUR, randomEvmAddress, Sort, TriggerType } from '@mimicprotocol/sdk'
import { Wallet } from 'ethers'
import { inc } from 'semver'

/* eslint-disable @typescript-eslint/explicit-function-return-type */

async function main() {
  // Create client with signer
  if (!process.env.PRIVATE_KEY) throw new Error('Missing PRIVATE_KEY in .env file')
  const signer = EthersSigner.fromPrivateKey(process.env.PRIVATE_KEY)
  const client = new Client({ signer })

  // Get task manifest from deployed task
  if (!process.env.TASK_CID) throw new Error('Missing TASK_CID in .env file')
  const taskCid = process.env.TASK_CID
  const manifest = await client.tasks.getManifest(taskCid)

  // Increment config version
  const latestConfig = await client.configs.get({ taskCid, sort: Sort.desc, limit: 1 })
  const version = latestConfig.length ? inc(latestConfig[0].version, 'patch') : '0.0.1'
  if (!version) throw new Error('Invalid config version')

  // Get inputs and calculate trigger values
  const { chainId, token, amount, recipient, maxFee } = getRefundData()
  const schedule = '0 0 * * *' // At midnight UTC
  const deltaMs = HOUR * 1000
  const endDate = getNextCronDate(schedule).getTime() + deltaMs + 1 // 1 AM UTC

  // Submit the signed task config to Mimic Protocol for one-time execution
  await client.configs.signAndCreate({
    description: `Refund execution - ${Date.now()}`,
    taskCid,
    version,
    manifest,
    trigger: {
      type: TriggerType.Cron,
      schedule,
      delta: '1h',
      endDate,
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
