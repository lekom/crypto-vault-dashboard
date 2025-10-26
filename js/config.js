/**
 * Configuration and Constants
 */

// Application Settings
export const CONFIG = {
    POLL_INTERVAL: 30000, // 30 seconds
    STORAGE_KEY: 'crypto_vault_dashboard_wallets'
};

// Supported chain IDs
export const CHAIN_IDS = {
    ETHEREUM: 1,
    OPTIMISM: 10,
    BASE: 8453,
    ARBITRUM: 42161
};

export const SUPPORTED_CHAINS = [
    CHAIN_IDS.ETHEREUM,
    CHAIN_IDS.BASE,
    CHAIN_IDS.ARBITRUM
];

// Chain name mapping
export const CHAIN_NAMES = {
    [CHAIN_IDS.ETHEREUM]: 'Ethereum',
    [CHAIN_IDS.OPTIMISM]: 'Optimism',
    [CHAIN_IDS.BASE]: 'Base',
    [CHAIN_IDS.ARBITRUM]: 'Arbitrum'
};
