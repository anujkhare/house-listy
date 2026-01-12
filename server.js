import express from 'express';
import cors from 'cors';
import fetch from 'node-fetch';

const app = express();
const PORT = 3001;

// Enable CORS for our frontend
app.use(cors({
  origin: 'http://localhost:3000'
}));

app.use(express.json());

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

app.listen(PORT, () => {
  console.log(`🚀 Proxy server running on http://localhost:${PORT}`);
  console.log(`   Ready to fetch Zillow listings!`);
});
