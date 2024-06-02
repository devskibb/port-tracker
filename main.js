require('dotenv').config();
const axios = require('axios');

const ETHERSCAN_API_KEY = process.env.ETHERSCAN_API_KEY;
const COVALENT_API_KEY = process.env.COVALENT_API_KEY;
const COINGECKO_API_URL = process.env.COINGECKO_API_URL;
const SOLANA_RPC_URL = process.env.SOLANA_RPC_URL;

// Your wallet addresses
const ETH_WALLETS = [
  '0xc9be9069f1fd43b82145fa8709050d52d803e81a',
  '0xd00d42fda98e968d8ef446a7f8808103fa1b3fd6',
  '0x1658132c70356ef0a2bc802ed17494d99bd50b71',
];
const SOL_WALLETS = [
  '51Q6WFZH5wjwZJMVF2rNG8v2Wb88CzxDiFSRwpHT8UjH',
  'EUBAG4rGiyFHeUadNGabgoXAzQXp3Mt4hkpW9dgSUsxk',
  'Aoxs9K9FQFEMXvcGDW3XhT4J239v9kYjCc5uaURu6tHK'
];

// Fixed BTC balance
const FIXED_BTC_BALANCE = 0.15;

// Token name mapping
const TOKEN_NAME_MAP = {
  'Wrapped TAO': 'wrapped-tao',
  'enqAI': 'enqai',
  // Add other token name mappings here if needed
};

async function fetchEthTokenBalances(wallet) {
  const response = await axios.get(`https://api.covalenthq.com/v1/1/address/${wallet}/balances_v2/`, {
    params: {
      key: COVALENT_API_KEY
    }
  });
  return response.data.data.items;
}

async function fetchSolTokenBalances(wallet) {
  const response = await axios.get(`https://api.covalenthq.com/v1/1399811149/address/${wallet}/balances_v2/`, {
    params: {
      key: COVALENT_API_KEY
    }
  });
  return response.data.data.items;
}

async function fetchCryptoPrice(cryptoIds) {
  const response = await axios.get(`${COINGECKO_API_URL}/simple/price`, {
    params: {
      ids: cryptoIds.join(','),
      vs_currencies: 'usd'
    }
  });
  return response.data;
}

async function calculatePortfolioValue() {
  let totalValue = 0;

  // Fetch token balances
  const ethTokenBalances = (await Promise.all(ETH_WALLETS.map(fetchEthTokenBalances))).flat();
  const solTokenBalances = (await Promise.all(SOL_WALLETS.map(fetchSolTokenBalances))).flat();

  // Combine all token balances
  const allTokens = [...ethTokenBalances, ...solTokenBalances];

  //console.log("All Tokens: ", allTokens);

  // Get unique token ids
  const uniqueTokenIds = [...new Set(allTokens.map(token => {
    if (token.contract_name) {
      return TOKEN_NAME_MAP[token.contract_name] || token.contract_name.toLowerCase();
    }
    return null;
  }).filter(Boolean))];

  // Add BTC to unique token ids
  uniqueTokenIds.push('bitcoin');

  //console.log("Unique Token IDs: ", uniqueTokenIds);

  // Fetch prices
  const prices = await fetchCryptoPrice(uniqueTokenIds);

  //console.log("Prices: ", prices);

  // Calculate total value
  allTokens.forEach(token => {
    if (!token.contract_name) {
      //console.log(`Skipping token with null name, Balance: ${token.balance}`);
      return;
    }

    const tokenName = TOKEN_NAME_MAP[token.contract_name] || token.contract_name.toLowerCase();
    const price = prices[tokenName] ? prices[tokenName].usd : 0;

    // Skip tokens with zero price
    if (price === 0) {
      //console.log(`Skipping token with zero price: ${token.contract_name}, Balance: ${token.balance}`);
      return;
    }

    const balance = token.balance / Math.pow(10, token.contract_decimals);

    // Log and handle large balance values
    if (balance > 1e10) {
      //console.log(`Large balance detected: Token: ${token.contract_name}, Balance: ${balance}, Price: ${price}`);
      return;
    }

    //console.log(`Token: ${token.contract_name}, Balance: ${balance}, Price: ${price}`);
    totalValue += balance * price;
  });

  // Add BTC value
  const btcPrice = prices.bitcoin ? prices.bitcoin.usd : 0;
  const btcValue = FIXED_BTC_BALANCE * btcPrice;
  totalValue += btcValue;

  //console.log(`BTC Balance: ${FIXED_BTC_BALANCE}, BTC Price: ${btcPrice}, BTC Value: ${btcValue}`);

  return totalValue;
}

async function main() {
  const portfolioValue = await calculatePortfolioValue();
  console.log(`Total Portfolio Value: $${portfolioValue.toFixed(2)}`);
  setInterval(async () => {
    const portfolioValue = await calculatePortfolioValue();
    console.log(`Total Portfolio Value: $${portfolioValue.toFixed(2)}`);
  }, 60000); // Update every 1 minutes
}

main();