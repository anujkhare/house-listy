// Content script that runs on Zillow listing pages
// This has access to the page DOM and your logged-in session

console.log('SF House Hunter: Content script loaded on Zillow page');

// Function to extract listing data from the current Zillow page
function extractListingData() {
  const data = {
    url: window.location.href,
    address: null,
    neighborhood: null,
    price: null,
    beds: null,
    baths: null,
    sqft: null,
    timestamp: new Date().toISOString()
  };

  try {
    // Extract address - try multiple selectors
    const addressSelectors = [
      'h1[class*="Text-c11n"]',
      'h1[data-testid="property-address"]',
      'h1.summary-address',
      '[data-testid="bed-bath-beyond"] h1'
    ];

    for (const selector of addressSelectors) {
      const element = document.querySelector(selector);
      if (element && element.textContent.trim()) {
        data.address = element.textContent.trim();
        break;
      }
    }

    // Extract price - look for price in various formats
    const priceSelectors = [
      '[data-testid="price"]',
      'span[class*="Text-c11n"][data-testid="price"]',
      '.summary-container .price',
      '[class*="price-text"]'
    ];

    for (const selector of priceSelectors) {
      const element = document.querySelector(selector);
      if (element) {
        const priceText = element.textContent.replace(/[^0-9]/g, '');
        if (priceText) {
          data.price = priceText;
          break;
        }
      }
    }

    // Extract beds - look for bedroom info
    const bedsPatterns = [
      { selector: '[data-testid="bed-bath-beyond"]', pattern: /(\d+)\s*bd/i },
      { selector: '[class*="bed"]', pattern: /(\d+)\s*bed/i }
    ];

    for (const { selector, pattern } of bedsPatterns) {
      const element = document.querySelector(selector);
      if (element) {
        const match = element.textContent.match(pattern);
        if (match) {
          data.beds = match[1];
          break;
        }
      }
    }

    // Also check structured data in the page
    const scriptTags = document.querySelectorAll('script[type="application/ld+json"]');
    scriptTags.forEach(script => {
      try {
        const json = JSON.parse(script.textContent);
        if (json['@type'] === 'SingleFamilyResidence' || json['@type'] === 'Apartment') {
          if (!data.price && json.offers?.price) {
            data.price = json.offers.price.toString().replace(/[^0-9]/g, '');
          }
          if (!data.address && json.address?.streetAddress) {
            data.address = json.address.streetAddress;
          }
          if (!data.beds && json.numberOfBedrooms) {
            data.beds = json.numberOfBedrooms.toString();
          }
          if (!data.baths && json.numberOfBathroomsTotal) {
            data.baths = json.numberOfBathroomsTotal.toString();
          }
          if (!data.sqft && json.floorSize?.value) {
            data.sqft = json.floorSize.value.toString();
          }
        }
      } catch (e) {
        // Skip invalid JSON
      }
    });

    // Extract baths
    const bathsPatterns = [
      { selector: '[data-testid="bed-bath-beyond"]', pattern: /(\d+\.?\d*)\s*ba/i },
      { selector: '[class*="bath"]', pattern: /(\d+\.?\d*)\s*bath/i }
    ];

    for (const { selector, pattern } of bathsPatterns) {
      const element = document.querySelector(selector);
      if (element) {
        const match = element.textContent.match(pattern);
        if (match) {
          data.baths = match[1];
          break;
        }
      }
    }

    // Extract sqft
    const sqftPatterns = [
      { selector: '[data-testid="bed-bath-beyond"]', pattern: /(\d[\d,]*)\s*sqft/i },
      { selector: '[class*="square"]', pattern: /(\d[\d,]*)\s*sqft/i }
    ];

    for (const { selector, pattern } of sqftPatterns) {
      const element = document.querySelector(selector);
      if (element) {
        const match = element.textContent.match(pattern);
        if (match) {
          data.sqft = match[1].replace(/,/g, '');
          break;
        }
      }
    }

    console.log('Extracted data:', data);
    return data;

  } catch (error) {
    console.error('Error extracting data:', error);
    return data;
  }
}

// Listen for messages from popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'extractData') {
    const data = extractListingData();
    sendResponse({ success: true, data });
  }
  return true; // Keep channel open for async response
});

// Store data when page loads (so it's ready when user clicks extension)
window.addEventListener('load', () => {
  setTimeout(() => {
    const data = extractListingData();
    chrome.storage.local.set({ lastExtractedData: data });
  }, 2000); // Wait 2s for dynamic content to load
});
