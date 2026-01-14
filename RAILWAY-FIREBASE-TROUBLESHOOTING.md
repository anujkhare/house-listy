# Railway + Firebase Troubleshooting Guide

If you're seeing `⚠️ No Firebase configuration found - using local file storage` in your Railway logs, follow these steps to debug and fix the issue.

## Step 1: Check Railway Logs

1. Go to your Railway project dashboard
2. Click on your service
3. Click on the "Deployments" tab
4. Click on the latest deployment
5. Look at the logs for this line:

```
Firebase config check: { hasServiceAccount: false, hasProjectId: false, serviceAccountLength: 0 }
```

If `hasServiceAccount` is `false`, Railway isn't finding the environment variable.

## Step 2: Verify Environment Variable in Railway

1. In Railway dashboard, go to your project
2. Click on your service
3. Click on the "Variables" tab
4. Look for `FIREBASE_SERVICE_ACCOUNT`

### Common Issues:

#### Issue A: Variable Not Set
**Symptom**: You don't see `FIREBASE_SERVICE_ACCOUNT` in the variables list

**Solution**: Add it:
1. Click "New Variable"
2. **Variable name**: `FIREBASE_SERVICE_ACCOUNT` (exactly this, case-sensitive)
3. **Value**: Paste the entire contents of your Firebase service account JSON file

#### Issue B: Variable Name is Wrong
**Symptom**: Variable exists but has a different name (like `FIREBASE_CONFIG` or `FIREBASE_CREDENTIALS`)

**Solution**:
- Delete the incorrectly named variable
- Create a new one with the exact name: `FIREBASE_SERVICE_ACCOUNT`

#### Issue C: JSON is Malformed
**Symptom**: Logs show `✗ Error initializing Firebase: Unexpected token` or `JSON parse error`

**Solution**: Verify your JSON is valid
1. Copy the value from Railway
2. Paste it into [JSONLint](https://jsonlint.com/) to validate
3. The JSON should look exactly like this:

```json
{
  "type": "service_account",
  "project_id": "your-project-id",
  "private_key_id": "abc123...",
  "private_key": "-----BEGIN PRIVATE KEY-----\nMIIE...\n-----END PRIVATE KEY-----\n",
  "client_email": "firebase-adminsdk-xxxxx@your-project-id.iam.gserviceaccount.com",
  "client_id": "123456789...",
  "auth_uri": "https://accounts.google.com/o/oauth2/auth",
  "token_uri": "https://oauth2.googleapis.com/token",
  "auth_provider_x509_cert_url": "https://www.googleapis.com/oauth2/v1/certs",
  "client_x509_cert_url": "https://www.googleapis.com/robot/v1/metadata/x509/..."
}
```

**Important**: The `private_key` should contain `\n` (backslash-n) characters, NOT actual newlines.

#### Issue D: Extra Quotes or Escaping
**Symptom**: Variable has quotes around it like `"{\"type\":...}"`

**Solution**:
- Railway variables should be pasted as-is, without surrounding quotes
- Don't escape the JSON - paste it directly as shown above

## Step 3: Re-download Service Account Key

If you're still having issues, get a fresh service account key from Firebase:

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project
3. Click the gear icon ⚙️ → "Project settings"
4. Go to "Service accounts" tab
5. Click "Generate new private key"
6. Click "Generate key" - this downloads a JSON file
7. Open the file in a text editor
8. **Copy the entire contents** (Cmd+A, Cmd+C)
9. Go to Railway → Variables
10. Delete the old `FIREBASE_SERVICE_ACCOUNT` variable
11. Create a new one and paste the JSON

## Step 4: Verify Railway Redeploys

After changing environment variables:

1. Railway should automatically trigger a new deployment
2. Wait for the deployment to complete (watch the "Deployments" tab)
3. Check the logs - you should now see:

```
Firebase config check: { hasServiceAccount: true, hasProjectId: false, serviceAccountLength: 2487 }
✓ Firebase initialized with service account
  Project ID: your-project-id
```

If you don't see a new deployment:
- Click "Deploy" button manually in Railway
- Or make a small commit and push to trigger a deploy

## Step 5: Test the Connection

Once deployed with Firebase configured:

1. Open your Railway app URL
2. Add a test listing
3. Check Railway logs - you should see Firestore operations
4. Restart your Railway service (Settings → Restart)
5. Open your app again - the listing should still be there!

If the listing disappeared after restart, Firebase isn't working yet.

## Alternative: Use Individual Environment Variables

If you keep having JSON parsing issues, use separate variables:

In Railway Variables, add these three variables:

```
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxxxx@your-project-id.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY=-----BEGIN PRIVATE KEY-----\nYour-Key-Here\n-----END PRIVATE KEY-----\n
```

**Important for `FIREBASE_PRIVATE_KEY`**:
- Copy from the JSON's `private_key` field
- Keep the `\n` characters (don't convert to actual newlines)
- Include the `-----BEGIN PRIVATE KEY-----` and `-----END PRIVATE KEY-----` parts

## Verifying Firebase is Working

When Firebase is correctly configured, you'll see in Railway logs:

```
Firebase config check: { hasServiceAccount: true, hasProjectId: false, serviceAccountLength: 2487 }
✓ Firebase initialized with service account
  Project ID: your-project-id
🚀 Server running on port 3001
```

And in your Firebase Console:
1. Go to Firestore Database
2. You should see a `storage` collection
3. Inside it, a `house-listings` document
4. The document contains your app data

## Still Having Issues?

Common debugging steps:

1. **Check the exact error message** in Railway logs
2. **Verify Firestore is enabled** in Firebase Console
3. **Check Firebase project permissions** - the service account needs Firestore access
4. **Try a different browser** when accessing Railway dashboard (sometimes copy-paste issues)
5. **Use the Railway CLI** to set variables programmatically:

```bash
railway variables --set FIREBASE_SERVICE_ACCOUNT="$(cat firebase-service-account.json)"
```

6. **Contact Railway support** if environment variables aren't being set properly

## Need Help?

If you're still stuck:

1. Check Railway logs for the exact error message
2. Verify the `Firebase config check` output
3. Make sure Firestore is enabled in Firebase Console
4. Double-check the service account JSON is valid
