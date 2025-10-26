/**
 * Hyperliquid HLP Vault Plugin
 * Fetches HLP vault deposits from Hyperliquid
 */

import { VaultPlugin } from '../plugin-system.js';

export class HyperliquidVaultPlugin extends VaultPlugin {
    constructor() {
        super('Hyperliquid HLP', 'vault');
        this.apiUrl = 'https://api.hyperliquid.xyz/info';
    }

    async fetchData(address) {
        try {
            // Format address to match Hyperliquid's 42-character hex format
            const formattedAddress = this.formatAddress(address);

            const response = await fetch(this.apiUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    type: 'userVaultEquities',
                    user: formattedAddress
                })
            });

            if (!response.ok) {
                console.warn(`Hyperliquid API returned ${response.status}`);
                return [];
            }

            const data = await response.json();

            // Response format: [{ vaultAddress: "0x...", equity: "742500.082809" }]
            if (!Array.isArray(data) || data.length === 0) {
                return [];
            }

            // Fetch vault details for each vault to get APY
            const vaultPromises = data.map(async (vault) => {
                const equityUsd = parseFloat(vault.equity);

                // Fetch vault details to get APY
                let vaultDetails = null;
                try {
                    const detailsResponse = await fetch(this.apiUrl, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({
                            type: 'vaultDetails',
                            vaultAddress: vault.vaultAddress,
                            user: formattedAddress
                        })
                    });

                    if (detailsResponse.ok) {
                        vaultDetails = await detailsResponse.json();
                    }
                } catch (error) {
                    console.warn(`Error fetching vault details for ${vault.vaultAddress}:`, error);
                }

                // Extract APR from vault details (it's in decimal form like 0.155 for 15.5%)
                // Don't divide by 100 - it's already in decimal format
                const apr = vaultDetails?.apr ? parseFloat(vaultDetails.apr) : undefined;

                return {
                    source: this.name,
                    chainId: null, // Hyperliquid is its own L1
                    chainName: 'Hyperliquid',
                    userAddress: address,
                    vaultAddress: vault.vaultAddress,
                    vaultName: vaultDetails?.name || 'HLP Vault',
                    vaultSymbol: 'HLP',
                    assetSymbol: 'USDC',
                    assetDecimals: 6,
                    assetPriceUsd: 1, // USDC is $1
                    balanceAssets: equityUsd, // Equity in USDC terms
                    balanceUsd: equityUsd,
                    apy: undefined,
                    netApy: apr
                };
            });

            const vaults = (await Promise.all(vaultPromises)).filter(vault => vault.balanceUsd > 0);
            return vaults;
        } catch (error) {
            console.error(`Error fetching Hyperliquid vault for ${address}:`, error);
            return [];
        }
    }

    /**
     * Format address to Hyperliquid's required format
     * @param {string} address - Ethereum-style address
     * @returns {string} Formatted 42-character hex address
     */
    formatAddress(address) {
        // Ensure address starts with 0x and is lowercase
        const cleaned = address.toLowerCase();

        // If already 42 characters (0x + 40 hex), return as-is
        if (cleaned.length === 42 && cleaned.startsWith('0x')) {
            return cleaned;
        }

        // If missing 0x prefix, add it
        if (!cleaned.startsWith('0x')) {
            return '0x' + cleaned.padStart(40, '0');
        }

        // Pad to 40 hex characters after 0x
        const hex = cleaned.slice(2);
        return '0x' + hex.padStart(40, '0');
    }

    getSupportedChains() {
        // Hyperliquid is its own L1 chain, not EVM
        // Return empty array as it doesn't use standard chain IDs
        return [];
    }
}

