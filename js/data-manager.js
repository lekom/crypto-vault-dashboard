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
    }

    /**
     * Fetch all data from all plugins for all wallets
     * @param {Array<string>} wallets - Array of wallet addresses
     * @param {Function} onUpdate - Callback when data is updated
     * @param {boolean} showLoading - Whether to show loading overlay
     */
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
                    vaultPromises.push(plugin.fetchData(wallet));
                }
            }

            const vaultResults = await Promise.all(vaultPromises);
            this.vaultsData = vaultResults.flat();

            // Fetch rewards data from all reward plugins
            const rewardPlugins = this.pluginRegistry.getRewardPlugins();
            const rewardPromises = [];

            for (const wallet of wallets) {
                for (const plugin of rewardPlugins) {
                    rewardPromises.push(plugin.fetchData(wallet));
                }
            }

            const rewardResults = await Promise.all(rewardPromises);
            this.rewardsData = rewardResults.flat();

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
