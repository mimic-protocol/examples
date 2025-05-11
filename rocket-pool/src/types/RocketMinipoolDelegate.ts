import { Address, BigInt, EvmCallParam, environment } from '@mimicprotocol/lib-ts'

export class RocketMinipoolDelegate {
  private address: Address
  private chainId: u64
  private timestamp: Date | null

  constructor(address: Address, chainId: u64, timestamp: Date | null = null) {
    this.address = address
    this.chainId = chainId
    this.timestamp = timestamp
  }

  calculateNodeShare(_balance: BigInt): BigInt {
    const result = environment.contractCall(this.address, this.chainId, this.timestamp, '0x1a69d18f' + environment.evmEncode([EvmCallParam.fromValue('uint256', _balance.toBytes())]))
    return BigInt.fromString(result)
  }

  calculateUserShare(_balance: BigInt): BigInt {
    const result = environment.contractCall(this.address, this.chainId, this.timestamp, '0x19f18b1f' + environment.evmEncode([EvmCallParam.fromValue('uint256', _balance.toBytes())]))
    return BigInt.fromString(result)
  }

  canPromote(): bool {
    const result = environment.contractCall(this.address, this.chainId, this.timestamp, '0xc9c36b27' )
    return bool.parse(result)
  }

  canStake(): bool {
    const result = environment.contractCall(this.address, this.chainId, this.timestamp, '0x9ed27809' )
    return bool.parse(result)
  }

  getDepositType(): u8 {
    const result = environment.contractCall(this.address, this.chainId, this.timestamp, '0x5abd37e4' )
    return u8.parse(result)
  }

  getFinalised(): bool {
    const result = environment.contractCall(this.address, this.chainId, this.timestamp, '0xa129a5ee' )
    return bool.parse(result)
  }

  getNodeAddress(): Address {
    const result = environment.contractCall(this.address, this.chainId, this.timestamp, '0x70dabc9e' )
    return Address.fromString(result)
  }

  getNodeDepositAssigned(): bool {
    const result = environment.contractCall(this.address, this.chainId, this.timestamp, '0x69c089ea' )
    return bool.parse(result)
  }

  getNodeDepositBalance(): BigInt {
    const result = environment.contractCall(this.address, this.chainId, this.timestamp, '0x74ca6bf2' )
    return BigInt.fromString(result)
  }

  getNodeFee(): BigInt {
    const result = environment.contractCall(this.address, this.chainId, this.timestamp, '0xe7150134' )
    return BigInt.fromString(result)
  }

  getNodeRefundBalance(): BigInt {
    const result = environment.contractCall(this.address, this.chainId, this.timestamp, '0xfbc02c42' )
    return BigInt.fromString(result)
  }

  getNodeTopUpValue(): BigInt {
    const result = environment.contractCall(this.address, this.chainId, this.timestamp, '0xd2ceebd1' )
    return BigInt.fromString(result)
  }

  getPreLaunchValue(): BigInt {
    const result = environment.contractCall(this.address, this.chainId, this.timestamp, '0xd6047def' )
    return BigInt.fromString(result)
  }

  getPreMigrationBalance(): BigInt {
    const result = environment.contractCall(this.address, this.chainId, this.timestamp, '0x49b42321' )
    return BigInt.fromString(result)
  }

  getScrubVoted(_member: Address): bool {
    const result = environment.contractCall(this.address, this.chainId, this.timestamp, '0xd45dc628' + environment.evmEncode([EvmCallParam.fromValue('address', _member)]))
    return bool.parse(result)
  }

  getStatus(): u8 {
    const result = environment.contractCall(this.address, this.chainId, this.timestamp, '0x4e69d560' )
    return u8.parse(result)
  }

  getStatusBlock(): BigInt {
    const result = environment.contractCall(this.address, this.chainId, this.timestamp, '0xe67cd5b0' )
    return BigInt.fromString(result)
  }

  getStatusTime(): BigInt {
    const result = environment.contractCall(this.address, this.chainId, this.timestamp, '0x3e0a56b0' )
    return BigInt.fromString(result)
  }

  getTotalScrubVotes(): BigInt {
    const result = environment.contractCall(this.address, this.chainId, this.timestamp, '0x68f449b2' )
    return BigInt.fromString(result)
  }

  getUserDepositAssigned(): bool {
    const result = environment.contractCall(this.address, this.chainId, this.timestamp, '0xd91eda62' )
    return bool.parse(result)
  }

  getUserDepositAssignedTime(): BigInt {
    const result = environment.contractCall(this.address, this.chainId, this.timestamp, '0xa2940a90' )
    return BigInt.fromString(result)
  }

  getUserDepositBalance(): BigInt {
    const result = environment.contractCall(this.address, this.chainId, this.timestamp, '0xe7e04aba' )
    return BigInt.fromString(result)
  }

  getUserDistributed(): bool {
    const result = environment.contractCall(this.address, this.chainId, this.timestamp, '0x7bfaef7d' )
    return bool.parse(result)
  }

  getVacant(): bool {
    const result = environment.contractCall(this.address, this.chainId, this.timestamp, '0xbbe38fe1' )
    return bool.parse(result)
  }

  userDistributeAllowed(): bool {
    const result = environment.contractCall(this.address, this.chainId, this.timestamp, '0x23e4e3e4' )
    return bool.parse(result)
  }

  version(): u8 {
    const result = environment.contractCall(this.address, this.chainId, this.timestamp, '0x54fd4d50' )
    return u8.parse(result)
  }

}