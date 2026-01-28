import { config } from 'dotenv'
config()

import { Chains, Client, EthersSigner, Sort, TriggerType } from '@mimicprotocol/sdk'
import { AbiCoder, Interface, keccak256, toUtf8Bytes } from 'ethers'
import { inc } from 'semver'

import SettlerAbi from './abis/Settler.json'

const SETTLER_IFACE = new Interface(SettlerAbi)
const INTENT_EXECUTED_TOPIC = SETTLER_IFACE.getEvent('IntentExecuted')!.topicHash
const BRIDGED_TOPIC = keccak256(toUtf8Bytes('Bridged USDC'))

const MIMIC_PROTOCOL_SETTLER = '0x609d831C0068844e11eF85a273c7F356212Fd6D1'

const USDT: Record<number, string> = {
  10: '0xfd086bc7cd5c481dcc9c85ebe478a1c0b69fcbb9', // Optimism
  8453: '0xfde4c96c8593536e31f229ea8f37b2ada2699bb2', // Base
  42161: '0x94b008aa00579c1307b0ef2c499ad98a8ce58e58', // Arbitrum
}

async function main(): Promise<void> {
  if (!process.env.PRIVATE_KEY) throw new Error('Missing PRIVATE_KEY in .env file')
  if (!process.env.INVEST_CID) throw new Error('Missing INVEST_CID in .env file')
  if (!process.env.SMART_ACCOUNT) throw new Error('Missing SMART_ACCOUNT in .env file')
  const { PRIVATE_KEY, INVEST_CID, SMART_ACCOUNT } = process.env

  // Create client with signer
  const signer = EthersSigner.fromPrivateKey(PRIVATE_KEY)
  const client = new Client({ signer })

  // Get function manifest from deployed function
  const manifest = await client.functions.getManifest(INVEST_CID)

  // Set user topic to filter events
  const USER_TOPIC = AbiCoder.defaultAbiCoder().encode(['address'], [SMART_ACCOUNT])

  // Increment trigger version
  const latestTrigger = await client.triggers.get({ functionCid: INVEST_CID, sort: Sort.desc, limit: 1 })
  const version = latestTrigger.length > 0 ? inc(latestTrigger[0].version.split('-')[0], 'patch') : '0.0.1'
  if (!version) throw new Error('Invalid trigger version')

  // Set trigger based on a blockchain event
  const config = {
    type: TriggerType.Event,
    contract: MIMIC_PROTOCOL_SETTLER,
    topics: [
      [INTENT_EXECUTED_TOPIC], // The event emitted by the Settler
      [USER_TOPIC], // Important: To prevent other users from triggering this function
      [BRIDGED_TOPIC], // Emitted by the bridge function
    ],
    delta: '1h',
    endDate: 0, // No end date
  }

  // Submit one function trigger per chain
  const chainIds = [Chains.Arbitrum, Chains.Base, Chains.Optimism]
  for (const chainId of chainIds) {
    const input = {
      chainId,
      smartAccount: SMART_ACCOUNT,
      feeToken: USDT[chainId],
      maxFee: '0.3',
    }

    const trigger = await client.triggers.signAndCreate({
      description: `Invest bridged amount in Aave (${chainId})`,
      functionCid: INVEST_CID,
      version: `${version}-${chainId}`,
      manifest,
      config: { ...config, chainId },
      input,
      executionFeeLimit: '0',
      minValidations: 1,
    })
    console.log(`Created config on chain ${chainId}: ${trigger.sig}`)
  }
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
