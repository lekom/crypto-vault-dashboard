/**
 * Hyperliquid HLP Vault Plugin (Placeholder)
 * TODO: Implement actual API integration
 */

import { VaultPlugin } from '../plugin-system.js';
import { CHAIN_IDS } from '../config.js';

export class HyperliquidVaultPlugin extends VaultPlugin {
    constructor() {
        super('Hyperliquid HLP', 'vault');
    }

    async fetchData(address) {
        // Placeholder - returns empty array for now
        console.log(`Hyperliquid HLP plugin called for ${address} (not yet implemented)`);
        return [];
    }

    getSupportedChains() {
        // Hyperliquid is its own chain, but we'll handle it separately
        return [];
    }
}
