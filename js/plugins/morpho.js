/**
 * Morpho Vault Plugin
 * Fetches vault positions from Morpho across multiple chains
 */

import { VaultPlugin } from '../plugin-system.js';
import { getChainName } from '../utils.js';

export class MorphoVaultPlugin extends VaultPlugin {
    constructor() {
        super('Morpho', 'vault');
        this.apiUrl = 'https://api.morpho.org/graphql';
    }

    async fetchData(address) {
        const promises = this.getSupportedChains().map(chainId =>
            this.fetchUserVaults(address, chainId)
        );
        const results = await Promise.all(promises);
        return results.flat();
    }

    async fetchUserVaults(userAddress, chainId) {
        const positionsQuery = `
            query GetUserPositions($chainId: Int!, $userAddress: String!) {
                vaultPositions(
                    where: {
                        chainId_in: [$chainId]
                        shares_gte: 0
                        userAddress_in: [$userAddress]
                    }
                ) {
                    items {
                        id
                        assets
                        shares
                        vault {
                            id
                            address
                        }
                    }
                }
            }
        `;

        try {
            const positionsResponse = await fetch(this.apiUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    query: positionsQuery,
                    variables: { chainId, userAddress }
                })
            });

            const positionsData = await positionsResponse.json();

            if (positionsData.errors) {
                console.warn(`GraphQL errors for ${getChainName(chainId)}:`, positionsData.errors);
                return [];
            }

            const positions = positionsData.data?.vaultPositions?.items || [];

            if (positions.length === 0) {
                return [];
            }

            const vaultDetailsPromises = positions.map(position =>
                this.fetchVaultDetails(position.vault.address, chainId)
            );
            const vaultDetails = await Promise.all(vaultDetailsPromises);

            return positions
                .map((position, index) => {
                    const details = vaultDetails[index];
                    if (!details) return null;

                    const decimals = details.assetDecimals;
                    const rawAssets = parseFloat(position.assets);
                    const adjustedAssets = rawAssets / Math.pow(10, decimals);

                    return {
                        source: this.name,
                        chainId,
                        chainName: getChainName(chainId),
                        userAddress,
                        vaultAddress: position.vault.address,
                        vaultName: details.name,
                        vaultSymbol: details.symbol,
                        assetSymbol: details.assetSymbol,
                        assetAddress: details.assetAddress,
                        assetDecimals: decimals,
                        assetPriceUsd: details.assetPriceUsd,
                        balanceShares: position.shares,
                        balanceAssets: adjustedAssets,
                        balanceUsd: details.totalAssetsUsd ? (adjustedAssets * details.assetPriceUsd) : 0,
                        apy: details.apy,
                        netApy: details.netApy
                    };
                })
                .filter(item => item !== null && item.balanceAssets > 0);
        } catch (error) {
            console.error(`Error fetching Morpho vaults for ${userAddress} on ${getChainName(chainId)}:`, error);
            return [];
        }
    }

    async fetchVaultDetails(vaultAddress, chainId) {
        const vaultQuery = `
            query GetVaultDetails($vaultAddress: String!, $chainId: Int!) {
                vaultByAddress(address: $vaultAddress, chainId: $chainId) {
                    address
                    name
                    symbol
                    state {
                        totalAssets
                        totalAssetsUsd
                        apy
                        netApy
                    }
                    asset {
                        address
                        symbol
                        decimals
                        priceUsd
                    }
                }
            }
        `;

        try {
            const response = await fetch(this.apiUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    query: vaultQuery,
                    variables: { vaultAddress, chainId }
                })
            });

            const data = await response.json();

            if (data.errors) {
                console.warn(`Could not fetch details for vault ${vaultAddress.slice(0, 8)}...`);
                return null;
            }

            const vault = data.data?.vaultByAddress;
            if (!vault) return null;

            return {
                name: vault.name || vault.symbol || 'Unknown Vault',
                symbol: vault.symbol || 'VAULT',
                assetSymbol: vault.asset?.symbol || 'TOKEN',
                assetAddress: vault.asset?.address || '',
                assetDecimals: parseInt(vault.asset?.decimals || 18),
                assetPriceUsd: parseFloat(vault.asset?.priceUsd || 0),
                totalAssetsUsd: parseFloat(vault.state?.totalAssetsUsd || 0),
                apy: parseFloat(vault.state?.apy || 0),
                netApy: parseFloat(vault.state?.netApy || 0)
            };
        } catch (error) {
            console.warn(`Error fetching vault details for ${vaultAddress.slice(0, 8)}...`);
            return null;
        }
    }
}
