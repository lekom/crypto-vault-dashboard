/**
 * Moonwell Rewards Plugin
 * Fetches unclaimed rewards from Moonwell markets using the official SDK
 */

import { VaultPlugin } from '../plugin-system.js';
import { CHAIN_IDS } from '../config.js';
import { getChainName } from '../utils.js';
import { createMoonwellClient } from '@moonwell-fi/moonwell-sdk';

export class MoonwellRewardsPlugin extends VaultPlugin {
    constructor() {
        super('Moonwell', 'rewards');

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
            const rewards = [];

            // Fetch user rewards using the SDK's getUserRewards method
            const userRewards = await this.client.getUserRewards({
                userAddress: address,
            });

            // Check if userRewards is valid
            if (!userRewards || !Array.isArray(userRewards)) {
                console.warn(`[Moonwell Rewards] Invalid response from SDK:`, userRewards);
                return [];
            }

            // Transform to our standard format
            for (const reward of userRewards) {
                // SDK returns supplyRewards and borrowRewards as Amount objects
                const supplyRewardsAmount = reward.supplyRewards?.value || reward.supplyRewards || 0;
                const supplyRewardsUsd = reward.supplyRewardsUsd || 0;
                const borrowRewardsAmount = reward.borrowRewards?.value || reward.borrowRewards || 0;
                const borrowRewardsUsd = reward.borrowRewardsUsd || 0;

                // Combine supply and borrow rewards
                const totalRewardsAmount = parseFloat(supplyRewardsAmount) + parseFloat(borrowRewardsAmount);
                const totalRewardsUsd = parseFloat(supplyRewardsUsd) + parseFloat(borrowRewardsUsd);

                if (totalRewardsAmount > 0) {
                    // Convert to raw amount with decimals (multiply by 10^decimals)
                    const decimals = reward.rewardToken?.decimals || 18;
                    const rawAmount = (totalRewardsAmount * Math.pow(10, decimals)).toString();

                    const transformed = {
                        source: this.name,
                        chainId: reward.chainId,
                        chainName: getChainName(reward.chainId),
                        userAddress: address,
                        distributionChainId: reward.chainId,
                        // For Moonwell: all rewards are unclaimed, so amount = pending, claimed = 0
                        amount: rawAmount, // Total earned (in raw units with decimals)
                        claimed: "0", // Moonwell SDK doesn't track claimed separately
                        pending: rawAmount, // All rewards are pending/unclaimed (in raw units)
                        recipient: address,
                        root: '',
                        tokenSymbol: reward.rewardToken?.symbol || 'WELL',
                        tokenDecimals: decimals,
                        tokenAddress: reward.rewardToken?.address || '',
                        tokenPrice: totalRewardsUsd / totalRewardsAmount || 0
                    };
                    rewards.push(transformed);
                }
            }
            return rewards;
        } catch (error) {
            console.error(`[Moonwell Rewards] Error fetching rewards for ${address}:`, error);
            console.error(`[Moonwell Rewards] Error stack:`, error.stack);
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
