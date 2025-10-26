# Crypto Vault Dashboard

A multi-chain, multi-protocol vault tracking dashboard with a beautiful space-themed UI.

## Features

- 🚀 Track vault positions across multiple protocols
- 💎 Monitor rewards from various sources
- 🌐 Multi-chain support (Ethereum, Base, Optimism, Arbitrum, Hyperliquid)
- 💰 Real-time USD valuations with APY tracking
- 🔄 Auto-refresh every 30 seconds with seamless updates
- 💾 Persistent wallet storage (localStorage)
- 📱 Fully responsive mobile design
- 🎨 Beautiful space-themed UI with animations
- ⚡ Fast development with Vite + HMR

<img width="1083" height="1290" alt="image" src="https://github.com/user-attachments/assets/b3c45b41-9364-4401-9763-29f4cfdbb798" />

## Supported Protocols

### Vaults
- **Morpho** - DeFi lending optimizer (Ethereum, Base, Arbitrum) with APY tracking
- **Hyperliquid HLP** - HLP vault deposits on Hyperliquid L1 with past month APY
- **Moonwell** - Lending markets on Base and Optimism with supply APY and Net APY

### Rewards
- **Merkl** - Token distribution rewards (all chains)
- **Moonwell** - WELL token rewards on Base and Optimism

## Quick Start

### 1. Install Dependencies

```bash
npm install
```

### 2. Start Development Server

```bash
npm run dev
```

This will start Vite development server with hot module replacement (HMR).

### 3. Open in Browser

Navigate to the URL shown in the terminal (usually `http://localhost:5173`)

### 4. Build for Production

```bash
npm run build
```

This creates optimized production files in the `dist` folder.

### 5. Add Wallet Addresses

1. Enter an EVM wallet address in the input field
2. Click "Add Wallet" or press Enter
3. The dashboard will automatically fetch data from all supported protocols

## Project Structure

```
/
├── index.html                 # Main HTML file
├── styles.css                 # Styling
├── vite.config.js            # Vite configuration
├── package.json              # Dependencies and scripts
├── js/
│   ├── main.js               # Application entry point
│   ├── config.js             # Configuration (poll interval, chain IDs)
│   ├── utils.js              # Utility functions
│   ├── plugin-system.js      # Plugin architecture base classes
│   ├── data-manager.js       # Data fetching orchestration
│   ├── ui-manager.js         # UI rendering
│   ├── wallet-manager.js     # Wallet management
│   └── plugins/
│       ├── morpho.js         # Morpho vault integration
│       ├── merkl.js          # Merkl rewards integration
│       ├── hyperliquid.js    # Hyperliquid HLP integration
│       ├── moonwell.js       # Moonwell vault integration
│       └── moonwell-rewards.js # Moonwell rewards integration
```

## API Integrations

### Morpho
- **Endpoint**: `https://api.morpho.org/graphql`
- **Type**: GraphQL
- **Data**: Vault positions and details

### Merkl
- **Endpoint**: `https://api.merkl.xyz/v4/users/{address}/rewards`
- **Type**: REST API
- **Data**: Token rewards and claims

### Hyperliquid
- **Endpoint**: `https://api.hyperliquid.xyz/info`
- **Type**: POST API
- **Requests**:
  - `userVaultEquities`: Get user's vault positions
  - `vaultDetails`: Get vault APR and metadata
- **Data**: HLP vault equity positions with past month APY

### Moonwell
- **SDK**: `@moonwell-fi/moonwell-sdk` (v0.9.7)
- **Type**: Official TypeScript SDK
- **Data**:
  - Vault positions: Supply balances, base APY, total APR (with rewards)
  - Rewards: WELL token rewards (supply + borrow incentives)
- **RPC Endpoints**: Uses publicnode.com RPCs to avoid rate limits
- **APY Calculation**: Fetches full market data to get accurate APY values

## Adding New Data Sources

Quick example:

```javascript
// js/plugins/your-protocol.js
import { VaultPlugin } from '../plugin-system.js';

export class YourProtocolPlugin extends VaultPlugin {
    constructor() {
        super('YourProtocol', 'vault'); // or 'rewards'
    }

    async fetchData(address) {
        // Fetch from your API
        const response = await fetch(`your-api/${address}`);
        const data = await response.json();

        // Return standardized format
        return [{
            source: this.name,
            chainId: 1,
            chainName: 'Ethereum',
            userAddress: address,
            vaultName: 'Your Vault',
            assetSymbol: 'USDC',
            balanceAssets: 1000,
            balanceUsd: 1000,
            // ... other fields
        }];
    }
}
```

Then register in `js/main.js`:

```javascript
import { YourProtocolPlugin } from './plugins/your-protocol.js';

registerPlugins() {
    this.pluginRegistry.register(new YourProtocolPlugin());
}
```

## Development

### Technology Stack

- **Build Tool**: Vite 7.x with Hot Module Replacement (HMR)
- **Package Manager**: npm
- **Module System**: ES6 modules (import/export)
- **Dependencies**:
  - `@moonwell-fi/moonwell-sdk` - Moonwell protocol integration
  - `@metamask/delegation-toolkit` - Required peer dependency

### File Organization

- **Config & Utils**: Pure functions, no side effects
- **Managers**: Orchestrate specific responsibilities (data, UI, wallets)
- **Plugins**: Independent data source integrations
- **Main**: Application coordinator
- **Plugin Timeout**: 5 seconds per plugin to prevent hanging
- **Poll Interval**: 5 minutes between automatic data refreshes

### Code Style

- ES6 modules (import/export)
- Class-based architecture
- Async/await for promises
- JSDoc comments
- Single Responsibility Principle

### Testing

Check syntax of all JavaScript files:
```bash
npm test
```

Or manually:
```bash
find js -name "*.js" -exec node --check {} \;
```

### Development Server

Vite automatically handles:
- Module bundling and optimization
- Hot module replacement (HMR) for instant updates
- Dependency pre-bundling for faster page loads
- ES module serving with correct MIME types

## Browser Support

- Chrome/Edge (recommended)
- Firefox
- Safari
- Any modern browser with ES6 module support

## License

MIT

## Contributing

1. Create a new plugin in `js/plugins/`
2. Follow the existing plugin structure
3. Return data in the standard format
4. Test thoroughly
5. Update documentation

## Support

For issues or questions, please open an issue on GitHub.
