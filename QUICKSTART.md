# Quick Start Guide

## What Changed?

Your app is now ready to deploy to Railway with password protection! Here's what you need to know:

## Test Locally First

1. **Build the app:**

   ```bash
   npm run build
   ```

2. **Start the production server:**

   ```bash
   npm start
   ```

3. **Open in browser:**
   - Go to: <http://localhost:3001>
   - Username: `admin`
   - Password: `changeme`

4. **Test it works:**
   - Add a listing
   - Refresh the page - data should persist
   - Open in another browser - you should see the same data

## Deploy to Railway

### Quick Steps

1. **Push to GitHub:**

   ```bash
   git add .
   git commit -m "Add Railway deployment support"
   git push origin main
   ```

2. **Go to Railway:**
   - Visit <https://railway.app>
   - Sign in (use your GitHub account)
   - Click "New Project"
   - Select "Deploy from GitHub repo"
   - Choose your `house-view` repository

3. **Set Environment Variables:**
   - Click on your new project
   - Go to "Variables" tab
   - Add these variables:

     ```
     NODE_ENV=production
     AUTH_USERNAME=yourusername
     AUTH_PASSWORD=YourSecurePassword123!
     ```

   - **IMPORTANT:** Use a strong password!

4. **Wait for deployment:**
   - Railway will build and deploy automatically (2-3 minutes)
   - Watch the logs to see progress

5. **Get your URL:**
   - Click "Settings" → "Domains"
   - You'll see something like: `https://house-view-production-abc123.up.railway.app`
   - Copy this URL

6. **Access your app:**
   - Open the URL in any browser
   - Enter your username and password
   - Your app is live!

## Access from Other Devices

1. Open the Railway URL on your phone/tablet
2. Login with the same credentials
3. All devices share the same data!

## Important Notes

✅ **Works:**

- Access from any device with the password
- All your listings are stored on the server
- Map view, filters, CSV export - everything works

⚠️ **Extension limitation:**

- The Chrome extension only works on your laptop
- This is expected and fine per your requirements
- You can still manually add listings from other devices

## Troubleshooting

**Problem: Can't log in**

- Check you're using the correct username/password
- Clear browser cache
- Try incognito/private mode

**Problem: Build fails on Railway**

- Check the build logs in Railway dashboard
- Make sure all files are committed to git

**Problem: Data not saving**

- Check Railway logs for errors
- Verify environment variables are set

## Need More Help?

See the detailed [DEPLOYMENT.md](DEPLOYMENT.md) file for complete instructions and troubleshooting.

## Going Back to Local Development

To develop locally (before deploying changes):

```bash
npm run dev:full
```

This runs both frontend (port 3000) and backend (port 3001) for development.
