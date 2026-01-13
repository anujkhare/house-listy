import express from 'express';
import cors from 'cors';
import fetch from 'node-fetch';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import fs from 'fs/promises';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3001;

// Basic Auth credentials from environment variables
const AUTH_USERNAME = process.env.AUTH_USERNAME || 'admin';
const AUTH_PASSWORD = process.env.AUTH_PASSWORD || 'changeme';

// Basic Auth middleware
const basicAuth = (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Basic ')) {
    res.setHeader('WWW-Authenticate', 'Basic realm="House Hunter"');
    return res.status(401).json({ error: 'Authentication required' });
  }

  const base64Credentials = authHeader.split(' ')[1];
  const credentials = Buffer.from(base64Credentials, 'base64').toString('ascii');
  const [username, password] = credentials.split(':');

  if (username === AUTH_USERNAME && password === AUTH_PASSWORD) {
    next();
  } else {
    res.setHeader('WWW-Authenticate', 'Basic realm="House Hunter"');
    return res.status(401).json({ error: 'Invalid credentials' });
  }
};

// Enable CORS for development and production
const allowedOrigins = [
  'http://localhost:3000',
  'http://localhost:5173', // Vite default dev port
  process.env.FRONTEND_URL
].filter(Boolean);

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (like mobile apps, Postman, etc.)
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(null, true); // Allow all origins in production since we have auth
    }
  },
  credentials: true
}));

app.use(express.json());

// Storage file path
const STORAGE_FILE = join(__dirname, 'data', 'listings.json');

// Ensure data directory exists
async function ensureDataDir() {
  try {
    await fs.mkdir(join(__dirname, 'data'), { recursive: true });
    // Initialize with empty object if file doesn't exist
    try {
      await fs.access(STORAGE_FILE);
    } catch {
      await fs.writeFile(STORAGE_FILE, JSON.stringify({}));
    }
  } catch (error) {
    console.error('Error creating data directory:', error);
  }
}

ensureDataDir();

// Apply auth to all API routes
app.use('/api', basicAuth);

// Storage API endpoints
app.get('/api/storage/:key', async (req, res) => {
  try {
    const data = JSON.parse(await fs.readFile(STORAGE_FILE, 'utf8'));
    const value = data[req.params.key];

    if (value !== undefined) {
      res.json({ value });
    } else {
      res.status(404).json({ error: 'Key not found' });
    }
  } catch (error) {
    console.error('Error reading storage:', error);
    res.status(500).json({ error: 'Failed to read storage' });
  }
});

app.post('/api/storage/:key', async (req, res) => {
  try {
    const data = JSON.parse(await fs.readFile(STORAGE_FILE, 'utf8'));
    data[req.params.key] = req.body.value;
    await fs.writeFile(STORAGE_FILE, JSON.stringify(data, null, 2));
    res.json({ success: true });
  } catch (error) {
    console.error('Error writing storage:', error);
    res.status(500).json({ error: 'Failed to write storage' });
  }
});

app.delete('/api/storage/:key', async (req, res) => {
  try {
    const data = JSON.parse(await fs.readFile(STORAGE_FILE, 'utf8'));
    delete data[req.params.key];
    await fs.writeFile(STORAGE_FILE, JSON.stringify(data, null, 2));
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting from storage:', error);
    res.status(500).json({ error: 'Failed to delete from storage' });
  }
});

// Proxy endpoint to fetch Zillow pages
app.get('/api/fetch-zillow', async (req, res) => {
  const { url } = req.query;

  if (!url || !url.includes('zillow.com')) {
    return res.status(400).json({ error: 'Invalid Zillow URL' });
  }

  try {
    console.log(`Fetching: ${url}`);

    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
        'Accept-Encoding': 'gzip, deflate, br',
        'Connection': 'keep-alive',
        'Upgrade-Insecure-Requests': '1',
      }
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const html = await response.text();

    // Extract data from HTML
    const extractedData = extractZillowData(html);

    console.log('Extracted data:', extractedData);

    res.json({
      success: true,
      data: extractedData
    });

  } catch (error) {
    console.error('Error fetching Zillow:', error);
    res.status(500).json({
      error: 'Failed to fetch listing',
      message: error.message
    });
  }
});

// Extract data from Zillow HTML
function extractZillowData(html) {
  const data = {
    address: null,
    price: null,
    beds: null,
    baths: null,
    sqft: null,
  };

  try {
    // Extract price - look for various patterns
    const pricePatterns = [
      /"price":\s*"?\$?([\d,]+)"?/,
      /class="[^"]*price[^"]*"[^>]*>\$?([\d,]+)/,
      /"price":"?\$?([\d,]+)"?/,
    ];

    for (const pattern of pricePatterns) {
      const priceMatch = html.match(pattern);
      if (priceMatch) {
        data.price = priceMatch[1].replace(/,/g, '');
        break;
      }
    }

    // Extract address
    const addressPatterns = [
      /"streetAddress":"([^"]+)"/,
      /"address":"([^"]+)"/,
      /property="og:street-address"\s+content="([^"]+)"/,
    ];

    for (const pattern of addressPatterns) {
      const addressMatch = html.match(pattern);
      if (addressMatch) {
        data.address = addressMatch[1];
        break;
      }
    }

    // Extract beds
    const bedsPatterns = [
      /"bedrooms?":(\d+)/i,
      /(\d+)\s*bd/i,
      /"beds?":(\d+)/i,
    ];

    for (const pattern of bedsPatterns) {
      const bedsMatch = html.match(pattern);
      if (bedsMatch) {
        data.beds = bedsMatch[1];
        break;
      }
    }

    // Extract baths
    const bathsPatterns = [
      /"bathrooms?":(\d+\.?\d*)/i,
      /(\d+\.?\d*)\s*ba/i,
      /"baths?":(\d+\.?\d*)/i,
    ];

    for (const pattern of bathsPatterns) {
      const bathsMatch = html.match(pattern);
      if (bathsMatch) {
        data.baths = bathsMatch[1];
        break;
      }
    }

    // Extract sqft
    const sqftPatterns = [
      /"livingArea":(\d+)/,
      /(\d{3,})\s*sqft/i,
      /"floorSize[^"]*":(\d+)/,
    ];

    for (const pattern of sqftPatterns) {
      const sqftMatch = html.match(pattern);
      if (sqftMatch) {
        data.sqft = sqftMatch[1];
        break;
      }
    }

  } catch (error) {
    console.error('Error parsing HTML:', error);
  }

  return data;
}

// Serve static files from dist directory in production
const distPath = join(__dirname, 'dist');

// Apply basic auth to the frontend
app.use(basicAuth);

app.use(express.static(distPath));

// Serve index.html for all non-API routes (SPA support)
app.get('*', (_req, res) => {
  res.sendFile(join(distPath, 'index.html'));
});

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`   Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`   Auth: ${AUTH_USERNAME} / ${AUTH_PASSWORD === 'changeme' ? '⚠️  DEFAULT PASSWORD' : '✓ custom password'}`);
});
