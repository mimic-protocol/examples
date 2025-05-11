import { Address, BigInt, Bytes, EvmCallParam, EvmDecodeParam, environment } from '@mimicprotocol/lib-ts'

export class MimicRebalancerSettings {
  private address: Address
  private chainId: u64
  private timestamp: Date | null

  constructor(address: Address, chainId: u64, timestamp: Date | null = null) {
    this.address = address
    this.chainId = chainId
    this.timestamp = timestamp
  }

  DEFAULT_ADMIN_ROLE(): Bytes {
    const response = environment.contractCall(this.address, this.chainId, this.timestamp, '0xa217fddf' )
    const decodedResponse = environment.evmDecode(new EvmDecodeParam('bytes32', response))
    return Bytes.fromHexString(decodedResponse)
  }

  REGISTER_SIGNER_ROLE(): Bytes {
    const response = environment.contractCall(this.address, this.chainId, this.timestamp, '0xd30be439' )
    const decodedResponse = environment.evmDecode(new EvmDecodeParam('bytes32', response))
    return Bytes.fromHexString(decodedResponse)
  }

  defaultAdmin(): Address {
    const response = environment.contractCall(this.address, this.chainId, this.timestamp, '0x84ef8ffc' )
    const decodedResponse = environment.evmDecode(new EvmDecodeParam('address', response))
    return Address.fromString(decodedResponse)
  }

  defaultAdminDelay(): BigInt {
    const response = environment.contractCall(this.address, this.chainId, this.timestamp, '0xcc8463c8' )
    const decodedResponse = environment.evmDecode(new EvmDecodeParam('uint48', response))
    return BigInt.fromString(decodedResponse)
  }

  defaultAdminDelayIncreaseWait(): BigInt {
    const response = environment.contractCall(this.address, this.chainId, this.timestamp, '0x022d63fb' )
    const decodedResponse = environment.evmDecode(new EvmDecodeParam('uint48', response))
    return BigInt.fromString(decodedResponse)
  }

  getChainIds(signer: Address, tokenAddress: Address): BigInt[] {
    const response = environment.contractCall(this.address, this.chainId, this.timestamp, '0x1a8547fb' + environment.evmEncode([EvmCallParam.fromValue('address', signer), EvmCallParam.fromValue('address', tokenAddress)]))
    const decodedResponse = environment.evmDecode(new EvmDecodeParam('uint256[]', response))
    return decodedResponse === '' ? [] : decodedResponse.split(',').map<BigInt>(value => BigInt.fromString(value))
  }

  getRoleAdmin(role: Bytes): Bytes {
    const response = environment.contractCall(this.address, this.chainId, this.timestamp, '0x248a9ca3' + environment.evmEncode([EvmCallParam.fromValue('bytes32', role)]))
    const decodedResponse = environment.evmDecode(new EvmDecodeParam('bytes32', response))
    return Bytes.fromHexString(decodedResponse)
  }

  getSigners(): Address[] {
    const response = environment.contractCall(this.address, this.chainId, this.timestamp, '0x94cf795e' )
    const decodedResponse = environment.evmDecode(new EvmDecodeParam('address[]', response))
    return decodedResponse === '' ? [] : decodedResponse.split(',').map<Address>(value => Address.fromString(value))
  }

  getTokens(signer: Address): Address[] {
    const response = environment.contractCall(this.address, this.chainId, this.timestamp, '0x450efe21' + environment.evmEncode([EvmCallParam.fromValue('address', signer)]))
    const decodedResponse = environment.evmDecode(new EvmDecodeParam('address[]', response))
    return decodedResponse === '' ? [] : decodedResponse.split(',').map<Address>(value => Address.fromString(value))
  }

  hasRole(role: Bytes, account: Address): bool {
    const response = environment.contractCall(this.address, this.chainId, this.timestamp, '0x91d14854' + environment.evmEncode([EvmCallParam.fromValue('bytes32', role), EvmCallParam.fromValue('address', account)]))
    const decodedResponse = environment.evmDecode(new EvmDecodeParam('bool', response))
    return u8.parse(decodedResponse) as bool
  }

  isSigner(signer: Address): bool {
    const response = environment.contractCall(this.address, this.chainId, this.timestamp, '0x7df73e27' + environment.evmEncode([EvmCallParam.fromValue('address', signer)]))
    const decodedResponse = environment.evmDecode(new EvmDecodeParam('bool', response))
    return u8.parse(decodedResponse) as bool
  }

  owner(): Address {
    const response = environment.contractCall(this.address, this.chainId, this.timestamp, '0x8da5cb5b' )
    const decodedResponse = environment.evmDecode(new EvmDecodeParam('address', response))
    return Address.fromString(decodedResponse)
  }

  pendingDefaultAdmin(): unknown[] {
    const response = environment.contractCall(this.address, this.chainId, this.timestamp, '0xcf6eefb7' )
    const decodedResponse = environment.evmDecode(new EvmDecodeParam('address', response))
    return decodedResponse === '' ? [] : decodedResponse.split(',').map<unknown>(value => value)
  }

  pendingDefaultAdminDelay(): BigInt[] {
    const response = environment.contractCall(this.address, this.chainId, this.timestamp, '0xa1eda53c' )
    const decodedResponse = environment.evmDecode(new EvmDecodeParam('uint48', response))
    return decodedResponse === '' ? [] : decodedResponse.split(',').map<BigInt>(value => BigInt.fromString(value))
  }

  supportsInterface(interfaceId: Bytes): bool {
    const response = environment.contractCall(this.address, this.chainId, this.timestamp, '0x01ffc9a7' + environment.evmEncode([EvmCallParam.fromValue('bytes4', interfaceId)]))
    const decodedResponse = environment.evmDecode(new EvmDecodeParam('bool', response))
    return u8.parse(decodedResponse) as bool
  }

}