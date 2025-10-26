// Morpho Vault Dashboard Application

const MORPHO_API_URL = 'https://api.morpho.org/graphql';
const REWARDS_API_URL = 'https://rewards.morpho.org';
const POLL_INTERVAL = 30000; // 30 seconds
const STORAGE_KEY = 'morpho_dashboard_wallets';

// Supported chain IDs
const CHAIN_IDS = {
    ETHEREUM: 1,
    BASE: 8453,
    ARBITRUM: 42161
};

const SUPPORTED_CHAINS = [
    CHAIN_IDS.ETHEREUM,
    CHAIN_IDS.BASE,
    CHAIN_IDS.ARBITRUM
];

// State management
let wallets = [];
let vaultsData = [];
let pollTimer = null;

// Utility function to format numbers with comma separators
function formatNumber(num, decimals = 2) {
    return num.toLocaleString('en-US', {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals
    });
}

// Get chain name from chain ID
function getChainName(chainId) {
    switch (chainId) {
        case CHAIN_IDS.ETHEREUM:
            return 'Ethereum';
        case CHAIN_IDS.BASE:
            return 'Base';
        case CHAIN_IDS.ARBITRUM:
            return 'Arbitrum';
        default:
            return `Chain ${chainId}`;
    }
}

// Initialize app
document.addEventListener('DOMContentLoaded', () => {
    loadWalletsFromStorage();
    setupEventListeners();
    if (wallets.length > 0) {
        fetchAllData();
        startPolling();
    }
});

// Setup event listeners
function setupEventListeners() {
    const addButton = document.getElementById('addWallet');
    const walletInput = document.getElementById('walletInput');

    addButton.addEventListener('click', addWallet);
    walletInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            addWallet();
        }
    });
}

// Wallet management
function addWallet() {
    const input = document.getElementById('walletInput');
    const address = input.value.trim();

    if (!isValidAddress(address)) {
        alert('Please enter a valid EVM address');
        return;
    }

    if (wallets.includes(address.toLowerCase())) {
        alert('This wallet is already added');
        return;
    }

    wallets.push(address.toLowerCase());
    saveWalletsToStorage();
    renderWalletList();
    input.value = '';

    // Fetch data and start polling if this is the first wallet
    if (wallets.length === 1) {
        fetchAllData();
        startPolling();
    } else {
        fetchAllData();
    }
}

function removeWallet(address) {
    wallets = wallets.filter(w => w !== address);
    saveWalletsToStorage();
    renderWalletList();

    if (wallets.length === 0) {
        stopPolling();
        vaultsData = [];
        renderVaults();
        updateTotalBalance();
    } else {
        fetchAllData();
    }
}

function isValidAddress(address) {
    return /^0x[a-fA-F0-9]{40}$/.test(address);
}

// LocalStorage management
function saveWalletsToStorage() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(wallets));
}

function loadWalletsFromStorage() {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
        try {
            wallets = JSON.parse(stored);
            renderWalletList();
        } catch (e) {
            console.error('Error loading wallets from storage:', e);
            wallets = [];
        }
    }
}

// Render wallet list
function renderWalletList() {
    const container = document.getElementById('walletList');

    if (wallets.length === 0) {
        container.innerHTML = '';
        return;
    }

    container.innerHTML = wallets.map(address => `
        <div class="wallet-tag">
            <span class="wallet-address">${formatAddress(address)}</span>
            <button class="btn btn-danger" onclick="removeWallet('${address}')">
                <span>✕</span>
            </button>
        </div>
    `).join('');
}

// Format address for display
function formatAddress(address) {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

// API calls
async function fetchAllData(showLoadingOverlay = true) {
    if (showLoadingOverlay) {
        showLoading(true);
    }

    try {
        // Fetch vault positions for all wallets across all supported chains
        const vaultPromises = [];
        for (const address of wallets) {
            for (const chainId of SUPPORTED_CHAINS) {
                vaultPromises.push(fetchUserVaults(address, chainId));
            }
        }
        const vaultResults = await Promise.all(vaultPromises);

        // Flatten and combine results
        vaultsData = vaultResults.flat();

        // Fetch rewards data for each vault
        const rewardsPromises = vaultsData.map(vault =>
            fetchVaultRewards(vault.vaultAddress, vault.userAddress, vault.chainId)
        );
        const rewardsResults = await Promise.all(rewardsPromises);

        // Merge rewards data
        vaultsData = vaultsData.map((vault, index) => ({
            ...vault,
            rewards: rewardsResults[index]
        }));

        updateVaultsUI();
    } catch (error) {
        console.error('Error fetching data:', error);
        if (showLoadingOverlay) {
            alert('Error fetching vault data. Please check console for details.');
        }
    } finally {
        if (showLoadingOverlay) {
            showLoading(false);
        }
    }
}

// Update UI without full page reload
function updateVaultsUI() {
    // Add subtle flash effect to show data is updating
    const totalElement = document.getElementById('totalBalance');
    totalElement.classList.add('updating');

    renderVaults();
    updateTotalBalance();
    updateLastUpdateTime();

    // Remove updating class after transition
    setTimeout(() => {
        totalElement.classList.remove('updating');
    }, 300);
}

async function fetchUserVaults(userAddress, chainId) {
    const query = `
        query UserVaults($chainId: Int!, $userAddress: String!) {
            userByAddress(chainId: $chainId, address: $userAddress) {
                address
                vaultPositions {
                    vault {
                        address
                        name
                        symbol
                        asset {
                            address
                            symbol
                            decimals
                            priceUsd
                        }
                        state {
                            apy
                            netApy
                        }
                    }
                    shares
                    assets
                    assetsUsd
                }
            }
        }
    `;

    try {
        const response = await fetch(MORPHO_API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                query,
                variables: {
                    chainId,
                    userAddress
                }
            })
        });

        const data = await response.json();

        if (data.errors) {
            // Silently handle errors - some chains may not have data
            console.warn(`No vault data available for chain ${chainId} (${getChainName(chainId)})`);
            return [];
        }

        if (!data.data?.userByAddress?.vaultPositions) {
            // No positions for this user on this chain
            return [];
        }

        return data.data.userByAddress.vaultPositions
            .filter(position => parseFloat(position.assets) > 0)
            .map(position => {
                const decimals = parseInt(position.vault.asset.decimals || 18);
                const rawAssets = parseFloat(position.assets);
                const adjustedAssets = rawAssets / Math.pow(10, decimals);

                return {
                    chainId,
                    chainName: getChainName(chainId),
                    userAddress,
                    vaultAddress: position.vault.address,
                    vaultName: position.vault.name,
                    vaultSymbol: position.vault.symbol,
                    assetSymbol: position.vault.asset.symbol,
                    assetAddress: position.vault.asset.address,
                    assetDecimals: decimals,
                    assetPriceUsd: parseFloat(position.vault.asset.priceUsd || 0),
                    balanceShares: position.shares,
                    balanceAssets: adjustedAssets,
                    balanceUsd: parseFloat(position.assetsUsd || 0),
                    apy: parseFloat(position.vault.state?.apy || 0),
                    netApy: parseFloat(position.vault.state?.netApy || 0)
                };
            });
    } catch (error) {
        console.error(`Error fetching vaults for ${userAddress}:`, error);
        return [];
    }
}

async function fetchVaultRewards(vaultAddress, userAddress, chainId) {
    try {
        // Try to fetch rewards data from Morpho rewards API
        // Note: The rewards API might use different endpoints per chain
        const response = await fetch(
            `${REWARDS_API_URL}/users/${userAddress}/vaults/${vaultAddress}/rewards`,
            {
                method: 'GET',
                headers: {
                    'Accept': 'application/json',
                }
            }
        );

        if (!response.ok) {
            // 404 is expected when there are no rewards for this vault/user - not an error
            if (response.status === 404) {
                return null;
            }
            // Log other errors
            console.warn(`Rewards API returned ${response.status} for vault ${vaultAddress.slice(0, 8)}...`);
            return null;
        }

        const data = await response.json();

        // Parse rewards data
        if (data && data.rewards) {
            return {
                totalUsd: data.rewards.reduce((sum, r) => sum + parseFloat(r.amountUsd || 0), 0),
                tokens: data.rewards.map(r => ({
                    symbol: r.token?.symbol || 'Unknown',
                    amount: parseFloat(r.amount || 0),
                    amountUsd: parseFloat(r.amountUsd || 0)
                }))
            };
        }

        return null;
    } catch (error) {
        // Silently handle network errors - rewards are optional
        return null;
    }
}

// Render vaults
function renderVaults() {
    const container = document.getElementById('vaultsList');

    if (vaultsData.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <div class="empty-icon">🚀</div>
                <p>Add wallet addresses to begin tracking your Morpho vaults</p>
            </div>
        `;
        return;
    }

    container.innerHTML = vaultsData.map(vault => {
        const displayValue = getDisplayValue(vault);
        const rewardsHtml = vault.rewards ? `
            <span class="rewards-badge">
                +$${formatNumber(vault.rewards.totalUsd)} Rewards
            </span>
        ` : '';

        return `
            <div class="vault-item">
                <div class="vault-header">
                    <div class="vault-info">
                        <h3>
                            ${vault.vaultName || vault.vaultSymbol}
                            ${rewardsHtml}
                        </h3>
                        <div class="vault-address">
                            <span class="chain-badge">${vault.chainName}</span>
                            Vault: ${formatAddress(vault.vaultAddress)} |
                            Wallet: ${formatAddress(vault.userAddress)}
                        </div>
                    </div>
                    <div class="vault-balance">
                        <div class="balance-amount">$${formatNumber(displayValue)}</div>
                        <div class="balance-asset">
                            ${formatNumber(vault.balanceAssets)} ${vault.assetSymbol}
                        </div>
                    </div>
                </div>
                <div class="vault-details">
                    <div class="detail-item">
                        <span class="detail-label">APY</span>
                        <span class="detail-value">${formatNumber(vault.apy * 100)}%</span>
                    </div>
                    <div class="detail-item">
                        <span class="detail-label">Net APY</span>
                        <span class="detail-value">${formatNumber(vault.netApy * 100)}%</span>
                    </div>
                    <div class="detail-item">
                        <span class="detail-label">Asset Price</span>
                        <span class="detail-value">$${formatNumber(vault.assetPriceUsd)}</span>
                    </div>
                    ${vault.rewards ? `
                        <div class="detail-item">
                            <span class="detail-label">Rewards</span>
                            <span class="detail-value">
                                ${vault.rewards.tokens.map(t =>
                                    `${formatNumber(t.amount)} ${t.symbol}`
                                ).join(', ')}
                            </span>
                        </div>
                    ` : ''}
                </div>
            </div>
        `;
    }).join('');
}

// Get display value (USDC or USD)
function getDisplayValue(vault) {
    // If asset is USDC or other stablecoin, use the asset balance
    const stablecoins = ['USDC', 'USDT', 'DAI', 'USDC.e'];
    if (stablecoins.includes(vault.assetSymbol)) {
        return vault.balanceAssets;
    }
    // Otherwise use USD value
    return vault.balanceUsd;
}

// Update total balance
function updateTotalBalance() {
    const total = vaultsData.reduce((sum, vault) => {
        let value = getDisplayValue(vault);
        // Add rewards if available
        if (vault.rewards) {
            value += vault.rewards.totalUsd;
        }
        return sum + value;
    }, 0);

    const totalElement = document.getElementById('totalBalance');
    totalElement.textContent = `$${formatNumber(total)}`;
}

// Update last update time
function updateLastUpdateTime() {
    const now = new Date();
    const timeString = now.toLocaleTimeString();
    const dateString = now.toLocaleDateString();

    const updateElement = document.getElementById('lastUpdate');
    updateElement.textContent = `Last updated: ${dateString} at ${timeString}`;

    // Add pulse effect
    updateElement.classList.add('updated');
    setTimeout(() => {
        updateElement.classList.remove('updated');
    }, 1000);
}

// Polling
function startPolling() {
    if (pollTimer) {
        clearInterval(pollTimer);
    }

    pollTimer = setInterval(() => {
        console.log('Polling for updates...');
        // Fetch in background without showing loading overlay
        fetchAllData(false);
    }, POLL_INTERVAL);
}

function stopPolling() {
    if (pollTimer) {
        clearInterval(pollTimer);
        pollTimer = null;
    }
}

// Loading overlay
function showLoading(show) {
    const overlay = document.getElementById('loadingOverlay');
    if (show) {
        overlay.classList.add('active');
    } else {
        overlay.classList.remove('active');
    }
}

// Make functions globally accessible for inline event handlers
window.removeWallet = removeWallet;
