/**
 * Data Manager
 * Orchestrates data fetching from all plugins
 */

import { CONFIG } from './config.js';

export class DataManager {
    constructor(pluginRegistry) {
        this.pluginRegistry = pluginRegistry;
        this.vaultsData = [];
        this.rewardsData = [];
        this.pollTimer = null;
        // Cache to store previous successful data
        this.vaultsCache = new Map(); // key: source-chainId-vaultAddress-userAddress
        this.rewardsCache = new Map(); // key: source-chainId-tokenAddress-userAddress
    }

    /**
     * Fetch all data from all plugins for all wallets
     * @param {Array<string>} wallets - Array of wallet addresses
     * @param {Function} onUpdate - Callback when data is updated
     * @param {boolean} showLoading - Whether to show loading overlay
     */
    /**
     * Wrap a promise with a timeout
     * @param {Promise} promise - Promise to wrap
     * @param {number} timeoutMs - Timeout in milliseconds
     * @param {string} name - Name for error message
     * @returns {Promise} Promise that rejects on timeout
     */
    promiseWithTimeout(promise, timeoutMs, name) {
        return Promise.race([
            promise,
            new Promise((_, reject) =>
                setTimeout(() => reject(new Error(`Timeout after ${timeoutMs}ms`)), timeoutMs)
            )
        ]);
    }

    /**
     * Generate cache key for vault data
     */
    getVaultCacheKey(vault) {
        return `${vault.source}-${vault.chainId}-${vault.vaultAddress}-${vault.userAddress}`;
    }

    /**
     * Generate cache key for reward data
     */
    getRewardCacheKey(reward) {
        return `${reward.source}-${reward.chainId}-${reward.tokenAddress || reward.tokenSymbol}-${reward.userAddress}`;
    }

    /**
     * Clean cache to only keep items for current wallets
     */
    cleanCache(cache, wallets) {
        const walletsSet = new Set(wallets.map(w => w.toLowerCase()));
        const keysToDelete = [];

        cache.forEach((item, key) => {
            const itemWallet = item.userAddress?.toLowerCase();
            if (!walletsSet.has(itemWallet)) {
                keysToDelete.push(key);
            }
        });

        keysToDelete.forEach(key => cache.delete(key));
    }

    /**
     * Merge new data with cached data, preferring new data when available
     * Only keeps cached data for failed plugin+wallet combinations
     */
    mergeWithCache(newData, cache, getCacheKey, successfulFetches, failedFetches) {
        const merged = new Map();

        // Create set of successful plugin+wallet combinations
        const successfulKeys = new Set(
            successfulFetches.map(f => `${f.plugin}-${f.wallet.toLowerCase()}`)
        );

        // Add all new data to merged map and update cache
        newData.forEach(item => {
            const key = getCacheKey(item);
            merged.set(key, item);
            cache.set(key, item);
        });

        // Remove cached items for successful fetches (position was legitimately closed)
        const keysToDelete = [];
        cache.forEach((item, key) => {
            const itemKey = `${item.source}-${item.userAddress?.toLowerCase()}`;
            if (successfulKeys.has(itemKey) && !merged.has(key)) {
                // Successful fetch didn't include this item = position was closed
                keysToDelete.push(key);
            }
        });
        keysToDelete.forEach(key => cache.delete(key));

        // Add cached items ONLY for failed fetches
        const failedKeys = new Set(
            failedFetches.map(f => `${f.plugin}-${f.wallet.toLowerCase()}`)
        );
        cache.forEach((item, key) => {
            if (!merged.has(key)) {
                const itemKey = `${item.source}-${item.userAddress?.toLowerCase()}`;
                if (failedKeys.has(itemKey)) {
                    // Keep cached data for failed fetches
                    merged.set(key, item);
                }
            }
        });

        return Array.from(merged.values());
    }

    async fetchAllData(wallets, onUpdate, showLoading = true) {
        if (showLoading) {
            this.showLoading(true);
        }

        try {
            // Fetch vault data from all vault plugins
            const vaultPlugins = this.pluginRegistry.getVaultPlugins();
            const vaultPromises = [];

            for (const wallet of wallets) {
                for (const plugin of vaultPlugins) {
                    // Wrap each plugin call with timeout and error handling
                    vaultPromises.push(
                        this.promiseWithTimeout(
                            plugin.fetchData(wallet),
                            5000, // 5 second timeout
                            `${plugin.name} vault plugin`
                        )
                        .then(data => ({ success: true, data, plugin: plugin.name, wallet }))
                        .catch(error => {
                            console.error(`[DataManager] ${plugin.name} failed for ${wallet}:`, error.message);
                            return { success: false, data: [], plugin: plugin.name, wallet };
                        })
                    );
                }
            }

            const vaultResults = await Promise.all(vaultPromises);

            // Separate successful results from failures
            const successfulVaults = vaultResults.filter(r => r.success);
            const failedVaults = vaultResults.filter(r => !r.success);

            const newVaultsData = successfulVaults.flatMap(r => r.data);

            // Clean cache for removed wallets
            this.cleanCache(this.vaultsCache, wallets);

            // Merge new data with cached data (only keep cached data for failed fetches)
            this.vaultsData = this.mergeWithCache(
                newVaultsData,
                this.vaultsCache,
                this.getVaultCacheKey.bind(this),
                successfulVaults,
                failedVaults
            );

            // Fetch rewards data from all reward plugins
            const rewardPlugins = this.pluginRegistry.getRewardPlugins();
            const rewardPromises = [];

            for (const wallet of wallets) {
                for (const plugin of rewardPlugins) {
                    // Wrap each plugin call with timeout and error handling
                    rewardPromises.push(
                        this.promiseWithTimeout(
                            plugin.fetchData(wallet),
                            5000, // 5 second timeout
                            `${plugin.name} reward plugin`
                        )
                        .then(data => ({ success: true, data, plugin: plugin.name, wallet }))
                        .catch(error => {
                            console.error(`[DataManager] ${plugin.name} failed for ${wallet}:`, error.message);
                            return { success: false, data: [], plugin: plugin.name, wallet };
                        })
                    );
                }
            }

            const rewardResults = await Promise.all(rewardPromises);

            // Separate successful results from failures
            const successfulRewards = rewardResults.filter(r => r.success);
            const failedRewards = rewardResults.filter(r => !r.success);

            const newRewardsData = successfulRewards.flatMap(r => r.data);

            // Clean cache for removed wallets
            this.cleanCache(this.rewardsCache, wallets);

            // Merge new data with cached data (only keep cached data for failed fetches)
            this.rewardsData = this.mergeWithCache(
                newRewardsData,
                this.rewardsCache,
                this.getRewardCacheKey.bind(this),
                successfulRewards,
                failedRewards
            );

            // Notify update
            if (onUpdate) {
                onUpdate(this.vaultsData, this.rewardsData);
            }
        } catch (error) {
            console.error('Error fetching data:', error);
            if (showLoading) {
                alert('Error fetching vault data. Please check console for details.');
            }
        } finally {
            if (showLoading) {
                this.showLoading(false);
            }
        }
    }

    /**
     * Start polling for data updates
     * @param {Array<string>} wallets - Array of wallet addresses
     * @param {Function} onUpdate - Callback when data is updated
     */
    startPolling(wallets, onUpdate) {
        if (this.pollTimer) {
            clearInterval(this.pollTimer);
        }

        this.pollTimer = setInterval(() => {
            console.log('Polling for updates...');
            // Fetch in background without showing loading overlay
            this.fetchAllData(wallets, onUpdate, false);
        }, CONFIG.POLL_INTERVAL);
    }

    /**
     * Stop polling
     */
    stopPolling() {
        if (this.pollTimer) {
            clearInterval(this.pollTimer);
            this.pollTimer = null;
        }
    }

    /**
     * Show/hide loading overlay
     * @param {boolean} show - Whether to show or hide
     */
    showLoading(show) {
        const overlay = document.getElementById('loadingOverlay');
        if (show) {
            overlay.classList.add('active');
        } else {
            overlay.classList.remove('active');
        }
    }

    /**
     * Get current vaults data
     * @returns {Array} Vaults data
     */
    getVaultsData() {
        return this.vaultsData;
    }

    /**
     * Get current rewards data
     * @returns {Array} Rewards data
     */
    getRewardsData() {
        return this.rewardsData;
    }
}
