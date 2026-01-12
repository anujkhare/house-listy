# SF House Hunter 🏠

A web application for tracking house listings in San Francisco with map visualization and detailed metadata tracking.

## Features

- **Interactive Map View**: Visualize all your house listings on an OpenStreetMap-based interactive map
- **List View**: View all listings in a clean, organized list format
- **Visited Tracking**: Mark properties you've visited and filter to show only visited properties
- **Rich Metadata**: Track detailed information including:
  - Price, beds, baths, square footage
  - Price per square foot (auto-calculated)
  - Things you liked about the property
  - Things you disliked but could live with
  - Deal breakers
  - Additional notes
  - Zillow listing URL
- **Persistent Storage**: All data is saved locally in your browser
- **Map Markers**: Different markers for visited (green with checkmark) and unvisited (blue house icon) properties

## Setup Instructions

### Prerequisites

- Node.js (v16 or higher)
- npm or yarn

### Installation

1. Install dependencies:
```bash
npm install
```

2. Start the development server:
```bash
npm run dev
```

The app will automatically open in your browser at `http://localhost:3000`

### Build for Production

To create an optimized production build:

```bash
npm run build
```

To preview the production build:

```bash
npm run preview
```

## Usage Guide

### Adding a New Listing

1. Click the "Add Listing" button in the top-right corner
2. Fill in the property details:
   - **Address** (required): Street address of the property
   - **Neighborhood**: SF neighborhood (e.g., Mission, SOMA, Nob Hill)
   - **Price**: Purchase price
   - **Sqft**: Square footage (price per sqft will be auto-calculated)
   - **Beds/Baths**: Number of bedrooms and bathrooms
   - **Zillow URL**: Link to the Zillow listing for easy reference
   - **Notes**: Any initial thoughts or observations
3. Click "Add Listing" - the address will be automatically geocoded and plotted on the map

### After Viewing a Property

1. Click on the property marker on the map or select it from the list view
2. Click the "Edit" button (pencil icon)
3. Add your observations:
   - **Things I Liked**: Features you appreciated (kitchen layout, natural light, etc.)
   - **Dislikes (But Liveable)**: Minor issues you could tolerate (small closet, no dishwasher, etc.)
   - **Deal Breakers**: Issues that make the property unsuitable (major structural issues, location concerns, etc.)
4. Mark the property as "Visited" using the checkmark button
5. Save your changes

### Filtering and Views

- **Map View**: See all listings plotted on the map with color-coded markers
- **List View**: Browse listings in a list format with quick access to key details
- **Visited Only Filter**: Toggle to show only properties you've visited
- **Property Stats**: Header shows total listings and number of visited properties

### Map Features

- **Blue house marker**: Unvisited property
- **Green checkmark marker**: Visited property
- **Click any marker**: View detailed property information in the sidebar
- **Auto-zoom**: Map automatically adjusts to show all your listings

## Workflow Integration

This app is designed to integrate seamlessly with your Zillow browsing workflow:

1. Browse Zillow with your preferred filters (price, beds, baths)
2. When you find a promising listing, copy the details
3. Add it to the app using the "Add Listing" form
4. Schedule a viewing or attend an open house
5. After the viewing, immediately add your observations and mark it as visited
6. Use the map and list views to compare properties and make informed decisions

## Data Storage

All your data is stored locally in your browser's localStorage. This means:
- ✅ Your data is private and never leaves your device
- ✅ No account or login required
- ✅ Fast and always available offline
- ⚠️ Data is specific to this browser - clearing browser data will delete your listings
- ⚠️ Data won't sync across different browsers or devices

**Tip**: Periodically export your data by copying it from the browser's localStorage or taking screenshots of important listings.

## Technical Details

- **Frontend**: React 18 with Vite
- **Styling**: Tailwind CSS
- **Icons**: Lucide React
- **Maps**: Leaflet with OpenStreetMap tiles
- **Geocoding**: Nominatim (free, no API key required)
- **Storage**: Browser localStorage

## Troubleshooting

**Map not loading?**
- Check your internet connection (map tiles are loaded from OpenStreetMap)
- Refresh the page

**Address not appearing on map?**
- Ensure the address is complete and valid
- Try adding "San Francisco, CA" to the address
- The geocoding service may be temporarily unavailable - wait a moment and try again

**Data disappeared?**
- Check if you're using the same browser
- Avoid clearing browser data/cache

## Future Enhancements

Potential features to add:
- Export data to CSV/Excel
- Import listings from CSV
- Add photos to listings
- Neighborhood comparison tool
- Price trend tracking
- Commute time calculator
- Sharing listings with family/agent

## License

MIT License - Feel free to use and modify for your house hunting needs!
