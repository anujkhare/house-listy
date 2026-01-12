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

### Step 3: Pin the Extension (Optional but Recommended)

1. Click the puzzle piece icon in Chrome toolbar
2. Find "SF House Hunter - Zillow Parser"
3. Click the pin icon to keep it visible

## How to Use

### Method 1: Direct Send to App (Easiest)

1. **Make sure your House Tracker app is running:**
   ```bash
   cd /Users/anuj/Desktop/code/house-view
   npm start
   ```

2. **Navigate to any Zillow listing page** while logged into Zillow
   - Example: https://www.zillow.com/homedetails/123-Main-St-San-Francisco-CA-94102/12345678_zpid/

3. **Click the extension icon** 🏠 in your Chrome toolbar

4. **Click "Extract Data from This Page"**
   - The extension will parse the current Zillow page
   - You'll see a preview of extracted data

5. **Click "Send to House Tracker App"**
   - Data is saved and the app opens automatically
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
- Make sure you ran `npm start` in the project directory
- App must be running on `http://localhost:3000`
- Check that no firewall is blocking localhost

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
├── popup.js            # Popup logic
├── content.js          # Runs on Zillow pages, extracts data
├── background.js       # Background service worker
├── icon16.png          # Extension icon (16x16)
├── icon48.png          # Extension icon (48x48)
├── icon128.png         # Extension icon (128x128)
├── create-icons.html   # Helper to generate icons
└── README.md           # This file
```

### How It Works

1. **content.js** runs on every Zillow listing page
   - Extracts data from the DOM
   - Stores it in Chrome storage
   - Waits for popup to request data

2. **popup.js** shows the extension UI
   - Requests data from content script
   - Displays preview
   - Saves to Chrome storage when "Send" is clicked

3. **Main app** checks Chrome storage on load
   - Finds pending listing data
   - Opens add modal with pre-filled data
   - Clears pending data after import

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
