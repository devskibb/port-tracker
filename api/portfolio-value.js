import axios from 'axios';

export default async (req, res) => {
  const covalentApiKey = process.env.COVALENT_API_KEY;
  const coingeckoApiUrl = process.env.COINGECKO_API_URL;

  console.log('Covalent API Key:', covalentApiKey);
  console.log('Coingecko API URL:', coingeckoApiUrl);

  if (!covalentApiKey || !coingeckoApiUrl) {
    console.error('Environment variables are not set correctly.');
    res.status(500).json({ error: 'Environment variables are not set correctly.' });
    return;
  }

  try {
    console.log('Attempting to fetch data from CoinGecko...');
    const response = await axios.get(`${coingeckoApiUrl}/simple/price`, {
      params: { ids: 'bitcoin', vs_currencies: 'usd' }
    });
    console.log('Data fetched successfully from CoinGecko:', response.data);
    res.status(200).json({ price: response.data });
  } catch (error) {
    console.error('Failed to fetch data from CoinGecko:', error);
    res.status(500).json({ error: 'Failed to fetch data from CoinGecko.' });
  }
};
