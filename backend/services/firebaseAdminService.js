const admin = require('firebase-admin');

let isInitialized = false;

/**
 * Initialize Firebase Admin SDK
 * Uses FIREBASE_SERVICE_ACCOUNT env var (JSON string)
 */
function initializeFirebaseAdmin() {
  if (isInitialized) return;

  try {
    const serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT;

    if (!serviceAccountJson) {
      console.warn('⚠️  FIREBASE_SERVICE_ACCOUNT env var not set. Push notifications disabled.');
      return;
    }

    let serviceAccount;
    try {
      serviceAccount = JSON.parse(serviceAccountJson);
    } catch (parseError) {
      console.error('❌ Failed to parse FIREBASE_SERVICE_ACCOUNT JSON:', parseError.message);
      return;
    }

    // Fix private key newlines if escaped
    if (serviceAccount.private_key) {
      serviceAccount.private_key = serviceAccount.private_key.replace(/\\n/g, '\n');
    }

    // Only initialize if no apps exist
    if (!admin.apps.length) {
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
      });
    }

    isInitialized = true;
    console.log('✅ Firebase Admin SDK initialized successfully');
  } catch (error) {
    console.error('❌ Firebase Admin SDK initialization failed:', error.message);
  }
}

/**
 * Send push notification to multiple FCM tokens
 * @param {string[]} tokens - Array of FCM tokens
 * @param {object} payload - Notification payload { title, body, data, icon }
 * @returns {Promise<object|null>} Firebase response or null if not initialized
 */
async function sendPushNotification(tokens, payload) {
  if (!isInitialized) {
    console.warn('⚠️  Firebase Admin not initialized. Skipping push notification.');
    return null;
  }

  if (!tokens || tokens.length === 0) {
    return null;
  }

  try {
    const message = {
      notification: {
        title: payload.title,
        body: payload.body,
      },
      data: payload.data
        ? Object.fromEntries(
            Object.entries(payload.data).map(([k, v]) => [k, String(v)])
          )
        : {},
      tokens,
    };

    // Add icon if provided (Android only)
    if (payload.icon) {
      message.android = {
        notification: {
          icon: payload.icon,
        },
      };
    }

    const response = await admin.messaging().sendEachForMulticast(message);
    console.log(
      `📬 Push notification sent: ${response.successCount} success, ${response.failureCount} failed`
    );

    // Log failures for debugging
    if (response.failureCount > 0) {
      response.responses.forEach((resp, idx) => {
        if (!resp.success) {
          console.warn(`   Token[${idx}] failed: ${resp.error?.message}`);
        }
      });
    }

    return response;
  } catch (error) {
    console.error('❌ Error sending push notification:', error.message);
    throw error;
  }
}

// Initialize on module load
initializeFirebaseAdmin();

module.exports = { sendPushNotification, initializeFirebaseAdmin };
