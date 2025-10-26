/**
 * Utility Functions
 */

import { CHAIN_NAMES } from './config.js';

/**
 * Format numbers with comma separators
 * @param {number} num - Number to format
 * @param {number} decimals - Number of decimal places
 * @returns {string} Formatted number
 */
export function formatNumber(num, decimals = 2) {
    return num.toLocaleString('en-US', {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals
    });
}

/**
 * Get chain name from chain ID
 * @param {number} chainId - Chain ID
 * @returns {string} Chain name
 */
export function getChainName(chainId) {
    return CHAIN_NAMES[chainId] || `Chain ${chainId}`;
}

/**
 * Format address for display (0x1234...5678)
 * @param {string} address - Full address
 * @returns {string} Formatted address
 */
export function formatAddress(address) {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

/**
 * Validate EVM address
 * @param {string} address - Address to validate
 * @returns {boolean} True if valid
 */
export function isValidAddress(address) {
    return /^0x[a-fA-F0-9]{40}$/.test(address);
}

/**
 * Get display value (USDC or USD) for a vault
 * @param {object} vault - Vault data
 * @returns {number} Display value
 */
export function getDisplayValue(vault) {
    // If asset is USDC or other stablecoin, use the asset balance
    const stablecoins = ['USDC', 'USDT', 'DAI', 'USDC.e'];
    if (stablecoins.includes(vault.assetSymbol)) {
        return vault.balanceAssets;
    }
    // Otherwise use USD value
    return vault.balanceUsd;
}
