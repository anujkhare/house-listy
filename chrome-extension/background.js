// Background service worker for the extension

console.log('SF House Hunter: Background script loaded');

// Listen for installation
chrome.runtime.onInstalled.addListener(() => {
  console.log('SF House Hunter extension installed');
});

// Handle messages from content script or popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'getData') {
    // Retrieve stored data
    chrome.storage.local.get(['lastExtractedData'], (result) => {
      sendResponse({ data: result.lastExtractedData });
    });
    return true; // Keep channel open
  }
});
