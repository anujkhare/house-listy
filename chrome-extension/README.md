# SF House Hunter - Chrome Extension

This Chrome extension extracts listing data from Zillow pages while you're logged in, bypassing CORS restrictions.

## Installation

### Step 1: Create Extension Icons

1. Open `create-icons.html` in your browser
2. It will automatically download 3 icon files: `icon16.png`, `icon48.png`, `icon128.png`
3. Move these files to the `chrome-extension` folder (same folder as this README)

### Step 2: Load Extension in Chrome

1. Open Chrome and go to `chrome://extensions/`
2. Enable "Developer mode" (toggle in top-right corner)
3. Click "Load unpacked"
4. Select the `chrome-extension` folder from your project:
   ```
   /Users/anuj/Desktop/code/house-view/chrome-extension
   ```
5. The extension should now appear in your extensions list

### Step 3: Configure App URL

**IMPORTANT:** After installation, you need to configure where your app is running.

1. Right-click the extension icon and select "Options"
   - Or go to `chrome://extensions/`, find the extension, and click "Extension options"
2. Enter your app URL:
   - For local development: `http://localhost:3000`
   - For Railway deployment: `https://your-app.railway.app`
   - For custom domain: `https://your-domain.com`
3. Click "Save Settings"
4. **Reload the extension** by going to `chrome://extensions/` and clicking the refresh icon

### Step 4: Pin the Extension (Optional but Recommended)

1. Click the puzzle piece icon in Chrome toolbar
2. Find "SF House Hunter - Zillow Parser"
3. Click the pin icon to keep it visible

## How to Use

### Method 1: Direct Send to App (Easiest)

1. **Make sure your House Tracker app is accessible:**
   - For local development: Run `npm start` in the project directory
   - For Railway/production: Open your deployed app URL in a browser tab

2. **Navigate to any Zillow listing page** while logged into Zillow
   - Example: https://www.zillow.com/homedetails/123-Main-St-San-Francisco-CA-94102/12345678_zpid/

3. **Click the extension icon** 🏠 in your Chrome toolbar

4. **Click "Extract Data from This Page"**
   - The extension will parse the current Zillow page
   - You'll see a preview of extracted data

5. **Click "Send to House Tracker App"**
   - If app is already open: Data is sent directly to that tab
   - If app is not open: A new tab opens automatically with the data
   - The "Add Listing" form will be pre-filled with the data
   - Review and click "Add Listing" to save

### Method 2: Copy to Clipboard

1. Follow steps 1-4 above
2. Click "Copy Data to Clipboard" instead
3. Manually paste into your app or notes

## What Data Gets Extracted

The extension extracts:
- ✅ **Address** - Full street address
- ✅ **Price** - Listing price
- ✅ **Beds** - Number of bedrooms
- ✅ **Baths** - Number of bathrooms
- ✅ **Sqft** - Square footage
- ✅ **URL** - Direct link to the Zillow listing

## Why This Works (vs. The Proxy Server)

The **proxy server approach failed with 403 errors** because:
- Zillow detected bot-like requests
- No cookies/session from your logged-in account
- Bot protection blocked automated requests

The **Chrome extension succeeds** because:
- ✅ Runs in your browser context with your Zillow login
- ✅ Has access to your cookies and session
- ✅ Zillow sees it as normal browsing activity
- ✅ Can read the page DOM directly (no HTTP request needed)

## Troubleshooting

### "Please navigate to a Zillow listing page first"
- The extension only works on Zillow listing detail pages
- URL must match: `https://*.zillow.com/homedetails/*`
- Won't work on search results or other Zillow pages

### "Not found" for some fields
- Zillow may have changed their HTML structure
- Some listings don't have all fields (e.g., coming soon listings)
- Try refreshing the page and extracting again
- You can manually fill missing fields in the app

### Extension not showing up
- Make sure Developer mode is enabled in `chrome://extensions/`
- Check that you selected the correct folder when loading
- Try removing and re-adding the extension

### "Could not reach House Tracker App"

- Make sure your app is accessible (running locally or deployed)
- Verify the app URL is correctly configured in extension options
- For localhost: Make sure you ran `npm start` in the project directory
- For Railway: Check that your deployment is active
- Check that no firewall is blocking connections

### Data not auto-filling in app

- The extension saves data to Chrome storage
- Reload the app page if it doesn't auto-open
- Check browser console for errors (F12)

## Development Notes

### File Structure

```
chrome-extension/
├── manifest.json       # Extension configuration
├── popup.html          # Extension popup UI
├── popup.js            # Popup logic (dynamic URL support)
├── options.html        # Settings page for app URL configuration
├── options.js          # Settings page logic
├── content.js          # Runs on Zillow pages, extracts data
├── app-bridge.js       # Injected into app pages for communication
├── background.js       # Background service worker (dynamic script injection)
├── icon16.png          # Extension icon (16x16)
├── icon48.png          # Extension icon (48x48)
├── icon128.png         # Extension icon (128x128)
├── create-icons.html   # Helper to generate icons
└── README.md           # This file
```

### How It Works

1. **options.js** manages configuration
   - Saves app URL to Chrome sync storage
   - Validates URL format
   - Notifies background script of changes

2. **background.js** manages dynamic script injection
   - Sets default app URL on installation
   - Monitors tab updates
   - Injects app-bridge.js into tabs matching the configured app URL
   - Handles URL updates from settings

3. **content.js** runs on every Zillow listing page
   - Extracts data from the DOM
   - Responds to messages from popup
   - Returns structured listing data

4. **popup.js** shows the extension UI
   - Loads app URL from settings
   - Requests data from content script
   - Displays preview
   - Finds or opens app tab using dynamic URL
   - Sends data to app-bridge.js or saves to Chrome storage

5. **app-bridge.js** runs in the app page context
   - Listens for messages from popup
   - Checks Chrome storage for pending listings
   - Forwards data to web page via window.postMessage
   - Clears pending data after forwarding

6. **Main app** receives data
   - Listens for window postMessage events
   - Opens add modal with pre-filled data

### Updating the Extension

If you make changes to any extension files:

1. Go to `chrome://extensions/`
2. Find "SF House Hunter - Zillow Parser"
3. Click the refresh icon (↻)
4. Changes will take effect immediately

### Debugging

View extension logs:
1. Go to `chrome://extensions/`
2. Find your extension
3. Click "Inspect views: service worker" (for background.js)
4. Or right-click extension icon → "Inspect popup" (for popup.js)
5. Content script logs appear in regular DevTools (F12) on Zillow pages

## Privacy & Security

- ✅ All data stays local (no external servers)
- ✅ Only accesses Zillow and localhost
- ✅ Uses your existing Zillow login
- ✅ No data is collected or transmitted
- ✅ Open source - you can review all code

## Comparison: Extension vs. Proxy Server

| Feature | Proxy Server | Chrome Extension |
|---------|-------------|------------------|
| **Works with Zillow login** | ❌ No | ✅ Yes |
| **Bypasses 403 errors** | ❌ No | ✅ Yes |
| **Setup complexity** | Simple | Moderate |
| **Reliability** | Low (bot detection) | High |
| **Privacy** | Good (local) | Excellent (local) |
| **Works offline** | No | Yes (if page loaded) |

**Recommendation:** Use the Chrome extension for actual house hunting. The proxy server is kept as a fallback.

## License

MIT License - Free to use and modify
