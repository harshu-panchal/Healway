const { sendPushNotification } = require('../services/firebaseAdminService');

/**
 * Send push notification to a specific user (patient or doctor)
 * Collects all FCM tokens (web + mobile), deduplicates, and sends.
 * Errors are caught and logged — notifications are non-critical.
 *
 * @param {string} userId - MongoDB user ID
 * @param {string} userType - 'patient' | 'doctor' | 'admin'
 * @param {object} payload - { title, body, data, icon }
 * @param {boolean} includeMobile - Whether to include mobile tokens (default: true)
 */
async function sendNotificationToUser(userId, userType, payload, includeMobile = true) {
    try {
        let UserModel;
        switch (userType) {
            case 'patient':
                UserModel = require('../models/Patient');
                break;
            case 'doctor':
                UserModel = require('../models/Doctor');
                break;
            default:
                // Admin model doesn't have FCM tokens yet
                return;
        }

        const user = await UserModel.findById(userId).select('fcmTokens fcmTokenMobile');
        if (!user) {
            return;
        }

        // Collect all tokens
        let tokens = [];
        if (user.fcmTokens && user.fcmTokens.length > 0) {
            tokens = [...tokens, ...user.fcmTokens];
        }
        if (includeMobile && user.fcmTokenMobile && user.fcmTokenMobile.length > 0) {
            tokens = [...tokens, ...user.fcmTokenMobile];
        }

        // Remove duplicates and empty values
        const uniqueTokens = [...new Set(tokens)].filter(Boolean);

        if (uniqueTokens.length === 0) {
            return; // No tokens registered — silent skip
        }

        await sendPushNotification(uniqueTokens, payload);
    } catch (error) {
        // Never throw — push notifications are non-critical
        console.error('⚠️  pushNotificationHelper error (non-critical):', error.message);
    }
}

module.exports = { sendNotificationToUser };
