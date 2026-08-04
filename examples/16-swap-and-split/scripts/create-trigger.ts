import { Chains, Client, createExecuteOnceTriggerConfig, EthersSigner } from '@mimicprotocol/sdk'
import { config } from 'dotenv'

// Load environment variables from .env file
config({ path: './scripts/.env' })

// TODO: Replace with your deployed function's CID
const FUNCTION_CID = 'YOUR_FUNCTION_CID_HERE'

// TODO: Customize inputs to match your function's input structure
// This template uses the example function's inputs: chainId, token, amount, recipient, maxFee
const inputs = {
  chainId: Chains.Optimism,
  token: '0x0b2c639c533813f4aa9d7837caf62653d097ff85', // USDC on Optimism
  amount: '1',
  recipient: '0x...', // TODO: Replace with your recipient address
  maxFee: '0.1',
}

async function main(): Promise<void> {
  const client = new Client({
    signer: EthersSigner.fromPrivateKey(process.env.PRIVATE_KEY!),
  })

  // Get the manifest for the function
  const manifest = await client.functions.getManifest(FUNCTION_CID)

  // TODO: Customize the version, description, and other parameters
  // - version: Function version (e.g., '1.0.0')
  // - description: Human-readable description for this trigger
  // - config: When to execute the function (cron schedule, delta, endDate)
  // - executionFeeLimit: Maximum fee for execution (use '0' for no limit)
  // - minValidations: Minimum number of validations required

  await client.triggers.signAndCreate({
    functionCid: FUNCTION_CID,
    manifest: manifest,
    input: inputs,
    version: '1.0.0', // TODO: Update to match your function version
    description: `Default Transfer - ${inputs.chainId}`,
    config: createExecuteOnceTriggerConfig(),
    executionFeeLimit: '0',
    minValidations: 1,
  })

  console.log(`Successfully created trigger`)
}

main().catch((error) => {
  console.error('Error creating trigger:', error)
  process.exit(1)
})
