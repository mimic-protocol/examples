import { Address } from '@mimicprotocol/lib-ts'

declare namespace input {
  const chainId: i32
  var usdFeeAmount: string | null
  var smartAccount: string | null
}

// The class name is intentionally lowercase and plural to resemble a namespace when used in a task
export class inputs {
  static get chainId(): i32 {
    return input.chainId
  }

  static get usdFeeAmount(): string {
    return input.usdFeeAmount!
  }

  static get smartAccount(): Address {
    return Address.fromString(input.smartAccount!)
  }
}