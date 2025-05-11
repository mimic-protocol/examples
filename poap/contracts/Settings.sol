// SPDX-License-Identifier: AGPL-3.0
pragma solidity 0.8.28;

import {AccessControlDefaultAdminRules} from '@openzeppelin/contracts/access/extensions/AccessControlDefaultAdminRules.sol';

contract MimicRebalancerSettings is AccessControlDefaultAdminRules {
    bytes32 public constant REGISTER_SIGNER_ROLE = keccak256("REGISTER_SIGNER_ROLE");

    address[] private signerList;

    // signer => list of token addresses
    mapping(address => address[]) private signerToTokens;

    // signer => token address => list of chain IDs
    mapping(address => mapping(address => uint256[])) private signerTokenToChainIds;

    constructor(address _initialDefaultAdmin) AccessControlDefaultAdminRules(0, _initialDefaultAdmin) {}

    function addSigner(address signer) external onlyRole(REGISTER_SIGNER_ROLE) {
        require(signerToTokens[signer].length == 0, "Signer already added");
        signerList.push(signer);
    }

    function addToken(address signer, address tokenAddress, uint256 chainId) external onlyRole(REGISTER_SIGNER_ROLE) {
        require(isSigner(signer), "Signer not registered");

        // If it's a new token for this signer, add to list
        if (signerTokenToChainIds[signer][tokenAddress].length == 0) {
            signerToTokens[signer].push(tokenAddress);
        }

        // Add chain ID only if it's not already there
        uint256[] storage chainIds = signerTokenToChainIds[signer][tokenAddress];
        for (uint i = 0; i < chainIds.length; i++) {
            if (chainIds[i] == chainId) return; // already exists
        }

        chainIds.push(chainId);
    }

    function removeToken(address signer, address tokenAddress, uint256 chainId) external onlyRole(REGISTER_SIGNER_ROLE) {
        uint256[] storage chainIds = signerTokenToChainIds[signer][tokenAddress];
        require(chainIds.length > 0, "Token not registered");

        // Remove the chainId
        for (uint i = 0; i < chainIds.length; i++) {
            if (chainIds[i] == chainId) {
                chainIds[i] = chainIds[chainIds.length - 1];
                chainIds.pop();
                break;
            }
        }

        // If no chainIds left, remove token
        if (chainIds.length == 0) {
            delete signerTokenToChainIds[signer][tokenAddress];

            address[] storage tokens = signerToTokens[signer];
            for (uint i = 0; i < tokens.length; i++) {
                if (tokens[i] == tokenAddress) {
                    tokens[i] = tokens[tokens.length - 1];
                    tokens.pop();
                    break;
                }
            }
        }
    }

    function removeSigner(address signer) external onlyRole(REGISTER_SIGNER_ROLE) {
        require(signerToTokens[signer].length > 0, "Signer not found");

        // Clear nested mappings
        address[] storage tokens = signerToTokens[signer];
        for (uint i = 0; i < tokens.length; i++) {
            delete signerTokenToChainIds[signer][tokens[i]];
        }

        delete signerToTokens[signer];

        for (uint i = 0; i < signerList.length; i++) {
            if (signerList[i] == signer) {
                signerList[i] = signerList[signerList.length - 1];
                signerList.pop();
                break;
            }
        }
    }

    function getSigners() external view returns (address[] memory) {
        return signerList;
    }

    function getTokens(address signer) external view returns (address[] memory) {
        return signerToTokens[signer];
    }

    function getChainIds(address signer, address tokenAddress) external view returns (uint256[] memory) {
        return signerTokenToChainIds[signer][tokenAddress];
    }

    function isSigner(address signer) public view returns (bool) {
        return signerToTokens[signer].length > 0;
    }
}
