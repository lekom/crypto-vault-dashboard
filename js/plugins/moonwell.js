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

        // Initialize Moonwell SDK client with public RPC endpoints
        // Using alternative public RPCs to avoid rate limits
        this.client = createMoonwellClient({
            networks: {
                base: {
                    rpcUrls: ['https://base-rpc.publicnode.com']
                },
                optimism: {
                    rpcUrls: ['https://optimism-rpc.publicnode.com']
                },
            },
        });
    }

    async fetchData(address) {
        try {
            const positions = [];

            // Fetch user positions from Moonwell SDK
            const userPositions = await this.client.getUserPositions({
                userAddress: address,
            });

            // Check if userPositions is valid
            if (!userPositions || !Array.isArray(userPositions)) {
                console.warn(`[Moonwell] Invalid response from SDK:`, userPositions);
                return [];
            }

            // Fetch full market data to get APY information
            // Create a map of markets by chainId and token address
            const marketMap = new Map();
            const fetchedChains = new Set();

            // Map chainId to network name for SDK
            const chainIdToNetwork = {
                8453: 'base',
                10: 'optimism',
                1284: 'moonbeam',
                1285: 'moonriver'
            };

            for (const position of userPositions) {
                const chainId = position.chainId;
                const network = chainIdToNetwork[chainId];

                if (network && !fetchedChains.has(chainId)) {
                    fetchedChains.add(chainId);
                    try {
                        const markets = await this.client.getMarkets({ networkId: network });
                        if (markets && Array.isArray(markets)) {
                            for (const market of markets) {
                                const key = `${chainId}-${market.marketToken?.address?.toLowerCase()}`;
                                marketMap.set(key, market);
                            }
                        }
                    } catch (error) {
                        console.warn(`[Moonwell] Error fetching markets for chain ${chainId}:`, error);
                    }
                }
            }

            // Transform to our standard format
            for (const position of userPositions) {
                // SDK returns Amount objects, need to access the value
                const suppliedAmount = position.supplied?.value || position.supplied;
                const suppliedUsd = position.supplied?.valueUsd || position.suppliedUsd;

                if (suppliedAmount && parseFloat(suppliedAmount) > 0) {
                    const supplyBalanceUsd = suppliedUsd ? parseFloat(suppliedUsd) : 0;
                    const supplyBalance = parseFloat(suppliedAmount);

                    // Get full market data with APY information
                    const chainId = position.chainId;
                    const marketTokenAddress = position.market?.address?.toLowerCase();
                    const marketKey = `${chainId}-${marketTokenAddress}`;
                    const fullMarket = marketMap.get(marketKey);

                    console.log(`[Moonwell] Matching market:`, {
                        chainId,
                        marketTokenAddress,
                        marketKey,
                        foundFullMarket: !!fullMarket,
                        fullMarketAPY: fullMarket ? {
                            baseSupplyApy: fullMarket.baseSupplyApy,
                            totalSupplyApr: fullMarket.totalSupplyApr
                        } : 'NOT FOUND',
                        availableKeys: Array.from(marketMap.keys()).slice(0, 5)
                    });

                    const transformed = {
                        source: this.name,
                        chainId: position.chainId || this.getChainId(position.network),
                        chainName: this.getChainNameFromNetwork(position.network) || getChainName(position.chainId),
                        userAddress: address,
                        vaultAddress: position.market?.address,
                        vaultName: `${fullMarket?.underlyingToken?.symbol || position.market?.symbol} Market`,
                        vaultSymbol: position.market?.symbol,
                        assetSymbol: fullMarket?.underlyingToken?.symbol || position.market?.symbol,
                        assetDecimals: fullMarket?.underlyingToken?.decimals || 18,
                        assetPriceUsd: parseFloat(fullMarket?.underlyingPrice || 0),
                        balanceAssets: supplyBalance,
                        balanceUsd: supplyBalanceUsd,
                        // SDK returns APY as percentage (e.g., 5.32 for 5.32%), convert to decimal (0.0532)
                        apy: fullMarket ? parseFloat(fullMarket.baseSupplyApy || 0) / 100 : 0,
                        netApy: fullMarket ? parseFloat(fullMarket.totalSupplyApr || fullMarket.baseSupplyApy || 0) / 100 : 0
                    };
                    positions.push(transformed);
                }
            }
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
