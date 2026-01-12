# Quick Start Guide

## First Time Setup (One-time)

```bash
# 1. Navigate to the project folder
cd /Users/anuj/Desktop/code/house-view

# 2. Install dependencies
npm install
```

## Running the App

```bash
# Start everything (proxy + app)
npm start
```

The app will open automatically at `http://localhost:3000`

**Look for these messages:**
```
🚀 Proxy server running on http://localhost:3001
   Ready to fetch Zillow listings!

VITE ready in XXXms
➜  Local:   http://localhost:3000/
```

## Using the Auto-fill Feature

1. **Find a house on Zillow** using your normal search
2. **Copy the URL** from the address bar
   - Example: `https://www.zillow.com/homedetails/123-Main-St-San-Francisco-CA-94102/12345678_zpid/`
3. **In the app**, click "Add Listing"
4. **Paste the URL** into the "Zillow URL" field
5. **Click the green "Auto-fill" button**
6. **Watch the magic** ✨ - fields auto-populate with:
   - Address
   - Price
   - Beds
   - Baths
   - Square footage
7. **Review** the data (sometimes Zillow's structure changes)
8. **Add any notes** and click "Add Listing"

## Daily Workflow

### Morning/Afternoon/Evening Zillow Check:

1. Open Zillow with your saved search
2. For each new promising listing:
   - Copy the URL
   - Open your house tracker app
   - Click "Add Listing"
   - Paste URL and click "Auto-fill"
   - Save it

### After a Viewing:

1. Find the property on the map or list
2. Click "Edit" (pencil icon)
3. Add your observations:
   - **Likes**: "Great natural light", "Modern kitchen", etc.
   - **Dislikes**: "Small closets", "No dishwasher", etc.
   - **Deal breakers**: "Major foundation issues", "Too far from BART", etc.
4. Mark as "Visited"
5. Save

### Comparing Properties:

- **Map view**: See all properties geographically
- **List view**: Compare prices, features side-by-side
- **Toggle "Visited Only"**: Focus on places you've seen
- **Click any property**: See all your notes instantly

## Stopping the App

Press `Ctrl+C` in the terminal where you ran `npm start`

## Common Issues

**Auto-fill not working?**
- Make sure you ran `npm start` (not just `npm run dev`)
- Check that you see "Proxy server running" in terminal
- The URL must be from zillow.com

**Map not showing?**
- Check your internet connection
- Refresh the page

**Lost your data?**
- Data is saved in browser localStorage
- Don't clear browser cache
- Use the same browser each time

## Tips & Tricks

1. **Add listings immediately** when you find them on Zillow - you'll forget later
2. **Take notes right after viewings** while details are fresh
3. **Use the map** to visualize commute routes and neighborhood clusters
4. **Compare price/sqft** - the app calculates this automatically
5. **Review your "Likes" across properties** to identify what matters most

## Next Steps

- Read [CORS-EXPLANATION.md](CORS-EXPLANATION.md) to understand how auto-fill works
- Read [README.md](README.md) for full feature documentation
- Start house hunting! 🏠
