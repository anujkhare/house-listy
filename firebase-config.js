import admin from 'firebase-admin';

let firebaseApp = null;

export function initializeFirebase() {
  if (firebaseApp) {
    return firebaseApp;
  }

  try {
    // Debug: Log environment variable presence (not values)
    console.log('Firebase config check:', {
      hasServiceAccount: !!process.env.FIREBASE_SERVICE_ACCOUNT,
      hasProjectId: !!process.env.FIREBASE_PROJECT_ID,
      serviceAccountLength: process.env.FIREBASE_SERVICE_ACCOUNT?.length || 0
    });

    // Check if running in production with service account JSON
    if (process.env.FIREBASE_SERVICE_ACCOUNT) {
      const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);

      firebaseApp = admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
      });

      console.log('✓ Firebase initialized with service account');
      console.log(`  Project ID: ${serviceAccount.project_id}`);
    }
    // Fallback for development - use individual environment variables
    else if (process.env.FIREBASE_PROJECT_ID) {
      firebaseApp = admin.initializeApp({
        credential: admin.credential.cert({
          projectId: process.env.FIREBASE_PROJECT_ID,
          clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
          privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n')
        })
      });

      console.log('✓ Firebase initialized with environment variables');
      console.log(`  Project ID: ${process.env.FIREBASE_PROJECT_ID}`);
    }
    // If no Firebase config, return null (will use fallback storage)
    else {
      console.log('⚠️  No Firebase configuration found - using local file storage');
      console.log('   To enable Firebase, set FIREBASE_SERVICE_ACCOUNT environment variable');
      return null;
    }

    return firebaseApp;
  } catch (error) {
    console.error('✗ Error initializing Firebase:', error.message);
    console.error('   This usually means the JSON is malformed or credentials are invalid');
    return null;
  }
}

export function getFirestore() {
  const app = initializeFirebase();
  return app ? admin.firestore() : null;
}
