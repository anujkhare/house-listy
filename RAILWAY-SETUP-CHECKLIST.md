# Railway Firebase Setup Checklist

Use this checklist to ensure Firebase is properly configured on Railway.

## Prerequisites

- [ ] Firebase project created
- [ ] Firestore database enabled in Firebase Console
- [ ] Service account JSON key downloaded from Firebase

## Railway Configuration

### 1. Set Environment Variable

- [ ] Go to Railway dashboard → Your project → Variables
- [ ] Click "New Variable"
- [ ] Variable name: `FIREBASE_SERVICE_ACCOUNT` (exactly this, case-sensitive)
- [ ] Value: Paste the **entire JSON** from your service account file
- [ ] Variable should look like: `{"type": "service_account", "project_id": ...}`
- [ ] Click "Add" or "Save"

### 2. Verify Variable is Set

- [ ] Go to Variables tab
- [ ] See `FIREBASE_SERVICE_ACCOUNT` in the list
- [ ] Click to expand - should show JSON starting with `{"type":`
- [ ] No extra quotes around the JSON (should start with `{`, not `"{`)

### 3. Trigger Deployment

- [ ] Railway should auto-deploy after adding variable
- [ ] If not, click "Deploy" button manually
- [ ] Or make a small commit and push to trigger deploy

### 4. Check Deployment Logs

Go to Railway → Deployments → Latest deployment → Logs

Look for these lines during startup:

```
Firebase config check: { hasServiceAccount: true, hasProjectId: false, serviceAccountLength: 2487 }
✓ Firebase initialized with service account
  Project ID: your-project-id
```

### What to Look For:

✅ **Success** - You see:
```
✓ Firebase initialized with service account
  Project ID: your-actual-project-id
```

❌ **Problem** - You see:
```
⚠️  No Firebase configuration found - using local file storage
```
→ Go to [RAILWAY-FIREBASE-TROUBLESHOOTING.md](RAILWAY-FIREBASE-TROUBLESHOOTING.md)

❌ **Problem** - You see:
```
✗ Error initializing Firebase: Unexpected token...
```
→ JSON is malformed. Re-download service account key and try again.

### 5. Test Data Persistence

- [ ] Open your Railway app URL
- [ ] Add a test listing (any house)
- [ ] Go back to Railway dashboard
- [ ] Click "Settings" → "Restart"
- [ ] Wait for restart to complete
- [ ] Open your app URL again
- [ ] **Check**: Is your test listing still there?

✅ **Success**: Listing is still there → Firebase is working!
❌ **Problem**: Listing is gone → Firebase not configured correctly

### 6. Verify in Firebase Console

- [ ] Go to [Firebase Console](https://console.firebase.google.com/)
- [ ] Select your project
- [ ] Click "Firestore Database"
- [ ] You should see a `storage` collection
- [ ] Click on `storage` → `house-listings` document
- [ ] The document should contain your app's listing data

## Troubleshooting

If any step fails, see [RAILWAY-FIREBASE-TROUBLESHOOTING.md](RAILWAY-FIREBASE-TROUBLESHOOTING.md)

## Common Mistakes

❌ **Wrong variable name**: `FIREBASE_CONFIG` or `FIREBASE_CREDENTIALS`
✅ **Correct**: `FIREBASE_SERVICE_ACCOUNT`

❌ **Extra quotes**: `"{\"type\":\"service_account\"...}"`
✅ **Correct**: `{"type":"service_account"...}`

❌ **Escaped newlines**: `{"private_key":"-----BEGIN PRIVATE KEY-----\\nMIIE..."}`
✅ **Correct**: `{"private_key":"-----BEGIN PRIVATE KEY-----\nMIIE..."}`

❌ **Multiple variables**: Setting `FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL`, etc. separately
✅ **Correct**: One variable `FIREBASE_SERVICE_ACCOUNT` with the entire JSON

## Success Criteria

All of these should be true:

✅ Railway logs show: `✓ Firebase initialized with service account`
✅ App data persists after Railway restart
✅ Firebase Console shows `storage/house-listings` document with data
✅ No `⚠️ No Firebase configuration found` warning in logs

## Next Steps

Once Firebase is working:

1. Your data will persist across Railway restarts
2. No more data loss issues
3. You can safely add listings without worrying about losing them
4. Consider backing up by exporting CSV periodically (optional)

## Need Help?

See detailed guides:
- [FIREBASE-SETUP.md](FIREBASE-SETUP.md) - Complete Firebase setup guide
- [RAILWAY-FIREBASE-TROUBLESHOOTING.md](RAILWAY-FIREBASE-TROUBLESHOOTING.md) - Troubleshooting guide
