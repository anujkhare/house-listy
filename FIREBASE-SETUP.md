# Firebase Setup Guide

This guide will help you set up Firebase Firestore for persistent data storage in your House Hunter app.

## Why Firebase?

Firebase Firestore provides:

- **Persistent storage** - No data loss on Railway container restarts
- **Real-time sync** - Automatic data synchronization
- **Free tier** - Generous free quota for small apps
- **No infrastructure** - Fully managed database

## Step 1: Create a Firebase Project

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Click "Add project" or "Create a project"
3. Enter a project name (e.g., "house-hunter")
4. Disable Google Analytics (optional)
5. Click "Create project"

## Step 2: Enable Firestore Database

1. In your Firebase project, click "Firestore Database" in the left sidebar
2. Click "Create database"
3. Select "Start in production mode" (we'll handle auth in our app)
4. Choose a Cloud Firestore location (e.g., `us-central1`)
5. Click "Enable"

## Step 3: Generate Service Account Key

1. In Firebase Console, click the gear icon ⚙️ next to "Project Overview"
2. Select "Project settings"
3. Go to the "Service accounts" tab
4. Click "Generate new private key"
5. Click "Generate key" - this will download a JSON file
6. **Keep this file secure!** It contains sensitive credentials

## Step 4: Configure Environment Variables

### Option A: Railway Deployment (Recommended)

In your Railway project dashboard:

1. Go to your project → Variables tab
2. Add the following variable:

```
FIREBASE_SERVICE_ACCOUNT
```

Value: Copy the **entire contents** of the downloaded JSON file and paste it as the value.

The JSON should look like this:

```json
{
  "type": "service_account",
  "project_id": "your-project-id",
  "private_key_id": "...",
  "private_key": "-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n",
  "client_email": "firebase-adminsdk-...@your-project-id.iam.gserviceaccount.com",
  "client_id": "...",
  "auth_uri": "https://accounts.google.com/o/oauth2/auth",
  "token_uri": "https://oauth2.googleapis.com/token",
  "auth_provider_x509_cert_url": "https://www.googleapis.com/oauth2/v1/certs",
  "client_x509_cert_url": "..."
}
```

### Option B: Local Development

For local development, you can use individual environment variables:

Create a `.env` file in the project root:

```bash
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxxxx@your-project-id.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nYour-Private-Key-Here\n-----END PRIVATE KEY-----\n"
```

**Important**: Add `.env` to your `.gitignore` to avoid committing sensitive credentials!

### Option C: Using the Full JSON (Alternative for Local Development)

Save the downloaded JSON file as `firebase-service-account.json` in your project root, then:

```bash
FIREBASE_SERVICE_ACCOUNT=$(cat firebase-service-account.json)
```

**Important**: Add `firebase-service-account.json` to your `.gitignore`!

## Step 5: Firestore Security Rules

In Firebase Console:

1. Go to Firestore Database → Rules
2. Update the rules to allow authenticated access:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Allow read/write to storage collection (protected by your app's basic auth)
    match /storage/{document=**} {
      allow read, write: if true;
    }
  }
}
```

**Note**: We use `if true` because authentication is handled by your Express server's Basic Auth middleware. The service account has full access regardless of these rules.

## Step 6: Deploy to Railway

After setting the `FIREBASE_SERVICE_ACCOUNT` environment variable in Railway:

1. Commit and push your code changes
2. Railway will automatically redeploy
3. Check the logs to verify Firebase initialization:
   - You should see: `✓ Firebase initialized with service account`
   - If you see: `⚠️ No Firebase configuration found`, check your environment variable

## Step 7: Verify Data Persistence

1. Add some listings to your app
2. In Firebase Console → Firestore Database, you should see:
   - A `storage` collection
   - A document named `house-listings`
   - The document contains your listings data

## Migrating Existing Data

If you have existing data in the local file storage (`data/listings.json`), you can migrate it:

### Option 1: Manual Migration

1. Export your data as CSV from the app (click "Export CSV" in List view)
2. After Firebase is set up, import the CSV back using "Import CSV"

### Option 2: Server-side Migration (Advanced)

If you have access to the Railway container with the old data:

1. SSH into the Railway container (if available)
2. Read `data/listings.json`
3. Make a POST request to `/api/storage/house-listings` with the data

## Troubleshooting

### "No Firebase configuration found"

- Verify the `FIREBASE_SERVICE_ACCOUNT` environment variable is set
- Check that the JSON is valid (paste into a JSON validator)
- Make sure there are no extra quotes around the JSON value

### "Error initializing Firebase"

- Check Railway logs for the specific error message
- Verify the service account JSON is complete and unmodified
- Ensure the private key includes `\n` characters (not actual newlines)

### "Permission denied" errors

- Verify Firestore is enabled in Firebase Console
- Check that the service account has the right permissions
- Review Firestore security rules

## Cost Considerations

Firebase Firestore free tier includes:

- 1 GiB storage
- 50,000 reads/day
- 20,000 writes/day
- 20,000 deletes/day

For a personal house hunting app, this should be **more than sufficient** and remain completely free.

## Data Structure

The app stores data in Firestore as follows:

```
storage (collection)
  └── house-listings (document)
      └── value: "[{listing1}, {listing2}, ...]" (JSON string)
      └── updatedAt: "2024-01-13T12:00:00.000Z"
```

Each time you save listings, it updates the single `house-listings` document, so you're only using 1 document in Firestore.

## Security Best Practices

1. **Never commit** the service account JSON file to Git
2. **Use environment variables** for sensitive credentials
3. **Rotate keys** if they're ever exposed
4. **Monitor usage** in Firebase Console to detect unusual activity
5. **Keep Basic Auth enabled** on your Express server for an additional security layer
