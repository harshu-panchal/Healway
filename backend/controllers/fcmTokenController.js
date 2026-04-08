const { sendPushNotification } = require('../services/firebaseAdminService');

const MAX_TOKENS = 10;

const extractAccessToken = (req) => {
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
        return req.headers.authorization.split(' ')[1];
    }

    if (req.cookies && req.cookies.token) {
        return req.cookies.token;
    }

    return null;
};

const formatAuthUser = (user, role) => {
    const firstName = user.firstName ? String(user.firstName).trim() : '';
    const lastName = user.lastName ? String(user.lastName).trim() : '';
    const fullName = `${firstName} ${lastName}`.trim();

    const status = (() => {
        if (typeof user.status === 'string' && user.status.trim()) return user.status.trim();
        if (Object.prototype.hasOwnProperty.call(user, 'isActive')) return user.isActive ? 'Active' : 'Inactive';
        return undefined;
    })();

    return {
        id: String(user._id || user.id),
        name: fullName || user.name,
        phone: user.phone,
        email: user.email,
        walletAmount: typeof user.walletBalance === 'number' ? user.walletBalance : 0,
        status,
    };
};

/**
 * Get the correct user model based on role
 */
function getUserModel(role) {
    switch (role) {
        case 'patient':
            return require('../models/Patient');
        case 'doctor':
            return require('../models/Doctor');
        default:
            return null;
    }
}

/**
 * Save FCM token for the authenticated user
 * POST /api/{role}/fcm-tokens/save
 * Body: { token: string, platform: 'web' | 'mobile' }
 */
const saveToken = async (req, res) => {
    try {
        const { token, platform = 'web' } = req.body;
        const role = req.auth?.role; // set by auth middleware via req.auth = { id, role }

        if (!token) {
            return res.status(400).json({ success: false, message: 'FCM token is required' });
        }

        if (!['web', 'mobile'].includes(platform)) {
            return res.status(400).json({ success: false, message: 'Platform must be web or mobile' });
        }

        const user = req.user;
        if (!user) {
            return res.status(401).json({ success: false, message: 'Authentication required' });
        }

        const tokenField = platform === 'web' ? 'fcmTokens' : 'fcmTokenMobile';

        // Initialize array if not exists
        if (!user[tokenField]) {
            user[tokenField] = [];
        }

        // Add token if not already present
        if (!user[tokenField].includes(token)) {
            user[tokenField].push(token);

            // Limit to MAX_TOKENS (keep most recent)
            if (user[tokenField].length > MAX_TOKENS) {
                user[tokenField] = user[tokenField].slice(-MAX_TOKENS);
            }

            await user.save();
        }

        // Keep response shape consistent with the mobile app's login contract.
        return res.json({
            success: true,
            message: 'Login successful',
            data: {
                token: extractAccessToken(req),
                user: formatAuthUser(user, role),
            },
        });
    } catch (error) {
        console.error('Error saving FCM token:', error);
        return res.status(500).json({ success: false, message: 'Failed to save FCM token' });
    }
};

/**
 * Remove FCM token for the authenticated user
 * DELETE /api/{role}/fcm-tokens/remove
 * Body: { token: string, platform: 'web' | 'mobile' }
 */
const removeToken = async (req, res) => {
    try {
        const { token, platform = 'web' } = req.body;
        const userId = req.user._id || req.user.id;
        const role = req.auth.role;

        if (!token) {
            return res.status(400).json({ success: false, message: 'FCM token is required' });
        }

        const UserModel = getUserModel(role);
        if (!UserModel) {
            return res.status(400).json({ success: false, message: 'Invalid user role' });
        }

        const user = await UserModel.findById(userId);
        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }

        const tokenField = platform === 'web' ? 'fcmTokens' : 'fcmTokenMobile';

        if (user[tokenField]) {
            user[tokenField] = user[tokenField].filter((t) => t !== token);
            await user.save();
        }

        return res.json({ success: true, message: 'FCM token removed successfully' });
    } catch (error) {
        console.error('Error removing FCM token:', error);
        return res.status(500).json({ success: false, message: 'Failed to remove FCM token' });
    }
};

/**
 * Send a test push notification to the authenticated user
 * POST /api/{role}/fcm-tokens/test
 */
const testNotification = async (req, res) => {
    try {
        const userId = req.user._id || req.user.id;
        const role = req.auth.role;

        const UserModel = getUserModel(role);
        if (!UserModel) {
            return res.status(400).json({ success: false, message: 'Invalid user role' });
        }

        const user = await UserModel.findById(userId).select('fcmTokens fcmTokenMobile firstName');
        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }

        const tokens = [
            ...(user.fcmTokens || []),
            ...(user.fcmTokenMobile || []),
        ];
        const uniqueTokens = [...new Set(tokens)].filter(Boolean);

        if (uniqueTokens.length === 0) {
            return res.json({
                success: false,
                message: 'No FCM tokens registered for this user. Please enable push notifications first.',
            });
        }

        await sendPushNotification(uniqueTokens, {
            title: '🔔 Test Notification',
            body: `Hello ${user.firstName || 'there'}! Push notifications are working correctly.`,
            data: {
                type: 'test',
                link: `/${role}/dashboard`,
            },
        });

        return res.json({
            success: true,
            message: `Test notification sent to ${uniqueTokens.length} device(s)`,
            tokenCount: uniqueTokens.length,
        });
    } catch (error) {
        console.error('Error sending test notification:', error);
        return res.status(500).json({ success: false, message: error.message || 'Failed to send test notification' });
    }
};

module.exports = { saveToken, removeToken, testNotification };
