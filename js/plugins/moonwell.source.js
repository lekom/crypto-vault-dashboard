/**
 * Moonwell Vault Plugin - Source (to be bundled)
 * Fetches positions and rewards from Moonwell using the official SDK
 */

import { createMoonwellClient } from '@moonwell-fi/moonwell-sdk';

export class MoonwellVaultPlugin {
    constructor() {
        this.name = 'Moonwell';
        this.type = 'vault';

        // Initialize Moonwell client with supported networks
        this.client = createMoonwellClient({
            networks: {
                base: {
                    rpcUrls: ["https://base.llamarpc.com"],
                },
                optimism: {
                    rpcUrls: ["https://optimism.llamarpc.com"],
                },
            },
        });
    }

    async fetchData(address) {
        try {
            const positions = [];

            // Fetch user positions from Moonwell
            const userPositions = await this.client.getUserPositions({
                account: address,
            });

            // Transform positions to our standard format
            for (const position of userPositions) {
                if (position.supplyBalanceUsd && position.supplyBalanceUsd > 0) {
                    positions.push({
                        source: this.name,
                        chainId: this.getChainId(position.network),
                        chainName: this.getChainName(position.network),
                        userAddress: address,
                        vaultAddress: position.market.mTokenAddress,
                        vaultName: `${position.market.underlyingSymbol} Market`,
                        vaultSymbol: position.market.mTokenSymbol,
                        assetSymbol: position.market.underlyingSymbol,
                        assetDecimals: position.market.underlyingDecimals,
                        assetPriceUsd: parseFloat(position.market.underlyingPriceUsd || 0),
                        balanceAssets: parseFloat(position.supplyBalance || 0),
                        balanceUsd: parseFloat(position.supplyBalanceUsd || 0),
                        apy: parseFloat(position.market.supplyApy || 0),
                        netApy: parseFloat(position.market.supplyApy || 0),
                        // Additional Moonwell-specific data
                        borrowBalanceUsd: parseFloat(position.borrowBalanceUsd || 0),
                        collateralEnabled: position.collateralEnabled || false
                    });
                }
            }

            return positions;
        } catch (error) {
            console.error(`Error fetching Moonwell positions for ${address}:`, error);
            return [];
        }
    }

    getSupportedChains() {
        // Moonwell is on Base (8453) and Optimism (10)
        return [8453, 10];
    }

    getChainId(network) {
        const chainIds = {
            'base': 8453,
            'optimism': 10,
            'moonbeam': 1284,
            'moonriver': 1285
        };
        return chainIds[network.toLowerCase()] || null;
    }

    getChainName(network) {
        const chainNames = {
            'base': 'Base',
            'optimism': 'Optimism',
            'moonbeam': 'Moonbeam',
            'moonriver': 'Moonriver'
        };
        return chainNames[network.toLowerCase()] || network;
    }
}

// For rewards plugin
export class MoonwellRewardsPlugin {
    constructor() {
        this.name = 'Moonwell';
        this.type = 'rewards';

        this.client = createMoonwellClient({
            networks: {
                base: {
                    rpcUrls: ["https://base.llamarpc.com"],
                },
                optimism: {
                    rpcUrls: ["https://optimism.llamarpc.com"],
                },
            },
        });
    }

    async fetchData(address) {
        try {
            const rewards = [];

            // Fetch user rewards from Moonwell
            const userRewards = await this.client.getUserRewards({
                account: address,
            });

            // Transform rewards to our standard format
            for (const reward of userRewards) {
                if (reward.rewardsUsd && parseFloat(reward.rewardsUsd) > 0) {
                    rewards.push({
                        source: this.name,
                        chainId: this.getChainId(reward.network),
                        chainName: this.getChainName(reward.network),
                        userAddress: address,
                        distributionChainId: this.getChainId(reward.network),
                        tokenSymbol: reward.rewardToken.symbol,
                        tokenDecimals: reward.rewardToken.decimals,
                        tokenAddress: reward.rewardToken.address,
                        tokenPrice: parseFloat(reward.rewardToken.priceUsd || 0),
                        amount: reward.rewardsAccrued || "0",
                        claimed: "0", // Moonwell SDK doesn't track claimed separately
                        pending: reward.rewardsAccrued || "0"
                    });
                }
            }

            return rewards;
        } catch (error) {
            console.error(`Error fetching Moonwell rewards for ${address}:`, error);
            return [];
        }
    }

    getSupportedChains() {
        return [8453, 10]; // Base and Optimism
    }

    getChainId(network) {
        const chainIds = {
            'base': 8453,
            'optimism': 10,
            'moonbeam': 1284,
            'moonriver': 1285
        };
        return chainIds[network.toLowerCase()] || null;
    }

    getChainName(network) {
        const chainNames = {
            'base': 'Base',
            'optimism': 'Optimism',
            'moonbeam': 'Moonbeam',
            'moonriver': 'Moonriver'
        };
        return chainNames[network.toLowerCase()] || network;
    }
}
