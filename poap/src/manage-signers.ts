import { Address, BigInt } from '@mimicprotocol/lib-ts'

const tokens = {
  1: "0xblabla",
  137: "0xblabla"
}

export default function main(): void {
  // Function to get information about the event, chainId and decoded event
  // Events:
  //        - event RoleGranted(bytes32 indexed role, address indexed account, address indexed sender);
  //        - event RoleRevoked(bytes32 indexed role, address indexed account, address indexed sender);

  // Use the contract with the token balance to set the new signer for that chain
}
