require('dotenv').config();
const express = require('express');
const axios = require('axios');
const cors = require('cors');

const app = express();
const port = process.env.PORT || 3000;

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
};

// Enable CORS for all routes
app.use(cors());

async function fetchEthTokenBalances(wallet) {
  try {
    const response = await axios.get(`https://api.covalenthq.com/v1/1/address/${wallet}/balances_v2/`, {
      params: {
        key: COVALENT_API_KEY
      }
    });
    return response.data.data.items;
  } catch (error) {
    console.error(`Error fetching ETH balances for wallet ${wallet}:`, error);
    throw error;
  }
}

async function fetchSolTokenBalances(wallet) {
  try {
    const response = await axios.get(`https://api.covalenthq.com/v1/1399811149/address/${wallet}/balances_v2/`, {
      params: {
        key: COVALENT_API_KEY
      }
    });
    return response.data.data.items;
  } catch (error) {
    console.error(`Error fetching SOL balances for wallet ${wallet}:`, error);
    throw error;
  }
}

async function fetchCryptoPrice(cryptoIds) {
  try {
    const response = await axios.get(`${COINGECKO_API_URL}/simple/price`, {
      params: {
        ids: cryptoIds.join(','),
        vs_currencies: 'usd'
      }
    });
    return response.data;
  } catch (error) {
    console.error('Error fetching crypto prices:', error);
    throw error;
  }
}

async function calculatePortfolioValue() {
  try {
    let totalValue = 0;

    // Fetch token balances
    const ethTokenBalances = (await Promise.all(ETH_WALLETS.map(fetchEthTokenBalances))).flat();
    const solTokenBalances = (await Promise.all(SOL_WALLETS.map(fetchSolTokenBalances))).flat();

    // Combine all token balances
    const allTokens = [...ethTokenBalances, ...solTokenBalances];

    // Get unique token ids
    const uniqueTokenIds = [...new Set(allTokens.map(token => {
      if (token.contract_name) {
        return TOKEN_NAME_MAP[token.contract_name] || token.contract_name.toLowerCase();
      }
      return null;
    }).filter(Boolean))];

    // Add BTC to unique token ids
    uniqueTokenIds.push('bitcoin');

    // Fetch prices
    const prices = await fetchCryptoPrice(uniqueTokenIds);

    // Calculate total value
    allTokens.forEach(token => {
      if (!token.contract_name) {
        return;
      }

      const tokenName = TOKEN_NAME_MAP[token.contract_name] || token.contract_name.toLowerCase();
      const price = prices[tokenName] ? prices[tokenName].usd : 0;

      // Skip tokens with zero price
      if (price === 0) {
        return;
      }

      const balance = token.balance / Math.pow(10, token.contract_decimals);

      // Log and handle large balance values
      if (balance > 1e10) {
        return;
      }

      totalValue += balance * price;
    });

    // Add BTC value
    const btcPrice = prices.bitcoin ? prices.bitcoin.usd : 0;
    const btcValue = FIXED_BTC_BALANCE * btcPrice;
    totalValue += btcValue;

    return totalValue;
  } catch (error) {
    console.error('Error calculating portfolio value:', error);
    throw error;
  }
}

let values = [];
let timestamps = [];

async function updatePortfolioValue() {
  try {
    const portfolioValue = await calculatePortfolioValue();
    const now = new Date();
    values.push(portfolioValue);
    timestamps.push(now.toISOString().substring(11, 19)); // Only keep HH:MM:SS

    if (values.length > 20) {
      values.shift();
      timestamps.shift();
    }

    console.log('Updated portfolio values:', values);
  } catch (error) {
    console.error('Error updating portfolio value:', error);
  }
}

app.get('/api/portfolio-value', async (req, res) => {
  try {
    await updatePortfolioValue();
    res.json({ values, timestamps });
  } catch (error) {
    console.error('Error handling API request:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
  setInterval(updatePortfolioValue, 181000); // Update every 181 seconds
});
