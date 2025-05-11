import { Address, BigInt, environment, ListType, Token, USD } from '@mimicprotocol/lib-ts'
import { MimicRebalancerSettings } from "./types/MimicRebalancerSettings";

const SETTINGS_CONTRACT_ADDRESS = Address.fromString("0x24095977aD973f35E87506b9a54fC25630A4C0A4")
const CHAIN_ID = 10; // Optimism // TODO: We should export an enum

export default function main(): void {
  const settings = new MimicRebalancerSettings(SETTINGS_CONTRACT_ADDRESS, CHAIN_ID)
  const signers = settings.getSigners();
  for (let i = 0; i < signers.length; i++) {
    const signer = signers[i];
    // TODO: Failed to convert to UTF-16: invalid utf-16: lone surrogate found with toString()
    console.log(`Signer: ${signer.toHexString()}`)
    const tokenAddresses = settings.getTokens(signer);

    const tokens: Token[] = [];
    const chainIdSet = new Set<u64>();

    for (let j = 0; j < tokenAddresses.length; j++) {
      const tokenAddress = tokenAddresses[j];
      console.log(`Token: ${tokenAddress.toHexString()}`)
      const chainIds = settings.getChainIds(signer, tokenAddress);

      for (let k = 0; k < chainIds.length; k++) {
        const chainId = chainIds[k].toU64();
        console.log(`Chain Id: ${chainId.toString()}`)

        // TODO
        // I shouldn't have to send the symbol and token
        // I should be able to use it with an address and a bigint
        // toString() fails
        tokens.push(new Token(
          '',
          tokenAddress.toHexString(),
          chainId,
          0
        ));

        // Track unique chain IDs
        chainIdSet.add(chainId);
      }
    }

    const chainIds = chainIdSet.values();

    console.log("Getting balances");

    // TODO: Should we return tokens with balance 0 if the user ask for them specifically?
    // TODO: Should the return type have the symbol and decimals?
    const tokensWithBalance = environment.getRelevantTokens(
      signer,
      chainIds,
      USD.zero(),
      tokens,
      ListType.AllowList,
    );

    for (let l = 0; l < tokensWithBalance.length; l++) {
      const token = tokensWithBalance[l];
      const usdValue = token.toUsd()
      console.log(`Checking token: ${token.symbol}-${token.token.chainId} with amount ${token.amount} (USD - ${usdValue})`)
      // Should we add a max USD to get relevant tokens
      if(usdValue < USD.fromStringDecimal("500")) {
        console.log("Create the intent");
      }

    }
  }
}
