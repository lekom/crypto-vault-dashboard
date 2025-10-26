/**
 * Main Application Entry Point
 * Crypto Vault Dashboard
 */

import { PluginRegistry } from './plugin-system.js';
import { MorphoVaultPlugin } from './plugins/morpho.js';
import { MerklRewardsPlugin } from './plugins/merkl.js';
import { HyperliquidVaultPlugin } from './plugins/hyperliquid.js';
import { MoonwellVaultPlugin } from './plugins/moonwell.js';
import { DataManager } from './data-manager.js';
import { UIManager } from './ui-manager.js';
import { WalletManager } from './wallet-manager.js';

/**
 * Main Application Class
 */
class CryptoVaultDashboard {
    constructor() {
        // Initialize plugin registry
        this.pluginRegistry = new PluginRegistry();

        // Register all plugins
        this.registerPlugins();

        // Initialize managers
        this.walletManager = new WalletManager();
        this.dataManager = new DataManager(this.pluginRegistry);
        this.uiManager = new UIManager();

        // Setup event listeners
        this.setupEventListeners();

        // Initial render and data fetch if wallets exist
        this.walletManager.renderWalletList();
        if (this.walletManager.hasWallets()) {
            this.fetchAndUpdate();
            this.dataManager.startPolling(
                this.walletManager.getWallets(),
                (vaults, rewards) => this.uiManager.updateUI(vaults, rewards)
            );
        }
    }

    /**
     * Register all data source plugins
     */
    registerPlugins() {
        this.pluginRegistry.register(new MorphoVaultPlugin());
        this.pluginRegistry.register(new MerklRewardsPlugin());
        this.pluginRegistry.register(new HyperliquidVaultPlugin());
        this.pluginRegistry.register(new MoonwellVaultPlugin());
    }

    /**
     * Setup DOM event listeners
     */
    setupEventListeners() {
        const addButton = document.getElementById('addWallet');
        const walletInput = document.getElementById('walletInput');

        // Add wallet on button click
        addButton.addEventListener('click', () => this.handleAddWallet());

        // Add wallet on Enter key
        walletInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.handleAddWallet();
            }
        });

        // Listen for wallet removal events
        document.addEventListener('walletRemoved', (e) => {
            this.handleRemoveWallet(e.detail.address);
        });
    }

    /**
     * Handle adding a new wallet
     */
    handleAddWallet() {
        const input = document.getElementById('walletInput');
        const result = this.walletManager.addWallet(input.value);

        if (!result.success) {
            alert(result.message);
            return;
        }

        // Clear input and update UI
        input.value = '';
        this.walletManager.renderWalletList();

        // Fetch data and start polling if this is the first wallet
        if (result.isFirstWallet) {
            this.fetchAndUpdate();
            this.dataManager.startPolling(
                this.walletManager.getWallets(),
                (vaults, rewards) => this.uiManager.updateUI(vaults, rewards)
            );
        } else {
            this.fetchAndUpdate();
        }
    }

    /**
     * Handle removing a wallet
     * @param {string} address - Wallet address to remove
     */
    handleRemoveWallet(address) {
        this.walletManager.removeWallet(address);
        this.walletManager.renderWalletList();

        if (!this.walletManager.hasWallets()) {
            // Stop polling and clear data
            this.dataManager.stopPolling();
            this.uiManager.updateUI([], []);
        } else {
            // Refetch data for remaining wallets
            this.fetchAndUpdate();
        }
    }

    /**
     * Fetch data and update UI
     */
    fetchAndUpdate() {
        this.dataManager.fetchAllData(
            this.walletManager.getWallets(),
            (vaults, rewards) => this.uiManager.updateUI(vaults, rewards)
        );
    }
}

// Initialize application when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    window.app = new CryptoVaultDashboard();
    console.log('Crypto Vault Dashboard initialized');
});
