/**
 * Test script for Moonwell API
 */

const testAddress = '0x7C008EfE8428b473852DCCb9FeBa918d559878C2';

async function testMoonwellBase() {
    const query = `
        query GetUserPositions($user: String!) {
            account(id: $user) {
                id
                positions(where: { supplyBalanceUnderlying_gt: "0" }) {
                    id
                    market {
                        id
                        name
                        symbol
                        underlyingSymbol
                        underlyingDecimals
                        underlyingPriceUSD
                        supplyAPY
                    }
                    supplyBalanceUnderlying
                    borrowBalanceUnderlying
                }
            }
        }
    `;

    try {
        console.log('Testing Moonwell Base API...');
        const response = await fetch('https://api.studio.thegraph.com/query/47991/moonwell-base/version/latest', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                query,
                variables: {
                    user: testAddress.toLowerCase()
                }
            })
        });

        const data = await response.json();
        console.log('Base Response:', JSON.stringify(data, null, 2));
    } catch (error) {
        console.error('Error:', error);
    }
}

async function testMoonwellOptimism() {
    const query = `
        query GetUserPositions($user: String!) {
            account(id: $user) {
                id
                positions(where: { supplyBalanceUnderlying_gt: "0" }) {
                    id
                    market {
                        id
                        name
                        symbol
                        underlyingSymbol
                        underlyingDecimals
                        underlyingPriceUSD
                        supplyAPY
                    }
                    supplyBalanceUnderlying
                    borrowBalanceUnderlying
                }
            }
        }
    `;

    try {
        console.log('\nTesting Moonwell Optimism API...');
        const response = await fetch('https://api.studio.thegraph.com/query/47991/moonwell-optimism/version/latest', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                query,
                variables: {
                    user: testAddress.toLowerCase()
                }
            })
        });

        const data = await response.json();
        console.log('Optimism Response:', JSON.stringify(data, null, 2));
    } catch (error) {
        console.error('Error:', error);
    }
}

testMoonwellBase();
testMoonwellOptimism();
