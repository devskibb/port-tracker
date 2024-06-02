import axios from 'axios';

export default async (req, res) => {
  const covalentApiKey = process.env.COVALENT_API_KEY;
  const coingeckoApiUrl = process.env.COINGECKO_API_URL;

  if (!covalentApiKey || !coingeckoApiUrl) {
    res.status(500).json({ error: 'Environment variables are not set correctly.' });
    return;
  }

  try {
    const response = await axios.get(`${coingeckoApiUrl}/simple/price`, {
      params: { ids: 'bitcoin', vs_currencies: 'usd' }
    });
    res.status(200).json({ price: response.data });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch data from CoinGecko.' });
  }
};
