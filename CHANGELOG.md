# Changelog

## 2026-01-11 - Fixed Extension to App Data Transfer

### Issue

When clicking "Send to App" in the Chrome extension, the app page would open but no data was populated or added to the listings. The extension was extracting Zillow listing data correctly, but the data wasn't reaching the web app.

### Root Cause

The extension was saving data to `chrome.storage.local`, but the web app (running at `http://localhost:3000`) was trying to read from it. The `chrome.storage` API is only accessible within the extension context, not from regular web pages. This created a communication gap between the extension and the app.

### Solution

Implemented a message passing architecture using a bridge content script to enable proper communication between the Chrome extension and the web app.

### Changes Made

#### 1. Updated `chrome-extension/manifest.json`

- Added a new content script configuration for `http://localhost:3000/*`
- Configured `app-bridge.js` to run at `document_start` on the app domain

#### 2. Created `chrome-extension/app-bridge.js`

- New bridge content script that has access to both extension APIs and web page context
- Listens for messages from the extension popup via `chrome.runtime.onMessage`
- Checks `chrome.storage.local` for pending listings on page load
- Forwards data to the web page using `window.postMessage` with source identifier `'house-hunter-extension'`
- Automatically clears pending data from storage after forwarding

#### 3. Updated `chrome-extension/popup.js`

- Modified "Send to App" button logic to use message passing
- **When app is already open**: Sends message directly to bridge content script via `chrome.tabs.sendMessage`
- **When app is not open**: Saves to storage first, then opens new tab (bridge picks it up on load)
- Added fallback to storage + reload if direct messaging fails
- Improved user feedback with "Sending to app..." message

#### 4. Updated `src/App.jsx`

- Removed direct `chrome.storage.local` access attempt (which was failing)
- Added new `useEffect` hook to listen for `window` message events
- Filters messages to only accept those from `'house-hunter-extension'` source
- Opens add modal and auto-fills form when extension data is received
- Properly cleans up event listener on component unmount

### How It Works Now

**Flow 1 - App Already Open:**

1. User clicks "Send to App" in extension popup
2. Extension sends message to bridge content script via `chrome.tabs.sendMessage`
3. Bridge content script receives message and forwards data via `window.postMessage`
4. App's message event listener receives data
5. App opens add modal with pre-filled data

**Flow 2 - App Not Open:**

1. User clicks "Send to App" in extension popup
2. Extension saves data to `chrome.storage.local`
3. Extension opens new tab to `http://localhost:3000`
4. Bridge content script loads and checks storage for pending data
5. Bridge finds pending data and forwards it via `window.postMessage`
6. Bridge clears the pending data from storage
7. App's message event listener receives data
8. App opens add modal with pre-filled data

### Testing

After these changes, users need to reload the extension in `chrome://extensions` for the new content script to be registered.
