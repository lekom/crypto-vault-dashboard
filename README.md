# Crypto Vault Dashboard

A multi-chain, multi-protocol vault tracking dashboard with a beautiful space-themed UI.

## Features

- 🚀 Track vault positions across multiple protocols
- 💎 Monitor rewards from various sources
- 🌐 Multi-chain support (Ethereum, Base, Arbitrum, Hyperliquid)
- 💰 Real-time USD valuations
- 🔄 Auto-refresh every 30 seconds
- 💾 Persistent wallet storage (localStorage)
- 🎨 Beautiful space-themed UI with animations

## Supported Protocols

### Vaults
- **Morpho** - DeFi lending optimizer (Ethereum, Base, Arbitrum)
- **Hyperliquid HLP** - HLP vault deposits on Hyperliquid L1
- **Moonwell** - Lending markets on Base and Optimism

### Rewards
- **Merkl** - Token distribution rewards (all chains)

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

See [ARCHITECTURE.md](ARCHITECTURE.md) for detailed architecture documentation.

```
/
├── index.html              # Main HTML file
├── styles.css              # Styling
├── start-server.sh         # Development server script
├── js/
│   ├── main.js            # Application entry point
│   ├── config.js          # Configuration
│   ├── utils.js           # Utilities
│   ├── plugin-system.js   # Plugin architecture
│   ├── data-manager.js    # Data fetching
│   ├── ui-manager.js      # UI rendering
│   ├── wallet-manager.js  # Wallet management
│   └── plugins/
│       ├── morpho.js      # Morpho integration
│       ├── merkl.js       # Merkl integration
│       ├── hyperliquid.js # Hyperliquid integration
│       └── moonwell.js    # Moonwell (placeholder)
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
- **Request Body**:
  ```json
  {
    "type": "userVaultEquities",
    "user": "0x..."
  }
  ```
- **Data**: HLP vault equity positions

### Moonwell
- **Endpoint (Base)**: `https://api.studio.thegraph.com/query/47991/moonwell-base/version/latest`
- **Endpoint (Optimism)**: `https://api.studio.thegraph.com/query/47991/moonwell-optimism/version/latest`
- **Type**: GraphQL (Subgraph)
- **Data**: Lending market positions, supply/borrow balances, APYs

## Adding New Data Sources

See [ARCHITECTURE.md](ARCHITECTURE.md) for detailed plugin development guide.

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

### File Organization

- **Config & Utils**: Pure functions, no side effects
- **Managers**: Orchestrate specific responsibilities
- **Plugins**: Independent data source integrations
- **Main**: Application coordinator

### Code Style

- ES6 modules (import/export)
- Class-based architecture
- Async/await for promises
- JSDoc comments
- Single Responsibility Principle

### Testing

Check syntax of all JavaScript files:
```bash
find js -name "*.js" -exec node --check {} \;
```

## CORS Issues

If you see CORS errors, make sure you're:
1. Running a local server (not opening `file://` directly)
2. Using `http://localhost:8765` (not `file:///`)
3. Modules are served with correct MIME types

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
