require('dotenv').config();
const express = require('express');
const cors = require('cors');

const app = express();
const port = process.env.PORT || 3000;

// Ensure environment variables are set
if (!process.env.COVALENT_API_KEY || !process.env.COINGECKO_API_URL) {
  console.error('Environment variables are not set correctly.');
  process.exit(1);
}

// Enable CORS for all routes
app.use(cors());

// Test route to check server is running
app.get('/api/portfolio-value', async (req, res) => {
  try {
    res.json({ message: 'Server is running' });
  } catch (error) {
    console.error('Error handling API request:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});
