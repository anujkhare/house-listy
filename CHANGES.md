# Changes Made for Railway Deployment

## Summary
Your app has been updated to support deployment on Railway with password protection. All your data will now be stored on the server instead of in the browser.

## Files Modified

### 1. `server.js` - Backend Server
**Changes:**
- ✅ Added HTTP Basic Authentication middleware
- ✅ Added `/api/storage/*` endpoints for centralized data storage
- ✅ Configured to serve the built React app (production mode)
- ✅ Updated CORS to work in both dev and production
- ✅ Changed port to use `process.env.PORT` (required by Railway)

**What this means:**
- Your app now requires username/password to access
- Data is stored in `data/listings.json` on the server
- Single server handles both frontend and API

### 2. `src/storage.js` - Frontend Storage
**Changes:**
- ✅ Updated to use `/api/storage` endpoints instead of localStorage
- ✅ Falls back to localStorage if API is unavailable
- ✅ Automatically detects production vs development mode

**What this means:**
- Your listings are now synced across all your devices
- You can access the same data from phone, tablet, laptop

### 3. `package.json` - Build Configuration
**Changes:**
- ✅ Updated `start` script to run production server
- ✅ Renamed old `start` to `dev:full` for local development

**Commands:**
- `npm run dev` - Frontend only (development)
- `npm run server` - Backend only
- `npm run dev:full` - Both frontend & backend (local development)
- `npm start` - Production server (Railway uses this)

### 4. New Files Created

#### `.env.example`
Template for environment variables. Shows what you need to configure.

#### `railway.json`
Railway-specific configuration for build and deployment.

#### `DEPLOYMENT.md`
Step-by-step instructions for deploying to Railway.

#### `.gitignore` (updated)
Added `data/` directory to prevent committing your listings data.

## How It Works Now

### Local Development (Current Workflow)
```bash
npm run dev:full
```
- Frontend runs on http://localhost:3000 (or 5173)
- Backend runs on http://localhost:3001
- Data stored via backend API

### Production (After Railway Deployment)
- Single URL (e.g., https://your-app.railway.app)
- Basic Auth login prompt
- All data stored on Railway server
- Accessible from any device

## Testing Locally

1. **Build the frontend:**
   ```bash
   npm run build
   ```

2. **Start the production server:**
   ```bash
   npm start
   ```

3. **Visit:** http://localhost:3001
   - Username: `admin` (default)
   - Password: `changeme` (default)

## Environment Variables

Set these on Railway (see DEPLOYMENT.md):

| Variable | Purpose | Example |
|----------|---------|---------|
| `NODE_ENV` | Environment | `production` |
| `AUTH_USERNAME` | Login username | `yourusername` |
| `AUTH_PASSWORD` | Login password | `securepassword123` |
| `PORT` | Server port | Auto-set by Railway |

## What Stays the Same

- ✅ Chrome extension still works (only on your local machine)
- ✅ All features work identically
- ✅ Same UI and functionality
- ✅ Map, filtering, CSV export all work

## What's New

- ✅ Password protection
- ✅ Access from any device
- ✅ Centralized data storage
- ✅ Public URL you can share
- ✅ Always accessible (no need to run locally)

## Next Steps

1. Test locally with `npm run build && npm start`
2. Push code to GitHub
3. Follow DEPLOYMENT.md to deploy on Railway
4. Set a strong password!
5. Access from your phone/tablet

## Rollback (If Needed)

If you want to go back to the old local-only version:
```bash
git stash
# Your old version is back
```

All changes are tracked in git, so you can always revert.
