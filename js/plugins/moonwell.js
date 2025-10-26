/**
 * Moonwell Vault Plugin (Placeholder)
 * TODO: Implement actual API integration
 */

import { VaultPlugin } from '../plugin-system.js';
import { CHAIN_IDS } from '../config.js';

export class MoonwellVaultPlugin extends VaultPlugin {
    constructor() {
        super('Moonwell', 'vault');
    }

    async fetchData(address) {
        // Placeholder - returns empty array for now
        console.log(`Moonwell plugin called for ${address} (not yet implemented)`);
        return [];
    }

    getSupportedChains() {
        // Moonwell is on Base and Optimism
        return [CHAIN_IDS.BASE];
    }
}
