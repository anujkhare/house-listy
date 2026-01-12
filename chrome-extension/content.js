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
    pricePerSqft: null,
    taxAssessedValue: null,
    annualTaxAmount: null,
    priceRange: null,
    dateOnMarket: null,
    listingAgreement: null,
    listingTerms: null,
    lotSize: null,
    totalSpaces: null,
    garageSpaces: null,
    homeType: null,
    yearBuilt: null,
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

    // Extract data from category-group sections
    // Find all category-group divs
    const categoryGroups = document.querySelectorAll('[data-testid="category-group"]');

    for (const group of categoryGroups) {
      const headingText = group.textContent;

      // Get all child divs - the second one should contain the list
      const childDivs = group.querySelectorAll(':scope > div');
      if (childDivs.length < 2) continue;

      const listContainer = childDivs[1];
      const listText = listContainer.textContent;

      // Extract Financial & listing details
      if (headingText.includes('Financial & listing details') || headingText.includes('Financial')) {
        console.log('Found Financial & listing details section');
        console.log('Financial details text:', listText);

        // Parse Price per square foot: $1,158/sqft
        const pricePerSqftMatch = listText.match(/Price per square foot:\s*\$?([\d,]+)\/sqft/i);
        if (pricePerSqftMatch) {
          data.pricePerSqft = pricePerSqftMatch[1].replace(/,/g, '');
        }

        // Parse Tax assessed value: $901,127
        const taxValueMatch = listText.match(/Tax assessed value:\s*\$?([\d,]+)/i);
        if (taxValueMatch) {
          data.taxAssessedValue = taxValueMatch[1].replace(/,/g, '');
        }

        // Parse Annual tax amount: $11,339
        const annualTaxMatch = listText.match(/Annual tax amount:\s*\$?([\d,]+)/i);
        if (annualTaxMatch) {
          data.annualTaxAmount = annualTaxMatch[1].replace(/,/g, '');
        }

        // Parse Price range: $2M - $2M
        const priceRangeMatch = listText.match(/Price range:\s*([^\n]+)/i);
        if (priceRangeMatch) {
          data.priceRange = priceRangeMatch[1].trim();
        }

        // Parse Date on market: 5/29/2025
        const dateOnMarketMatch = listText.match(/Date on market:\s*([^\n]+)/i);
        if (dateOnMarketMatch) {
          data.dateOnMarket = dateOnMarketMatch[1].trim();
        }

        // Parse Listing agreement: Excl Right
        const listingAgreementMatch = listText.match(/Listing agreement:\s*([^\n]+)/i);
        if (listingAgreementMatch) {
          data.listingAgreement = listingAgreementMatch[1].trim();
        }

        // Parse Listing terms: Cash,Conventional,Owner May Carry,Private Financing Available
        const listingTermsMatch = listText.match(/Listing terms:\s*([^\n]+)/i);
        if (listingTermsMatch) {
          data.listingTerms = listingTermsMatch[1].trim();
        }
      }

      // Extract Property details
      if (headingText.includes('Property')) {
        console.log('Found Property section');
        console.log('Property details text:', listText);

        // Parse Size (lot size): "Size: 2,500 sqft" or "Size: 0.25 acres"
        const lotSizeMatch = listText.match(/Size:\s*([^\n]+)/i);
        if (lotSizeMatch) {
          data.lotSize = lotSizeMatch[1].trim();
        }

        // Parse Total spaces: "Total spaces: 2"
        const totalSpacesMatch = listText.match(/Total spaces:\s*(\d+)/i);
        if (totalSpacesMatch) {
          data.totalSpaces = totalSpacesMatch[1];
        }

        // Parse Garage spaces: "Garage spaces: 2"
        const garageSpacesMatch = listText.match(/[Gg]arage spaces:\s*(\d+)/i);
        if (garageSpacesMatch) {
          data.garageSpaces = garageSpacesMatch[1];
        }
      }

      // Extract Construction details
      if (headingText.includes('Construction')) {
        console.log('Found Construction section');
        console.log('Construction details text:', listText);

        // Parse Home type: "Single Family Residence"
        const homeTypeMatch = listText.match(/Home type:\s*([^\n]+)/i);
        if (homeTypeMatch) {
          data.homeType = homeTypeMatch[1].trim();
        }

        // Parse Year built: "1925"
        const yearBuiltMatch = listText.match(/Year built:\s*(\d{4})/i);
        if (yearBuiltMatch) {
          data.yearBuilt = yearBuiltMatch[1];
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
