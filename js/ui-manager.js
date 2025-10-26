/**
 * UI Manager
 * Handles all rendering and UI updates
 */

import { formatNumber, formatAddress, getDisplayValue, getChainName } from './utils.js';

export class UIManager {
    constructor() {
        this.vaultsData = [];
        this.rewardsData = [];
    }

    /**
     * Update UI with new data
     * @param {Array} vaultsData - Vaults data
     * @param {Array} rewardsData - Rewards data
     */
    updateUI(vaultsData, rewardsData) {
        this.vaultsData = vaultsData;
        this.rewardsData = rewardsData;

        // Add subtle flash effect to show data is updating
        const totalElement = document.getElementById('totalBalance');
        totalElement.classList.add('updating');

        this.renderVaults();
        this.renderRewards();
        this.updateTotalBalance();
        this.updateSectionTotals();
        this.updateLastUpdateTime();

        // Remove updating class after transition
        setTimeout(() => {
            totalElement.classList.remove('updating');
        }, 300);
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

        container.innerHTML = sortedVaults.map(vault => {
            const displayValue = getDisplayValue(vault);

            return `
                <div class="vault-item">
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
                            <div class="balance-amount">$${formatNumber(displayValue)}</div>
                            <div class="balance-asset">
                                ${formatNumber(vault.balanceAssets)} ${vault.assetSymbol}
                            </div>
                        </div>
                    </div>
                    <div class="vault-details">
                        ${vault.apy !== undefined ? `
                        <div class="detail-item">
                            <span class="detail-label">APY</span>
                            <span class="detail-value">${formatNumber(vault.apy * 100)}%</span>
                        </div>
                        ` : ''}
                        ${vault.netApy !== undefined ? `
                        <div class="detail-item">
                            <span class="detail-label">Net APY</span>
                            <span class="detail-value">${formatNumber(vault.netApy * 100)}%</span>
                        </div>
                        ` : ''}
                        ${vault.assetPriceUsd !== undefined ? `
                        <div class="detail-item">
                            <span class="detail-label">Asset Price</span>
                            <span class="detail-value">$${formatNumber(vault.assetPriceUsd)}</span>
                        </div>
                        ` : ''}
                    </div>
                </div>
            `;
        }).join('');
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

        container.innerHTML = sortedRewards.map(reward => {
            const adjustedAmount = parseFloat(reward.amount) / Math.pow(10, reward.tokenDecimals);
            const adjustedClaimed = parseFloat(reward.claimed) / Math.pow(10, reward.tokenDecimals);
            const adjustedPending = parseFloat(reward.pending) / Math.pow(10, reward.tokenDecimals);
            const unclaimed = adjustedAmount - adjustedClaimed;
            const unclaimedUsdValue = unclaimed * reward.tokenPrice;

            return `
                <div class="reward-item">
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
                            <div class="balance-amount">$${formatNumber(unclaimedUsdValue)}</div>
                            <div class="balance-asset">
                                ${formatNumber(unclaimed)} ${reward.tokenSymbol} ${reward.source === 'Moonwell' ? 'Claimable' : 'Unclaimed'}
                            </div>
                        </div>
                    </div>
                    <div class="vault-details">
                        <div class="detail-item">
                            <span class="detail-label">${reward.source === 'Moonwell' ? 'Claimable' : 'Total Earned'}</span>
                            <span class="detail-value">${formatNumber(adjustedAmount)} ${reward.tokenSymbol}</span>
                        </div>
                        ${adjustedClaimed > 0 ? `
                        <div class="detail-item">
                            <span class="detail-label">Claimed</span>
                            <span class="detail-value">${formatNumber(adjustedClaimed)} ${reward.tokenSymbol}</span>
                        </div>
                        ` : ''}
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
