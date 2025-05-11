import { Address, BigInt, Bytes, EvmCallParam, environment } from '@mimicprotocol/lib-ts'

export class RocketMinipoolManager {
  private address: Address
  private chainId: u64
  private timestamp: Date | null

  constructor(address: Address, chainId: u64, timestamp: Date | null = null) {
    this.address = address
    this.chainId = chainId
    this.timestamp = timestamp
  }

  getActiveMinipoolCount(): BigInt {
    const result = environment.contractCall(this.address, this.chainId, this.timestamp, '0xce9b79ad' )
    return BigInt.fromString(result)
  }

  getFinalisedMinipoolCount(): BigInt {
    const result = environment.contractCall(this.address, this.chainId, this.timestamp, '0xd1ea6ce0' )
    return BigInt.fromString(result)
  }

  getMinipoolAt(_index: BigInt): Address {
    const result = environment.contractCall(this.address, this.chainId, this.timestamp, '0xeff7319f' + environment.evmEncode([EvmCallParam.fromValue('uint256', _index.toBytes())]))
    return Address.fromString(result)
  }

  getMinipoolByPubkey(_pubkey: Bytes): Address {
    const result = environment.contractCall(this.address, this.chainId, this.timestamp, '0xcf6a4763' + environment.evmEncode([EvmCallParam.fromValue('bytes', _pubkey)]))
    return Address.fromString(result)
  }

  getMinipoolBytecode(): Bytes {
    const result = environment.contractCall(this.address, this.chainId, this.timestamp, '0xf85b6943' )
    return Bytes.fromHexString(result)
  }

  getMinipoolCount(): BigInt {
    const result = environment.contractCall(this.address, this.chainId, this.timestamp, '0xae4d0bed' )
    return BigInt.fromString(result)
  }

  getMinipoolCountPerStatus(offset: BigInt, limit: BigInt): BigInt[] {
    const result = environment.contractCall(this.address, this.chainId, this.timestamp, '0x3b5ecefa' + environment.evmEncode([EvmCallParam.fromValue('uint256', offset.toBytes()), EvmCallParam.fromValue('uint256', limit.toBytes())]))
    return result === '' ? [] : result.split(',').map(value => BigInt.fromString(value))
  }

  getMinipoolDestroyed(_minipoolAddress: Address): bool {
    const result = environment.contractCall(this.address, this.chainId, this.timestamp, '0xa757987a' + environment.evmEncode([EvmCallParam.fromValue('address', _minipoolAddress)]))
    return bool.parse(result)
  }

  getMinipoolExists(_minipoolAddress: Address): bool {
    const result = environment.contractCall(this.address, this.chainId, this.timestamp, '0x606bb62e' + environment.evmEncode([EvmCallParam.fromValue('address', _minipoolAddress)]))
    return bool.parse(result)
  }

  getMinipoolPubkey(_minipoolAddress: Address): Bytes {
    const result = environment.contractCall(this.address, this.chainId, this.timestamp, '0x3eb535e9' + environment.evmEncode([EvmCallParam.fromValue('address', _minipoolAddress)]))
    return Bytes.fromHexString(result)
  }

  getMinipoolWithdrawalCredentials(_minipoolAddress: Address): Bytes {
    const result = environment.contractCall(this.address, this.chainId, this.timestamp, '0x2cb76c37' + environment.evmEncode([EvmCallParam.fromValue('address', _minipoolAddress)]))
    return Bytes.fromHexString(result)
  }

  getNodeActiveMinipoolCount(_nodeAddress: Address): BigInt {
    const result = environment.contractCall(this.address, this.chainId, this.timestamp, '0x1844ec01' + environment.evmEncode([EvmCallParam.fromValue('address', _nodeAddress)]))
    return BigInt.fromString(result)
  }

  getNodeFinalisedMinipoolCount(_nodeAddress: Address): BigInt {
    const result = environment.contractCall(this.address, this.chainId, this.timestamp, '0xb88a89f7' + environment.evmEncode([EvmCallParam.fromValue('address', _nodeAddress)]))
    return BigInt.fromString(result)
  }

  getNodeMinipoolAt(_nodeAddress: Address, _index: BigInt): Address {
    const result = environment.contractCall(this.address, this.chainId, this.timestamp, '0x8b300029' + environment.evmEncode([EvmCallParam.fromValue('address', _nodeAddress), EvmCallParam.fromValue('uint256', _index.toBytes())]))
    return Address.fromString(result)
  }

  getNodeMinipoolCount(_nodeAddress: Address): BigInt {
    const result = environment.contractCall(this.address, this.chainId, this.timestamp, '0x1ce9ec33' + environment.evmEncode([EvmCallParam.fromValue('address', _nodeAddress)]))
    return BigInt.fromString(result)
  }

  getNodeStakingMinipoolCount(_nodeAddress: Address): BigInt {
    const result = environment.contractCall(this.address, this.chainId, this.timestamp, '0x57b4ef6b' + environment.evmEncode([EvmCallParam.fromValue('address', _nodeAddress)]))
    return BigInt.fromString(result)
  }

  getNodeValidatingMinipoolAt(_nodeAddress: Address, _index: BigInt): Address {
    const result = environment.contractCall(this.address, this.chainId, this.timestamp, '0x9da0700f' + environment.evmEncode([EvmCallParam.fromValue('address', _nodeAddress), EvmCallParam.fromValue('uint256', _index.toBytes())]))
    return Address.fromString(result)
  }

  getNodeValidatingMinipoolCount(_nodeAddress: Address): BigInt {
    const result = environment.contractCall(this.address, this.chainId, this.timestamp, '0xf90267c4' + environment.evmEncode([EvmCallParam.fromValue('address', _nodeAddress)]))
    return BigInt.fromString(result)
  }

  getPrelaunchMinipools(offset: BigInt, limit: BigInt): Address[] {
    const result = environment.contractCall(this.address, this.chainId, this.timestamp, '0x5dfef965' + environment.evmEncode([EvmCallParam.fromValue('uint256', offset.toBytes()), EvmCallParam.fromValue('uint256', limit.toBytes())]))
    return result === '' ? [] : result.split(',').map(value => Address.fromString(value))
  }

  getStakingMinipoolCount(): BigInt {
    const result = environment.contractCall(this.address, this.chainId, this.timestamp, '0x67bca235' )
    return BigInt.fromString(result)
  }

  version(): u8 {
    const result = environment.contractCall(this.address, this.chainId, this.timestamp, '0x54fd4d50' )
    return u8.parse(result)
  }

}