import { Chains, getTriggerPrefillUrl, TriggerType } from '@mimicprotocol/sdk'

// TODO: Replace with your deployed function's CID
const FUNCTION_CID = 'YOUR_FUNCTION_CID_HERE'

// TODO: Customize inputs to match your function's input structure
const inputs = {
  chainId: Chains.Optimism,
  token: '0x0b2c639c533813f4aa9d7837caf62653d097ff85', // USDC on Optimism
  amount: '1',
  recipient: '0x...',
  maxFee: '0.1',
}

// TODO: Customize the trigger configuration
const config = {
  type: TriggerType.Cron,
  schedule: '0 2 * * *', // every day at 2am
  delta: '2h',
  endDate: Date.now() + 7 * 24 * 60 * 60 * 1000, // one week from now
}

async function main(): Promise<void> {
  // TODO: Replace with your parameters
  const prefillUrl = getTriggerPrefillUrl({
    functionCid: FUNCTION_CID,
    input: inputs,
    config,
    description: 'Example trigger description',
    version: '1.0.1',
  })

  console.log(`Trigger prefill URL: ${prefillUrl}`)
}

main().catch((error) => {
  console.error('Error getting trigger prefill URL:', error)
  process.exit(1)
})
