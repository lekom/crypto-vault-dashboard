# Crypto Vault Dashboard - Architecture

## Overview

This application uses a clean, modular architecture with clear separation of concerns. The codebase is organized into separate modules, each responsible for a specific aspect of the application.

## File Structure

```
/
├── index.html              # Main HTML file
├── styles.css              # Styling
├── js/
│   ├── main.js            # Application entry point
│   ├── config.js          # Configuration and constants
│   ├── utils.js           # Utility functions
│   ├── plugin-system.js   # Plugin base classes and registry
│   ├── data-manager.js    # Data fetching orchestration
│   ├── ui-manager.js      # UI rendering logic
│   ├── wallet-manager.js  # Wallet state management
│   └── plugins/
│       ├── morpho.js      # Morpho vault plugin
│       ├── merkl.js       # Merkl rewards plugin
│       ├── hyperliquid.js # Hyperliquid HLP plugin (placeholder)
│       └── moonwell.js    # Moonwell plugin (placeholder)
```

## Module Responsibilities

### main.js
**Entry Point** - Initializes and coordinates all modules
- Creates instances of all managers
- Registers plugins
- Sets up event listeners
- Coordinates application flow

### config.js
**Configuration** - Centralized constants
- Poll interval
- Storage keys
- Chain IDs and names
- No external dependencies

### utils.js
**Utilities** - Pure helper functions
- Number formatting
- Address formatting
- Chain name lookup
- Value calculations

### plugin-system.js
**Plugin Architecture** - Base classes for extensibility
- `VaultPlugin` - Base class for all plugins
- `PluginRegistry` - Manages plugin registration and retrieval
- Defines plugin contract/interface

### data-manager.js
**Data Orchestration** - Handles all data fetching
- Fetches data from all registered plugins
- Manages polling intervals
- Controls loading states
- Aggregates results from multiple sources

### ui-manager.js
**UI Rendering** - All DOM manipulation
- Renders vault positions
- Renders rewards
- Updates totals
- Updates timestamps
- Handles all visual updates

### wallet-manager.js
**Wallet State** - Wallet address management
- Add/remove wallets
- localStorage persistence
- Wallet list rendering
- Address validation

### plugins/*
**Data Source Plugins** - Individual data source implementations
- Each plugin extends `VaultPlugin`
- Implements `fetchData(address)` method
- Returns standardized data format
- Independent and isolated

## Data Flow

```
User Action (Add Wallet)
    ↓
WalletManager (validate, store)
    ↓
Main.js (coordinate)
    ↓
DataManager (fetch from all plugins)
    ↓
Individual Plugins (fetch external data)
    ↓
DataManager (aggregate results)
    ↓
UIManager (render to DOM)
```

## Plugin System

### How to Add a New Data Source

1. Create a new file in `js/plugins/your-source.js`
2. Extend the `VaultPlugin` class
3. Implement the `fetchData(address)` method
4. Return data in the standard format
5. Register the plugin in `main.js`

Example:

```javascript
import { VaultPlugin } from '../plugin-system.js';

export class YourPlugin extends VaultPlugin {
    constructor() {
        super('YourSource', 'vault'); // or 'rewards'
    }

    async fetchData(address) {
        // Fetch data from your API
        const data = await fetch(`your-api/${address}`);

        // Return standardized format
        return [{
            source: this.name,
            chainId: 1,
            chainName: 'Ethereum',
            userAddress: address,
            vaultName: 'My Vault',
            assetSymbol: 'ETH',
            balanceAssets: 1.5,
            balanceUsd: 3000,
            // ... other fields
        }];
    }
}
```

Then register in `main.js`:

```javascript
import { YourPlugin } from './plugins/your-source.js';

registerPlugins() {
    this.pluginRegistry.register(new YourPlugin());
}
```

## Standard Data Format

### Vault Position Object
```javascript
{
    source: string,           // Plugin name (e.g., "Morpho")
    chainId: number,          // Chain ID
    chainName: string,        // Human-readable chain name
    userAddress: string,      // Wallet address
    vaultAddress: string,     // Vault contract address (optional)
    vaultName: string,        // Vault display name
    vaultSymbol: string,      // Vault symbol
    assetSymbol: string,      // Underlying asset symbol
    assetDecimals: number,    // Token decimals
    assetPriceUsd: number,    // Price per asset in USD
    balanceAssets: number,    // Balance in asset units (adjusted)
    balanceUsd: number,       // Balance in USD
    apy: number,              // APY (optional)
    netApy: number            // Net APY after fees (optional)
}
```

### Reward Object
```javascript
{
    source: string,           // Plugin name (e.g., "Merkl")
    chainId: number,          // Chain ID
    chainName: string,        // Human-readable chain name
    userAddress: string,      // Wallet address
    tokenSymbol: string,      // Reward token symbol
    tokenDecimals: number,    // Token decimals
    tokenPrice: number,       // Token price in USD
    amount: string,           // Total earned (raw with decimals)
    claimed: string,          // Amount claimed (raw with decimals)
    pending: string           // Amount pending (raw with decimals)
}
```

## Benefits of This Architecture

1. **Modularity** - Each file has a single, clear responsibility
2. **Testability** - Pure functions and isolated modules are easy to test
3. **Maintainability** - Easy to find and modify specific functionality
4. **Extensibility** - Add new data sources by creating new plugins
5. **Readability** - Clean imports show dependencies clearly
6. **Reusability** - Utility functions can be used anywhere
7. **Scalability** - Easy to add features without touching existing code

## ES6 Modules

The application uses ES6 modules (`import`/`export`) which provides:
- Clear dependency management
- Tree shaking (smaller bundles)
- Better IDE support
- Namespace isolation
- Static analysis

Note: ES6 modules require a local server to run (CORS restrictions). Use:
```bash
python3 -m http.server 8000
# Then visit http://localhost:8000
```
