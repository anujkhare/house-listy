// Bridge content script for localhost:3000
// This runs in the context of the web page and can access both chrome.storage and window

console.log('House Hunter extension bridge loaded');

// Listen for messages from the extension (popup/background)
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'sendListingData') {
    console.log('Bridge received listing data from extension:', message.data);

    // Forward the data to the web page using postMessage
    window.postMessage({
      source: 'house-hunter-extension',
      payload: message.data
    }, '*');

    sendResponse({ success: true });
  }
  return true;
});

// Also check for pending listing in storage on page load
chrome.storage.local.get(['pendingListing'], (result) => {
  if (result.pendingListing) {
    console.log('Bridge found pending listing in storage:', result.pendingListing);

    // Send it to the page
    window.postMessage({
      source: 'house-hunter-extension',
      payload: result.pendingListing
    }, '*');

    // Clear it from storage
    chrome.storage.local.remove(['pendingListing']);
  }
});
