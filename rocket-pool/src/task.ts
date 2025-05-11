import { Address, BigInt } from '@mimicprotocol/lib-ts'
import { RocketMinipoolManager } from "./types/RocketMinipoolManager";
import { RocketMinipoolDelegate } from "./types/RocketMinipoolDelegate";

// TODO: fromHexString returns bytes and it's not assignable to type address
const NODE_OPERATOR_ADDRESS = Address.fromHexString("0x8f9b2d028058ee734831fada4c41bfb1ea059ded")
// TODO: I don't think the '+' works
// i = i + BigInt.fromU64(1)

// const NODE_OPERATOR_ADDRESS = Address.fromString("0x5fed614d9a7200bce48927f9d62c9b6763622cc8")
const ROCKET_POOL_MANAGER_ADDRESS = Address.fromString("0x6293b8abc1f36afb22406be5f96d893072a8cf3a")
const CHAIN_ID = 1

export default function main(): void {
  const rocketPoolManager = new RocketMinipoolManager(ROCKET_POOL_MANAGER_ADDRESS, CHAIN_ID)

  const minipoolCount = rocketPoolManager.getNodeActiveMinipoolCount(NODE_OPERATOR_ADDRESS)

  for (let i = BigInt.fromU64(0); i < minipoolCount; i = i.plus(BigInt.fromU64(1))) {
    const minipoolAddress = rocketPoolManager.getMinipoolAt(i)
    console.log(minipoolAddress.toHexString());


    // Do something with the retrieved data
  }
}
