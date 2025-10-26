/**
 * Plugin System - Base classes and registry
 */

import { SUPPORTED_CHAINS } from './config.js';

/**
 * Base class for vault data source plugins
 */
export class VaultPlugin {
    constructor(name, type) {
        this.name = name;
        this.type = type; // 'vault' or 'rewards'
    }

    /**
     * Fetch data for a single wallet address
     * @param {string} address - Wallet address
     * @returns {Promise<Array>} Array of vault/reward items
     */
    async fetchData(address) {
        throw new Error('fetchData must be implemented by plugin');
    }

    /**
     * Get supported chain IDs for this plugin
     * @returns {Array<number>} Array of chain IDs
     */
    getSupportedChains() {
        return SUPPORTED_CHAINS;
    }
}

/**
 * Plugin registry to manage all data source plugins
 */
export class PluginRegistry {
    constructor() {
        this.plugins = [];
    }

    /**
     * Register a new plugin
     * @param {VaultPlugin} plugin - Plugin instance
     */
    register(plugin) {
        this.plugins.push(plugin);
        console.log(`Registered plugin: ${plugin.name} (${plugin.type})`);
    }

    /**
     * Get all vault plugins
     * @returns {Array<VaultPlugin>} Vault plugins
     */
    getVaultPlugins() {
        return this.plugins.filter(p => p.type === 'vault');
    }

    /**
     * Get all reward plugins
     * @returns {Array<VaultPlugin>} Reward plugins
     */
    getRewardPlugins() {
        return this.plugins.filter(p => p.type === 'rewards');
    }

    /**
     * Get all registered plugins
     * @returns {Array<VaultPlugin>} All plugins
     */
    getAllPlugins() {
        return this.plugins;
    }
}
