/**
 * Wallet Manager
 * Handles wallet state and localStorage persistence
 */

import { CONFIG } from './config.js';
import { isValidAddress, formatAddress } from './utils.js';

export class WalletManager {
    constructor() {
        this.wallets = [];
        this.loadFromStorage();
    }

    /**
     * Load wallets from localStorage
     */
    loadFromStorage() {
        const stored = localStorage.getItem(CONFIG.STORAGE_KEY);
        if (stored) {
            try {
                this.wallets = JSON.parse(stored);
            } catch (e) {
                console.error('Error loading wallets from storage:', e);
                this.wallets = [];
            }
        }
    }

    /**
     * Save wallets to localStorage
     */
    saveToStorage() {
        localStorage.setItem(CONFIG.STORAGE_KEY, JSON.stringify(this.wallets));
    }

    /**
     * Add a new wallet address
     * @param {string} address - Wallet address to add
     * @returns {Object} Result with success status and message
     */
    addWallet(address) {
        const trimmedAddress = address.trim();

        if (!isValidAddress(trimmedAddress)) {
            return {
                success: false,
                message: 'Please enter a valid EVM address'
            };
        }

        if (this.wallets.includes(trimmedAddress.toLowerCase())) {
            return {
                success: false,
                message: 'This wallet is already added'
            };
        }

        this.wallets.push(trimmedAddress.toLowerCase());
        this.saveToStorage();

        return {
            success: true,
            message: 'Wallet added successfully',
            isFirstWallet: this.wallets.length === 1
        };
    }

    /**
     * Remove a wallet address
     * @param {string} address - Wallet address to remove
     */
    removeWallet(address) {
        this.wallets = this.wallets.filter(w => w !== address);
        this.saveToStorage();
    }

    /**
     * Get all wallet addresses
     * @returns {Array<string>} Array of wallet addresses
     */
    getWallets() {
        return this.wallets;
    }

    /**
     * Check if there are any wallets
     * @returns {boolean} True if wallets exist
     */
    hasWallets() {
        return this.wallets.length > 0;
    }

    /**
     * Render wallet list to DOM
     */
    renderWalletList() {
        const container = document.getElementById('walletList');
        const footer = document.querySelector('.footer');

        if (this.wallets.length === 0) {
            container.innerHTML = '';
            if (footer) footer.style.display = 'none';
            return;
        }

        if (footer) footer.style.display = 'block';

        container.innerHTML = this.wallets.map(address => `
            <div class="wallet-tag">
                <span class="wallet-address">${formatAddress(address)}</span>
                <button class="btn btn-danger" data-address="${address}">
                    <span>✕</span>
                </button>
            </div>
        `).join('');

        // Add event listeners to remove buttons
        container.querySelectorAll('.btn-danger').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const address = e.currentTarget.getAttribute('data-address');
                const event = new CustomEvent('walletRemoved', { detail: { address } });
                document.dispatchEvent(event);
            });
        });
    }
}
