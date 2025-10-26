/**
 * UI Manager
 * Handles all rendering and UI updates
 */

import { formatNumber, formatAddress, getDisplayValue, getChainName } from './utils.js';

export class UIManager {
    constructor() {
        this.vaultsData = [];
        this.rewardsData = [];
        this.isFirstRender = true;
    }

    /**
     * Update UI with new data
     * @param {Array} vaultsData - Vaults data
     * @param {Array} rewardsData - Rewards data
     */
    updateUI(vaultsData, rewardsData) {
        const needsFullRender = this.isFirstRender ||
                                this.vaultsData.length !== vaultsData.length ||
                                this.rewardsData.length !== rewardsData.length;

        this.vaultsData = vaultsData;
        this.rewardsData = rewardsData;

        if (needsFullRender) {
            // Full render on first load or when item count changes
            this.renderVaults();
            this.renderRewards();
            this.isFirstRender = false;
        } else {
            // Seamless value updates only
            this.updateVaultValues();
            this.updateRewardValues();
        }

        this.updateTotalBalance();
        this.updateSectionTotals();
        this.updateLastUpdateTime();
    }

    /**
     * Render vault positions
     */
    renderVaults() {
        const container = document.getElementById('vaultsList');

        if (this.vaultsData.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <div class="empty-icon">🚀</div>
                    <p>Add wallet addresses to begin tracking your crypto vaults</p>
                </div>
            `;
            return;
        }

        // Sort vaults by display value (big green number) descending
        const sortedVaults = [...this.vaultsData].sort((a, b) => {
            return getDisplayValue(b) - getDisplayValue(a);
        });

        container.innerHTML = sortedVaults.map((vault, index) => {
            const displayValue = getDisplayValue(vault);
            const vaultId = `vault-${index}`;

            return `
                <div class="vault-item" data-vault-id="${vaultId}">
                    <div class="vault-header">
                        <div class="vault-info">
                            <h3>
                                <span>${vault.vaultName || vault.vaultSymbol}</span>
                                ${vault.source ? `<span class="source-badge">${vault.source}</span>` : ''}
                            </h3>
                            <div class="vault-address">
                                <span class="chain-badge">${vault.chainName}</span>
                                Wallet: ${formatAddress(vault.userAddress)}
                            </div>
                        </div>
                        <div class="vault-balance">
                            <div class="balance-amount" data-field="balance">$${formatNumber(displayValue)}</div>
                            <div class="balance-asset" data-field="assets">
                                ${formatNumber(vault.balanceAssets)} ${vault.assetSymbol}
                            </div>
                        </div>
                    </div>
                    <div class="vault-details">
                        ${vault.apy !== undefined ? `
                        <div class="detail-item">
                            <span class="detail-label">APY</span>
                            <span class="detail-value" data-field="apy">${formatNumber(vault.apy * 100)}%</span>
                        </div>
                        ` : ''}
                        ${vault.netApy !== undefined ? `
                        <div class="detail-item">
                            <span class="detail-label">Net APY</span>
                            <span class="detail-value" data-field="netApy">${formatNumber(vault.netApy * 100)}%</span>
                        </div>
                        ` : ''}
                    </div>
                </div>
            `;
        }).join('');
    }

    /**
     * Update vault values without re-rendering HTML
     */
    updateVaultValues() {
        const sortedVaults = [...this.vaultsData].sort((a, b) => {
            return getDisplayValue(b) - getDisplayValue(a);
        });

        sortedVaults.forEach((vault, index) => {
            const vaultId = `vault-${index}`;
            const vaultEl = document.querySelector(`[data-vault-id="${vaultId}"]`);
            if (!vaultEl) return;

            const displayValue = getDisplayValue(vault);

            // Update balance
            const balanceEl = vaultEl.querySelector('[data-field="balance"]');
            if (balanceEl) {
                balanceEl.textContent = `$${formatNumber(displayValue)}`;
                // Add glow effect
                balanceEl.classList.add('glow');
                setTimeout(() => balanceEl.classList.remove('glow'), 1000);
            }

            // Update assets
            const assetsEl = vaultEl.querySelector('[data-field="assets"]');
            if (assetsEl) assetsEl.textContent = `${formatNumber(vault.balanceAssets)} ${vault.assetSymbol}`;

            // Update APY
            if (vault.apy !== undefined) {
                const apyEl = vaultEl.querySelector('[data-field="apy"]');
                if (apyEl) apyEl.textContent = `${formatNumber(vault.apy * 100)}%`;
            }

            // Update Net APY
            if (vault.netApy !== undefined) {
                const netApyEl = vaultEl.querySelector('[data-field="netApy"]');
                if (netApyEl) netApyEl.textContent = `${formatNumber(vault.netApy * 100)}%`;
            }
        });
    }

    /**
     * Render rewards
     */
    renderRewards() {
        const container = document.getElementById('rewardsList');

        if (this.rewardsData.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <div class="empty-icon">💎</div>
                    <p>Rewards will appear here when available</p>
                </div>
            `;
            return;
        }

        // Sort rewards by unclaimed USD value (big green number) descending
        const sortedRewards = [...this.rewardsData].sort((a, b) => {
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

        container.innerHTML = sortedRewards.map((reward, index) => {
            const adjustedAmount = parseFloat(reward.amount) / Math.pow(10, reward.tokenDecimals);
            const adjustedClaimed = parseFloat(reward.claimed) / Math.pow(10, reward.tokenDecimals);
            const adjustedPending = parseFloat(reward.pending) / Math.pow(10, reward.tokenDecimals);
            const unclaimed = adjustedAmount - adjustedClaimed;
            const unclaimedUsdValue = unclaimed * reward.tokenPrice;
            const rewardId = `reward-${index}`;

            return `
                <div class="reward-item" data-reward-id="${rewardId}">
                    <div class="vault-header">
                        <div class="vault-info">
                            <h3>
                                <span>${reward.tokenSymbol} Rewards</span>
                                ${reward.source ? `<span class="source-badge">${reward.source}</span>` : ''}
                            </h3>
                            <div class="vault-address">
                                <span class="chain-badge">${reward.chainName}</span>
                                Wallet: ${formatAddress(reward.userAddress)}
                            </div>
                        </div>
                        <div class="vault-balance">
                            <div class="balance-amount" data-field="balance">$${formatNumber(unclaimedUsdValue)}</div>
                            <div class="balance-asset" data-field="unclaimed">
                                ${formatNumber(unclaimed)} ${reward.tokenSymbol} ${reward.source === 'Moonwell' ? 'Claimable' : 'Unclaimed'}
                            </div>
                        </div>
                    </div>
                    <div class="vault-details">
                        <div class="detail-item">
                            <span class="detail-label">${reward.source === 'Moonwell' ? 'Claimable' : 'Total Earned'}</span>
                            <span class="detail-value" data-field="totalEarned">${formatNumber(adjustedAmount)} ${reward.tokenSymbol}</span>
                        </div>
                        ${adjustedClaimed > 0 ? `
                        <div class="detail-item">
                            <span class="detail-label">Claimed</span>
                            <span class="detail-value" data-field="claimed">${formatNumber(adjustedClaimed)} ${reward.tokenSymbol}</span>
                        </div>
                        ` : ''}
                        <div class="detail-item">
                            <span class="detail-label">Token Price</span>
                            <span class="detail-value" data-field="price">$${formatNumber(reward.tokenPrice)}</span>
                        </div>
                        <div class="detail-item">
                            <span class="detail-label">Distribution Chain</span>
                            <span class="detail-value" data-field="distributionChain">${getChainName(reward.distributionChainId)}</span>
                        </div>
                    </div>
                </div>
            `;
        }).join('');
    }

    /**
     * Update reward values without re-rendering HTML
     */
    updateRewardValues() {
        const sortedRewards = [...this.rewardsData].sort((a, b) => {
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

        sortedRewards.forEach((reward, index) => {
            const rewardId = `reward-${index}`;
            const rewardEl = document.querySelector(`[data-reward-id="${rewardId}"]`);
            if (!rewardEl) return;

            const adjustedAmount = parseFloat(reward.amount) / Math.pow(10, reward.tokenDecimals);
            const adjustedClaimed = parseFloat(reward.claimed) / Math.pow(10, reward.tokenDecimals);
            const unclaimed = adjustedAmount - adjustedClaimed;
            const unclaimedUsdValue = unclaimed * reward.tokenPrice;

            // Update balance (USD value)
            const balanceEl = rewardEl.querySelector('[data-field="balance"]');
            if (balanceEl) {
                balanceEl.textContent = `$${formatNumber(unclaimedUsdValue)}`;
                // Add glow effect
                balanceEl.classList.add('glow');
                setTimeout(() => balanceEl.classList.remove('glow'), 1000);
            }

            // Update unclaimed amount
            const unclaimedEl = rewardEl.querySelector('[data-field="unclaimed"]');
            if (unclaimedEl) {
                const label = reward.source === 'Moonwell' ? 'Claimable' : 'Unclaimed';
                unclaimedEl.textContent = `${formatNumber(unclaimed)} ${reward.tokenSymbol} ${label}`;
            }

            // Update total earned
            const totalEarnedEl = rewardEl.querySelector('[data-field="totalEarned"]');
            if (totalEarnedEl) totalEarnedEl.textContent = `${formatNumber(adjustedAmount)} ${reward.tokenSymbol}`;

            // Update claimed amount
            const claimedEl = rewardEl.querySelector('[data-field="claimed"]');
            if (claimedEl) claimedEl.textContent = `${formatNumber(adjustedClaimed)} ${reward.tokenSymbol}`;

            // Update token price
            const priceEl = rewardEl.querySelector('[data-field="price"]');
            if (priceEl) priceEl.textContent = `$${formatNumber(reward.tokenPrice)}`;

            // Update distribution chain
            const distributionChainEl = rewardEl.querySelector('[data-field="distributionChain"]');
            if (distributionChainEl) distributionChainEl.textContent = getChainName(reward.distributionChainId);
        });
    }

    /**
     * Update total portfolio balance
     */
    updateTotalBalance() {
        // Sum vault balances
        const vaultsTotal = this.vaultsData.reduce((sum, vault) => {
            return sum + getDisplayValue(vault);
        }, 0);

        // Sum unclaimed rewards
        const rewardsTotal = this.rewardsData.reduce((sum, reward) => {
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

    /**
     * Update section totals in headers
     */
    updateSectionTotals() {
        // Calculate vaults total (sum of big green numbers)
        const vaultsTotal = this.vaultsData.reduce((sum, vault) => {
            return sum + getDisplayValue(vault);
        }, 0);

        // Calculate rewards total (sum of unclaimed USD values)
        const rewardsTotal = this.rewardsData.reduce((sum, reward) => {
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

    /**
     * Update last update timestamp
     */
    updateLastUpdateTime() {
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
}
