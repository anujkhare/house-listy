// Parse Zillow listing page to extract property details using our proxy server
export const parseZillowListing = async (url) => {
  try {
    // Validate Zillow URL
    if (!url.includes('zillow.com')) {
      throw new Error('Please provide a valid Zillow URL');
    }

    // Use our proxy server to bypass CORS
    const proxyUrl = `http://localhost:3001/api/fetch-zillow?url=${encodeURIComponent(url)}`;

    const response = await fetch(proxyUrl);

    if (!response.ok) {
      throw new Error('Unable to fetch listing details');
    }

    const result = await response.json();

    if (!result.success) {
      throw new Error(result.error || 'Failed to parse listing');
    }

    // Return the extracted data from our server
    return result.data;

  } catch (error) {
    console.error('Error parsing Zillow listing:', error);
    throw error;
  }
};

// Alternative: Parse from URL structure (Zillow URLs often contain some info)
export const extractFromZillowUrl = (url) => {
  try {
    // Example: https://www.zillow.com/homedetails/123-Main-St-San-Francisco-CA-94102/12345678_zpid/
    const urlParts = url.split('/homedetails/');
    if (urlParts.length > 1) {
      const addressPart = urlParts[1].split('/')[0];
      // Convert URL format to readable address
      const address = addressPart
        .replace(/-/g, ' ')
        .replace(/\d+_zpid.*/, '')
        .trim();

      return { address };
    }
    return {};
  } catch (error) {
    console.error('Error extracting from URL:', error);
    return {};
  }
};
