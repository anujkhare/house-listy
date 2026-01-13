// Background service worker for the extension

console.log('SF House Hunter: Background script loaded');

// Default app URL
const DEFAULT_APP_URL = 'http://localhost:3000';

// Listen for installation
chrome.runtime.onInstalled.addListener(() => {
  console.log('SF House Hunter extension installed');

  // Set default app URL if not already set
  chrome.storage.sync.get(['appUrl'], (result) => {
    if (!result.appUrl) {
      chrome.storage.sync.set({ appUrl: DEFAULT_APP_URL });
    }
  });
});

// Inject app-bridge content script dynamically when a tab matching the app URL loads
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === 'loading' && tab.url) {
    chrome.storage.sync.get(['appUrl'], (result) => {
      const appUrl = result.appUrl || DEFAULT_APP_URL;

      // Check if this tab matches the configured app URL
      if (tab.url.startsWith(appUrl)) {
        chrome.scripting.executeScript({
          target: { tabId: tabId },
          files: ['app-bridge.js']
        }).catch(err => {
          // Script might already be injected or tab closed
          console.log('Could not inject app-bridge.js:', err);
        });
      }
    });
  }
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

  if (request.action === 'updateAppUrl') {
    // When app URL is updated, we could optionally reload tabs
    console.log('App URL updated to:', request.appUrl);
    sendResponse({ success: true });
  }
});
