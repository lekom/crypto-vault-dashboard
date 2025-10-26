/**
 * Merkl Rewards Plugin
 * Fetches reward data from Merkl API
 */

import { VaultPlugin } from '../plugin-system.js';
import { getChainName } from '../utils.js';

export class MerklRewardsPlugin extends VaultPlugin {
    constructor() {
        super('Merkl', 'rewards');
        this.apiUrl = 'https://api.merkl.xyz';
    }

    async fetchData(address) {
        const promises = this.getSupportedChains().map(chainId =>
            this.fetchRewardsForChain(address, chainId)
        );
        const results = await Promise.all(promises);
        return results.flat();
    }

    async fetchRewardsForChain(userAddress, chainId) {
        try {
            const response = await fetch(
                `${this.apiUrl}/v4/users/${userAddress}/rewards?chainId=${chainId}&breakdownPage=0`,
                {
                    method: 'GET',
                    headers: { 'Accept': '*/*' }
                }
            );

            if (!response.ok) {
                return [];
            }

            const data = await response.json();

            if (Array.isArray(data) && data.length > 0) {
                const allRewards = [];

                for (const chainData of data) {
                    if (chainData.rewards && Array.isArray(chainData.rewards)) {
                        for (const reward of chainData.rewards) {
                            allRewards.push({
                                source: this.name,
                                chainId: chainId,
                                chainName: getChainName(chainId),
                                userAddress: userAddress,
                                distributionChainId: reward.distributionChainId,
                                amount: reward.amount,
                                claimed: reward.claimed || "0",
                                pending: reward.pending || "0",
                                recipient: reward.recipient,
                                root: reward.root,
                                tokenSymbol: reward.token?.symbol || 'TOKEN',
                                tokenDecimals: reward.token?.decimals || 18,
                                tokenAddress: reward.token?.address || '',
                                tokenPrice: reward.token?.price || 0
                            });
                        }
                    }
                }

                return allRewards;
            }

            return [];
        } catch (error) {
            console.warn(`Could not fetch Merkl rewards for chain ${chainId}`);
            return [];
        }
    }
}
