require('dotenv').config();
const express = require('express');
const axios = require('axios');
const cors = require('cors'); // Import the cors package

const app = express();
const port = process.env.PORT || 3000;

// Ensure environment variables are set
if (!process.env.COVALENT_API_KEY || !process.env.COINGECKO_API_URL) {
  console.error('Environment variables are not set correctly.');
  process.exit(1);
}

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

const FIXED_BTC_BALANCE = 0.15;

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
        key: process.env.COVALENT_API_KEY
      }
    });
    return response.data.data.items;
  } catch (error) {
    console.error(`Error fetching ETH balances for wallet ${wallet}:`, error.response ? error.response.data : error.message);
    throw error;
  }
}

async function fetchSolTokenBalances(wallet) {
  try {
    const response = await axios.get(`https://api.covalenthq.com/v1/1399811149/address/${wallet}/balances_v2/`, {
      params: {
        key: process.env.COVALENT_API_KEY
      }
    });
    return response.data.data.items;
  } catch (error) {
    console.error(`Error fetching SOL balances for wallet ${wallet}:`, error.response ? error.response.data : error.message);
    throw error;
  }
}

async function fetchCryptoPrice(cryptoIds) {
  try {
    const response = await axios.get(`${process.env.COINGECKO_API_URL}/simple/price`, {
      params: {
        ids: cryptoIds.join(','),
        vs_currencies: 'usd'
      }
    });
    return response.data;
  } catch (error) {
    console.error('Error fetching crypto prices:', error.response ? error.response.data : error.message);
    throw error;
  }
}

async function calculatePortfolioValue() {
  try {
    let totalValue = 0;

    const ethTokenBalances = (await Promise.all(ETH_WALLETS.map(fetchEthTokenBalances))).flat();
    const solTokenBalances = (await Promise.all(SOL_WALLETS.map(fetchSolTokenBalances))).flat();

    const allTokens = [...ethTokenBalances, ...solTokenBalances];

    const uniqueTokenIds = [...new Set(allTokens.map(token => {
      if (token.contract_name) {
        return TOKEN_NAME_MAP[token.contract_name] || token.contract_name.toLowerCase();
      }
      return null;
    }).filter(Boolean))];

    uniqueTokenIds.push('bitcoin');

    const prices = await fetchCryptoPrice(uniqueTokenIds);

    allTokens.forEach(token => {
      if (!token.contract_name) {
        return;
      }

      const tokenName = TOKEN_NAME_MAP[token.contract_name] || token.contract_name.toLowerCase();
      const price = prices[tokenName] ? prices[tokenName].usd : 0;

      if (price === 0) {
        return;
      }

      const balance = token.balance / Math.pow(10, token.contract_decimals);

      if (balance > 1e10) {
        return;
      }

      totalValue += balance * price;
    });

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
    timestamps.push(now.toISOString().substring(11, 19));

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
  setInterval(updatePortfolioValue, 181000);
});
