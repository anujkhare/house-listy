# Project Structure

## Overview
SF House Hunter is a house hunting tracker application for San Francisco with map visualization. It consists of a React web application and a Chrome extension that parses Zillow listings.

## Tech Stack
- **Frontend**: React 18, Vite, TailwindCSS
- **UI Components**: Lucide React icons
- **Maps**: Leaflet.js (OpenStreetMap)
- **Storage**: IndexedDB (via custom storage.js wrapper)
- **Geocoding**: Nominatim (OpenStreetMap)
- **Extension**: Chrome Manifest V3

## Directory Structure

```
house-view/
├── src/                          # Main React application source
│   ├── App.jsx                   # Main app component with map/list views, modals
│   ├── main.jsx                  # React app entry point
│   ├── index.css                 # Global styles and Tailwind imports
│   ├── storage.js                # IndexedDB wrapper for persistent storage
│   ├── zillowParser.js           # Zillow listing data parser (URL & page)
│   └── extensionReceiver.js      # [Legacy] Event emitter for extension data
│
├── chrome-extension/             # Chrome extension for Zillow parsing
│   ├── manifest.json             # Extension configuration (Manifest V3)
│   ├── popup.html                # Extension popup UI
│   ├── popup.js                  # Popup logic: extract, preview, send to app
│   ├── content.js                # Content script for Zillow pages
│   ├── app-bridge.js             # Bridge content script for localhost:3000
│   ├── background.js             # Service worker (currently minimal)
│   ├── README.md                 # Extension setup instructions
│   ├── icon.svg                  # Source icon
│   ├── icon16.png                # Extension icon (16x16)
│   ├── icon48.png                # Extension icon (48x48)
│   ├── icon128.png               # Extension icon (128x128)
│   └── create-icons.html         # Utility to generate PNG icons from SVG
│
├── index.html                    # HTML entry point for Vite
├── vite.config.js                # Vite configuration
├── tailwind.config.js            # Tailwind CSS configuration
├── postcss.config.js             # PostCSS configuration
├── package.json                  # NPM dependencies and scripts
├── server.js                     # Express server (if needed for CORS workarounds)
│
├── CHANGELOG.md                  # Project changelog
├── PROJECT-STRUCTURE.md          # This file
├── README.md                     # Project documentation
├── QUICK-START.md                # Quick start guide
├── CORS-EXPLANATION.md           # CORS issues explanation
└── CHROME-EXTENSION-SOLUTION.md  # Extension communication solution docs
```

## Key Components

### Web Application (`src/`)

#### `App.jsx`
Main application component containing:
- **State Management**: Listings, modals, view mode (map/list), selected listing
- **Map Integration**: Leaflet map with custom markers for listings
- **Components**:
  - `HouseHuntingTracker` - Main container
  - `ListingDetail` - Sidebar detail view
  - `ListView` - List view of all listings
  - `AddListingModal` - Form to add new listings
  - `EditListingModal` - Form to edit existing listings with likes/dislikes/deal breakers
- **Data Flow**:
  - Loads listings from IndexedDB on mount
  - Listens for extension messages via `window.addEventListener('message')`
  - Auto-saves listings to IndexedDB on changes
  - Geocodes addresses using Nominatim API

#### `storage.js`
Simple IndexedDB wrapper providing:
- `storage.get(key)` - Get value by key
- `storage.set(key, value)` - Set key-value pair
- Uses `house-hunter` database and `keyval` object store

#### `zillowParser.js`
Zillow data extraction utilities:
- `extractFromZillowUrl(url)` - Extract address from URL structure
- `parseZillowListing(url)` - Fetch and parse Zillow page (may fail due to CORS)

#### `extensionReceiver.js`
Legacy file - No longer actively used. Originally set up window message listener for extension data before the bridge pattern was implemented.

### Chrome Extension (`chrome-extension/`)

#### `manifest.json`
Chrome extension configuration:
- **Permissions**: `activeTab`, `scripting`, `storage`
- **Host Permissions**: Zillow pages and localhost:3000
- **Content Scripts**:
  - `content.js` - Runs on Zillow listing pages
  - `app-bridge.js` - Runs on localhost:3000 (bridges extension ↔ web app)

#### `popup.js`
Extension popup logic:
- Detects if current tab is a Zillow listing
- Sends message to `content.js` to extract data
- Displays preview of extracted data
- **Send to App**: Uses two strategies:
  - If app is open: Direct message to `app-bridge.js`
  - If app is closed: Save to `chrome.storage.local` → open tab → bridge picks it up
- Copy to clipboard functionality

#### `content.js`
Content script injected into Zillow pages:
- Listens for `extractData` messages from popup
- Scrapes listing data from Zillow DOM
- Returns structured data (address, price, beds, baths, sqft, URL)

#### `app-bridge.js`
Bridge content script for localhost:3000:
- Has access to both Chrome extension APIs and web page context
- Listens for messages from popup via `chrome.runtime.onMessage`
- Checks `chrome.storage.local` for pending listings on page load
- Forwards data to web page via `window.postMessage`
- Clears pending data after forwarding

## Data Flow: Extension → Web App

### Scenario 1: App Already Open
1. User clicks "Send to App" in extension popup
2. `popup.js` sends message to `app-bridge.js` via `chrome.tabs.sendMessage`
3. `app-bridge.js` receives message and forwards data via `window.postMessage`
4. `App.jsx` message listener receives data
5. Opens add modal with pre-filled form

### Scenario 2: App Not Open
1. User clicks "Send to App" in extension popup
2. `popup.js` saves data to `chrome.storage.local`
3. `popup.js` opens new tab to `http://localhost:3000`
4. `app-bridge.js` loads and checks storage for pending data
5. `app-bridge.js` finds pending data and forwards via `window.postMessage`
6. `app-bridge.js` clears pending data from storage
7. `App.jsx` message listener receives data
8. Opens add modal with pre-filled form

## Data Models

### Listing Object
```javascript
{
  id: string,              // Timestamp-based unique ID
  address: string,         // Street address
  neighborhood: string,    // SF neighborhood (optional)
  price: number,           // Listing price
  beds: number,            // Number of bedrooms
  baths: number,           // Number of bathrooms
  sqft: number,            // Square footage
  pricePerSqft: number,    // Calculated: price / sqft
  zillowUrl: string,       // Original Zillow listing URL
  notes: string,           // User notes
  lat: number,             // Latitude (from geocoding)
  lng: number,             // Longitude (from geocoding)
  visited: boolean,        // Has user visited this property?
  createdAt: string,       // ISO timestamp
  likes: string[],         // Things user liked about property
  dislikes: string[],      // Minor issues (but liveable)
  dealBreakers: string[]   // Major issues (deal breakers)
}
```

### Extension Data Message
```javascript
{
  source: 'house-hunter-extension',
  payload: {
    address: string,
    price: string,
    beds: string,
    baths: string,
    sqft: string,
    url: string
  }
}
```

## NPM Scripts

- `npm run dev` - Start Vite dev server (port 5173)
- `npm run server` - Start Express server (if needed)
- `npm start` - Run both server and dev concurrently
- `npm run build` - Build production bundle
- `npm run preview` - Preview production build

## Development Setup

1. **Install dependencies**: `npm install`
2. **Start dev server**: `npm run dev`
3. **Load extension**:
   - Navigate to `chrome://extensions`
   - Enable "Developer mode"
   - Click "Load unpacked"
   - Select the `chrome-extension/` folder
4. **Access app**: Open `http://localhost:3000` (or Vite's port)

## Key Features

- **Map View**: Interactive Leaflet map with custom markers
- **List View**: Scrollable list of all listings
- **Filter**: Toggle between all listings and visited-only
- **Add Listings**: Manual entry or via Chrome extension
- **Edit Listings**: Add likes, dislikes, deal breakers, and notes
- **Geocoding**: Automatic address → lat/lng conversion
- **Persistence**: All data stored locally in IndexedDB
- **Chrome Extension**: One-click Zillow data extraction

## Known Limitations

- Geocoding uses free Nominatim API (rate-limited)
- Zillow page parsing may fail due to CORS (fallback to URL parsing)
- Extension only works on Zillow listing pages
- App URL hardcoded to `http://localhost:3000`
