import { Chains, randomEvmAddress } from '@mimicprotocol/sdk'
import { runFunction } from '@mimicprotocol/test-ts'

// TODO: Replace with your function's directory
const FUNCTION_DIR = './build'
const ORACLE_URL = 'https://api-protocol.mimic.fi/oracle'

const chainId = Chains.Optimism

const context = {
  user: randomEvmAddress(),
  settlers: [{ address: randomEvmAddress(), chainId }],
  timestamp: Date.now(),
}

// TODO: Customize inputs to match your function's input structure
const inputs = {
  chainId,
  token: '0x0b2c639c533813f4aa9d7837caf62653d097ff85', // USDC on Optimism
  amount: '1',
  recipient: context.user,
  maxFee: '0.1',
}

async function main(): Promise<void> {
  const result = await runFunction(FUNCTION_DIR, context, { inputs }, ORACLE_URL)
  console.log(JSON.stringify(result, null, 2))
}

main().catch((error) => {
  console.error('Error running function:', error)
  process.exit(1)
})
