# Deployment Instructions for Railway

## Prerequisites

- A Railway account (sign up at <https://railway.app>)
- This codebase pushed to a GitHub repository

## Step-by-Step Deployment

### 1. Create a Railway Project

1. Go to <https://railway.app> and sign in
2. Click "New Project"
3. Select "Deploy from GitHub repo"
4. Connect your GitHub account if not already connected
5. Select the `house-view` repository

### 2. Configure Environment Variables

After creating the project, Railway will start building. Before it finishes:

1. Click on your project
2. Go to the "Variables" tab
3. Add these environment variables:

   ```
   NODE_ENV=production
   AUTH_USERNAME=your_username
   AUTH_PASSWORD=your_secure_password
   ```

   **Important**: Change `AUTH_PASSWORD` to a strong password! This protects your app.

### 3. Wait for Deployment

Railway will automatically:

- Install dependencies
- Build your React frontend (`npm run build`)
- Start the server (`npm start`)

This takes about 2-3 minutes.

### 4. Get Your App URL

1. Once deployed, Railway will show a URL like: `https://house-view-production.up.railway.app`
2. Click on "Settings" tab
3. Under "Domains", you'll see your public URL
4. You can also add a custom domain here if you have one

### 5. Access Your App

1. Visit your Railway URL in a browser
2. You'll see a login prompt (HTTP Basic Auth)
3. Enter the username and password you set in Step 2
4. Your app is now accessible!

## Testing the Deployment

1. Open the URL in your browser
2. Log in with your credentials
3. Add a test listing to verify storage is working
4. Access from another device (phone, tablet) to confirm it's accessible

## Data Storage

Your listings are stored in a JSON file (`data/listings.json`) on Railway's servers. This data persists across deployments but:

- **Note**: Railway's free tier may reset storage on redeploys
- Consider upgrading to a paid plan for persistent storage
- Or add a proper database later (PostgreSQL, MongoDB)

## Updating Your App

Railway automatically redeploys when you push to your GitHub repository:

1. Make changes locally
2. Commit and push to GitHub:

   ```bash
   git add .
   git commit -m "Your changes"
   git push
   ```

3. Railway detects the push and redeploys automatically

## Troubleshooting

### Build Fails

- Check the build logs in Railway dashboard
- Ensure all dependencies are in `package.json`

### Can't Access the App

- Verify AUTH_USERNAME and AUTH_PASSWORD are set correctly
- Try clearing browser cache/cookies
- Check Railway logs for errors

### Data Not Persisting

- Railway free tier may reset storage
- Consider adding Railway's PostgreSQL addon
- Or upgrade to a paid plan for persistent volumes

## Security Notes

- Never commit your `.env` file (it's in `.gitignore`)
- Use a strong password for AUTH_PASSWORD
- The Chrome extension will only work on your local machine
- Consider adding HTTPS (Railway provides this automatically)

## Cost

- **Free Tier**: $5 credit/month, should be sufficient for personal use
- **Hobby Plan**: $5-10/month for more resources and persistent storage
- No credit card required to start

## Alternative to Railway

If you prefer other platforms, this setup also works with:

- **Render.com** - Similar to Railway, free tier available
- **Fly.io** - More technical, but very reliable
- **Heroku** - Paid only now, but well-documented

The same environment variables and build process apply to all platforms.
