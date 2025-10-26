/**
 * Moonwell Vault Plugin
 * Fetches positions from Moonwell markets using the official SDK
 */

import { VaultPlugin } from '../plugin-system.js';
import { CHAIN_IDS } from '../config.js';
import { getChainName } from '../utils.js';
import { createMoonwellClient } from '@moonwell-fi/moonwell-sdk';

export class MoonwellVaultPlugin extends VaultPlugin {
    constructor() {
        super('Moonwell', 'vault');

        // Initialize Moonwell SDK client with default RPC endpoints
        this.client = createMoonwellClient({
            networks: {
                base: {},
                optimism: {},
            },
        });
    }

    async fetchData(address) {
        try {
            console.log(`[Moonwell] Fetching data for ${address}`);
            console.log(`[Moonwell] Client:`, this.client);
            const positions = [];

            // First, let's test if SDK is working by getting markets
            console.log(`[Moonwell] Testing SDK - fetching markets...`);
            const markets = await this.client.getMarkets();
            console.log(`[Moonwell] Markets available:`, markets?.length, markets);

            // Fetch user positions from Moonwell SDK
            console.log(`[Moonwell] Calling getUserPositions with userAddress:`, address);
            const userPositions = await this.client.getUserPositions({
                userAddress: address,
            });

            console.log(`[Moonwell] SDK returned ${userPositions?.length || 0} positions:`, userPositions);
            console.log(`[Moonwell] Type of userPositions:`, typeof userPositions, Array.isArray(userPositions));

            // Check if userPositions is valid
            if (!userPositions || !Array.isArray(userPositions)) {
                console.warn(`[Moonwell] Invalid response from SDK:`, userPositions);
                return [];
            }

            // Transform to our standard format
            for (const position of userPositions) {
                console.log(`[Moonwell] Processing position:`, position);
                console.log(`[Moonwell] Position keys:`, Object.keys(position));
                console.log(`[Moonwell] Supplied:`, position.supplied);

                // SDK returns Amount objects, need to access the value
                const suppliedAmount = position.supplied?.value || position.supplied;
                const suppliedUsd = position.supplied?.valueUsd || position.suppliedUsd;

                console.log(`[Moonwell] suppliedAmount:`, suppliedAmount, 'suppliedUsd:', suppliedUsd);

                if (suppliedAmount && parseFloat(suppliedAmount) > 0) {
                    const supplyBalanceUsd = suppliedUsd ? parseFloat(suppliedUsd) : 0;
                    const supplyBalance = parseFloat(suppliedAmount);

                    const transformed = {
                        source: this.name,
                        chainId: position.chainId || this.getChainId(position.network),
                        chainName: this.getChainNameFromNetwork(position.network) || getChainName(position.chainId),
                        userAddress: address,
                        vaultAddress: position.market?.mTokenAddress || position.market?.address,
                        vaultName: `${position.market?.underlyingSymbol || position.market?.symbol} Market`,
                        vaultSymbol: position.market?.mTokenSymbol || position.market?.symbol,
                        assetSymbol: position.market?.underlyingSymbol || position.market?.symbol,
                        assetDecimals: position.market?.underlyingDecimals || 18,
                        assetPriceUsd: parseFloat(position.market?.underlyingPrice?.valueUsd || position.market?.underlyingPriceUsd || 0),
                        balanceAssets: supplyBalance,
                        balanceUsd: supplyBalanceUsd,
                        apy: parseFloat(position.market?.supplyApy || position.market?.apy || 0),
                        netApy: parseFloat(position.market?.supplyApy || position.market?.apy || 0)
                    };
                    console.log(`[Moonwell] Transformed position:`, transformed);
                    positions.push(transformed);
                } else {
                    console.log(`[Moonwell] Skipping position with zero or no supply balance`);
                }
            }

            console.log(`[Moonwell] Total positions found: ${positions.length}`, positions);
            return positions;
        } catch (error) {
            console.error(`[Moonwell] Error fetching positions for ${address}:`, error);
            console.error(`[Moonwell] Error stack:`, error.stack);
            return [];
        }
    }

    getChainId(network) {
        const chainIds = {
            'base': CHAIN_IDS.BASE,
            'optimism': 10,
            'moonbeam': 1284,
            'moonriver': 1285
        };
        return chainIds[network?.toLowerCase()] || null;
    }

    getChainNameFromNetwork(network) {
        const chainNames = {
            'base': 'Base',
            'optimism': 'Optimism',
            'moonbeam': 'Moonbeam',
            'moonriver': 'Moonriver'
        };
        return chainNames[network?.toLowerCase()] || network;
    }

    getSupportedChains() {
        // Moonwell is on Base (8453) and Optimism (10)
        return [CHAIN_IDS.BASE, 10];
    }
}
