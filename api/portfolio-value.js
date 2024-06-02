export default (req, res) => {
  const covalentApiKey = process.env.COVALENT_API_KEY;
  const coingeckoApiUrl = process.env.COINGECKO_API_URL;

  if (!covalentApiKey || !coingeckoApiUrl) {
    res.status(500).json({ error: 'Environment variables are not set correctly.' });
    return;
  }

  res.status(200).json({ message: 'Environment variables are set correctly.' });
};
