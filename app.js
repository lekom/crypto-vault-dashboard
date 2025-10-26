// Morpho Vault Dashboard Application

const MORPHO_API_URL = 'https://api.morpho.org/graphql';
const MERKL_API_URL = 'https://api.merkl.xyz';
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
let rewardsData = [];
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

        // Fetch Merkl rewards for all wallets
        const rewardsPromises = wallets.map(address => fetchMerklRewards(address));
        const rewardsResults = await Promise.all(rewardsPromises);

        // Flatten and combine rewards
        rewardsData = rewardsResults.flat();

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
    renderRewards();
    updateTotalBalance();
    updateSectionTotals();
    updateLastUpdateTime();

    // Remove updating class after transition
    setTimeout(() => {
        totalElement.classList.remove('updating');
    }, 300);
}

async function fetchUserVaults(userAddress, chainId) {
    // Step 1: Get user's vault positions using the documented vaultPositions query
    const positionsQuery = `
        query GetUserPositions($chainId: Int!, $userAddress: String!) {
            vaultPositions(
                where: {
                    chainId_in: [$chainId]
                    shares_gte: 0
                    userAddress_in: [$userAddress]
                }
            ) {
                items {
                    id
                    assets
                    shares
                    vault {
                        id
                        address
                    }
                }
            }
        }
    `;

    try {
        const positionsResponse = await fetch(MORPHO_API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                query: positionsQuery,
                variables: {
                    chainId,
                    userAddress
                }
            })
        });

        const positionsData = await positionsResponse.json();

        if (positionsData.errors) {
            console.warn(`GraphQL errors for ${getChainName(chainId)}:`, positionsData.errors);
            return [];
        }

        const positions = positionsData.data?.vaultPositions?.items || [];

        if (positions.length === 0) {
            return [];
        }

        // Step 2: Fetch detailed vault data for each vault
        const vaultDetailsPromises = positions.map(position =>
            fetchVaultDetails(position.vault.address, chainId)
        );
        const vaultDetails = await Promise.all(vaultDetailsPromises);

        // Step 3: Merge positions with vault details
        return positions
            .map((position, index) => {
                const details = vaultDetails[index];
                if (!details) return null;

                const decimals = details.assetDecimals;
                const rawAssets = parseFloat(position.assets);
                const adjustedAssets = rawAssets / Math.pow(10, decimals);

                return {
                    chainId,
                    chainName: getChainName(chainId),
                    userAddress,
                    vaultAddress: position.vault.address,
                    vaultName: details.name,
                    vaultSymbol: details.symbol,
                    assetSymbol: details.assetSymbol,
                    assetAddress: details.assetAddress,
                    assetDecimals: decimals,
                    assetPriceUsd: details.assetPriceUsd,
                    balanceShares: position.shares,
                    balanceAssets: adjustedAssets,
                    balanceUsd: details.totalAssetsUsd ? (adjustedAssets * details.assetPriceUsd) : 0,
                    apy: details.apy,
                    netApy: details.netApy
                };
            })
            .filter(item => item !== null && item.balanceAssets > 0);
    } catch (error) {
        console.error(`Error fetching vaults for ${userAddress} on ${getChainName(chainId)}:`, error);
        return [];
    }
}

async function fetchVaultDetails(vaultAddress, chainId) {
    const vaultQuery = `
        query GetVaultDetails($vaultAddress: String!, $chainId: Int!) {
            vaultByAddress(address: $vaultAddress, chainId: $chainId) {
                address
                name
                symbol
                state {
                    totalAssets
                    totalAssetsUsd
                    apy
                    netApy
                }
                asset {
                    address
                    symbol
                    decimals
                    priceUsd
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
                query: vaultQuery,
                variables: {
                    vaultAddress,
                    chainId
                }
            })
        });

        const data = await response.json();

        if (data.errors) {
            console.warn(`Could not fetch details for vault ${vaultAddress.slice(0, 8)}...`);
            return null;
        }

        const vault = data.data?.vaultByAddress;
        if (!vault) return null;

        return {
            name: vault.name || vault.symbol || 'Unknown Vault',
            symbol: vault.symbol || 'VAULT',
            assetSymbol: vault.asset?.symbol || 'TOKEN',
            assetAddress: vault.asset?.address || '',
            assetDecimals: parseInt(vault.asset?.decimals || 18),
            assetPriceUsd: parseFloat(vault.asset?.priceUsd || 0),
            totalAssetsUsd: parseFloat(vault.state?.totalAssetsUsd || 0),
            apy: parseFloat(vault.state?.apy || 0),
            netApy: parseFloat(vault.state?.netApy || 0)
        };
    } catch (error) {
        console.warn(`Error fetching vault details for ${vaultAddress.slice(0, 8)}...`);
        return null;
    }
}

// Fetch rewards from Merkl API for all supported chains
async function fetchMerklRewards(userAddress) {
    try {
        // Fetch rewards for each chain
        const rewardsPromises = SUPPORTED_CHAINS.map(chainId =>
            fetchMerklRewardsForChain(userAddress, chainId)
        );
        const rewardsResults = await Promise.all(rewardsPromises);

        // Flatten and combine all rewards
        return rewardsResults.flat();
    } catch (error) {
        console.warn(`Error fetching Merkl rewards for ${userAddress.slice(0, 8)}...`);
        return [];
    }
}

async function fetchMerklRewardsForChain(userAddress, chainId) {
    try {
        const response = await fetch(
            `${MERKL_API_URL}/v4/users/${userAddress}/rewards?chainId=${chainId}&breakdownPage=0`,
            {
                method: 'GET',
                headers: {
                    'Accept': '*/*',
                }
            }
        );

        if (!response.ok) {
            return [];
        }

        const data = await response.json();

        // Response is an array where each element has chain and rewards
        if (Array.isArray(data) && data.length > 0) {
            const allRewards = [];

            for (const chainData of data) {
                if (chainData.rewards && Array.isArray(chainData.rewards)) {
                    for (const reward of chainData.rewards) {
                        allRewards.push({
                            chainId: chainId,
                            chainName: getChainName(chainId),
                            userAddress: userAddress,
                            distributionChainId: reward.distributionChainId,
                            amount: reward.amount,
                            claimed: reward.claimed || "0",
                            pending: reward.pending || "0",
                            recipient: reward.recipient,
                            root: reward.root,
                            tokenSymbol: reward.token?.symbol || 'TOKEN',
                            tokenDecimals: reward.token?.decimals || 18,
                            tokenAddress: reward.token?.address || '',
                            tokenPrice: reward.token?.price || 0
                        });
                    }
                }
            }

            return allRewards;
        }

        return [];
    } catch (error) {
        console.warn(`Could not fetch Merkl rewards for chain ${chainId}`);
        return [];
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

    // Sort vaults by display value (big green number) descending
    const sortedVaults = [...vaultsData].sort((a, b) => {
        return getDisplayValue(b) - getDisplayValue(a);
    });

    container.innerHTML = sortedVaults.map(vault => {
        const displayValue = getDisplayValue(vault);

        return `
            <div class="vault-item">
                <div class="vault-header">
                    <div class="vault-info">
                        <h3>
                            ${vault.vaultName || vault.vaultSymbol}
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
                </div>
            </div>
        `;
    }).join('');
}

// Render rewards
function renderRewards() {
    const container = document.getElementById('rewardsList');

    if (rewardsData.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <div class="empty-icon">💎</div>
                <p>Rewards will appear here when available</p>
            </div>
        `;
        return;
    }

    // Sort rewards by unclaimed USD value (big green number) descending
    const sortedRewards = [...rewardsData].sort((a, b) => {
        const aAdjusted = parseFloat(a.amount) / Math.pow(10, a.tokenDecimals);
        const aClaimed = parseFloat(a.claimed) / Math.pow(10, a.tokenDecimals);
        const aUnclaimed = aAdjusted - aClaimed;
        const aUsdValue = aUnclaimed * a.tokenPrice;

        const bAdjusted = parseFloat(b.amount) / Math.pow(10, b.tokenDecimals);
        const bClaimed = parseFloat(b.claimed) / Math.pow(10, b.tokenDecimals);
        const bUnclaimed = bAdjusted - bClaimed;
        const bUsdValue = bUnclaimed * b.tokenPrice;

        return bUsdValue - aUsdValue;
    });

    container.innerHTML = sortedRewards.map(reward => {
        const adjustedAmount = parseFloat(reward.amount) / Math.pow(10, reward.tokenDecimals);
        const adjustedClaimed = parseFloat(reward.claimed) / Math.pow(10, reward.tokenDecimals);
        const adjustedPending = parseFloat(reward.pending) / Math.pow(10, reward.tokenDecimals);
        const unclaimed = adjustedAmount - adjustedClaimed;
        const unclaimedUsdValue = unclaimed * reward.tokenPrice;
        const totalUsdValue = adjustedAmount * reward.tokenPrice;

        return `
            <div class="reward-item">
                <div class="vault-header">
                    <div class="vault-info">
                        <h3>
                            ${reward.tokenSymbol} Rewards
                        </h3>
                        <div class="vault-address">
                            <span class="chain-badge">${reward.chainName}</span>
                            Wallet: ${formatAddress(reward.userAddress)}
                        </div>
                    </div>
                    <div class="vault-balance">
                        <div class="balance-amount">$${formatNumber(unclaimedUsdValue)}</div>
                        <div class="balance-asset">
                            ${formatNumber(unclaimed)} ${reward.tokenSymbol} Unclaimed
                        </div>
                    </div>
                </div>
                <div class="vault-details">
                    <div class="detail-item">
                        <span class="detail-label">Total Earned</span>
                        <span class="detail-value">${formatNumber(adjustedAmount)} ${reward.tokenSymbol}</span>
                    </div>
                    <div class="detail-item">
                        <span class="detail-label">Claimed</span>
                        <span class="detail-value">${formatNumber(adjustedClaimed)} ${reward.tokenSymbol}</span>
                    </div>
                    <div class="detail-item">
                        <span class="detail-label">Token Price</span>
                        <span class="detail-value">$${formatNumber(reward.tokenPrice)}</span>
                    </div>
                    <div class="detail-item">
                        <span class="detail-label">Distribution Chain</span>
                        <span class="detail-value">${getChainName(reward.distributionChainId)}</span>
                    </div>
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
    // Sum vault balances
    const vaultsTotal = vaultsData.reduce((sum, vault) => {
        return sum + getDisplayValue(vault);
    }, 0);

    // Sum unclaimed rewards
    const rewardsTotal = rewardsData.reduce((sum, reward) => {
        const adjustedAmount = parseFloat(reward.amount) / Math.pow(10, reward.tokenDecimals);
        const adjustedClaimed = parseFloat(reward.claimed) / Math.pow(10, reward.tokenDecimals);
        const unclaimed = adjustedAmount - adjustedClaimed;
        const unclaimedUsdValue = unclaimed * reward.tokenPrice;
        return sum + unclaimedUsdValue;
    }, 0);

    const total = vaultsTotal + rewardsTotal;

    const totalElement = document.getElementById('totalBalance');
    totalElement.textContent = `$${formatNumber(total)}`;
}

// Update section totals in headers
function updateSectionTotals() {
    // Calculate vaults total (sum of big green numbers)
    const vaultsTotal = vaultsData.reduce((sum, vault) => {
        return sum + getDisplayValue(vault);
    }, 0);

    // Calculate rewards total (sum of unclaimed USD values)
    const rewardsTotal = rewardsData.reduce((sum, reward) => {
        const adjustedAmount = parseFloat(reward.amount) / Math.pow(10, reward.tokenDecimals);
        const adjustedClaimed = parseFloat(reward.claimed) / Math.pow(10, reward.tokenDecimals);
        const unclaimed = adjustedAmount - adjustedClaimed;
        const unclaimedUsdValue = unclaimed * reward.tokenPrice;
        return sum + unclaimedUsdValue;
    }, 0);

    // Update DOM elements
    const vaultsTotalElement = document.getElementById('vaultsTotal');
    const rewardsTotalElement = document.getElementById('rewardsTotal');

    if (vaultsTotalElement) {
        vaultsTotalElement.textContent = `$${formatNumber(vaultsTotal)}`;
    }

    if (rewardsTotalElement) {
        rewardsTotalElement.textContent = `$${formatNumber(rewardsTotal)}`;
    }
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
