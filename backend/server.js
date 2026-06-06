const express = require('express');
const axios = require('axios');
const cors = require('cors');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 3001;
const FRED_API_KEY = process.env.FRED_API_KEY;
const NEWS_API_KEY = process.env.NEWS_API_KEY;
const EXCHANGE_API_KEY = process.env.EXCHANGE_API_KEY;

// Inflation
app.get('/api/inflation', async (req, res) => {
  try {
    const response = await axios.get(`https://api.stlouisfed.org/fred/series/observations?series_id=CPIAUCSL&api_key=${FRED_API_KEY}&sort_order=desc&limit=1&file_type=json`);
    res.json(response.data);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch inflation data' });
  }
});

// GDP
app.get('/api/gdp', async (req, res) => {
  try {
    const response = await axios.get(`https://api.stlouisfed.org/fred/series/observations?series_id=GDP&api_key=${FRED_API_KEY}&sort_order=desc&limit=1&file_type=json`);
    res.json(response.data);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch GDP data' });
  }
});

// Exchange Rate
app.get('/api/exchange', async (req, res) => {
  try {
    const response = await axios.get(`https://v6.exchangerate-api.com/v6/${EXCHANGE_API_KEY}/latest/USD`);
    res.json(response.data);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch exchange rate data' });
  }
});

// News
app.get('/api/news', async (req, res) => {
  try {
    const response = await axios.get(`https://newsapi.org/v2/everything?q=kenya+economy&sortBy=publishedAt&apiKey=${NEWS_API_KEY}`);
    res.json(response.data);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch news data' });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});