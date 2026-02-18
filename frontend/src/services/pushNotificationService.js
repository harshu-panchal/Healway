/**
 * Push Notification Service
 * Manages FCM token registration, permission requests, and foreground message handling
 */

import { messaging, getToken, onMessage } from '../firebase';
import { ApiClient } from '../utils/apiClient';

const VAPID_KEY = import.meta.env.VITE_FIREBASE_VAPID_KEY;
const SW_PATH = '/firebase-messaging-sw.js';

// Module-specific API clients
const patientApi = new ApiClient('patient');
const doctorApi = new ApiClient('doctor');

function getApiClient(module) {
    return module === 'doctor' ? doctorApi : patientApi;
}

/**
 * Register the Firebase service worker
 * @returns {Promise<ServiceWorkerRegistration|null>}
 */
async function registerServiceWorker() {
    if (!('serviceWorker' in navigator)) {
        console.warn('⚠️  Service Workers not supported in this browser');
        return null;
    }

    try {
        const registration = await navigator.serviceWorker.register(SW_PATH);
        console.log('✅ Firebase Service Worker registered:', registration.scope);
        return registration;
    } catch (error) {
        console.error('❌ Service Worker registration failed:', error);
        return null;
    }
}

/**
 * Request browser notification permission
 * @returns {Promise<boolean>} true if granted
 */
async function requestNotificationPermission() {
    if (!('Notification' in window)) {
        console.warn('⚠️  Notifications not supported in this browser');
        return false;
    }

    if (Notification.permission === 'granted') {
        return true;
    }

    if (Notification.permission === 'denied') {
        console.warn('⚠️  Notification permission was denied by user');
        return false;
    }

    const permission = await Notification.requestPermission();
    if (permission === 'granted') {
        console.log('✅ Notification permission granted');
        return true;
    }

    console.warn('⚠️  Notification permission not granted:', permission);
    return false;
}

/**
 * Get FCM token from Firebase
 * @param {ServiceWorkerRegistration} registration
 * @returns {Promise<string|null>}
 */
async function getFCMToken(registration) {
    if (!messaging) {
        console.warn('⚠️  Firebase messaging not initialized (likely dummy credentials)');
        return null;
    }

    if (!VAPID_KEY) {
        console.warn('⚠️  VITE_FIREBASE_VAPID_KEY not set');
        return null;
    }

    try {
        const token = await getToken(messaging, {
            vapidKey: VAPID_KEY,
            serviceWorkerRegistration: registration,
        });

        if (token) {
            console.log('✅ FCM Token obtained');
            return token;
        }

        console.warn('⚠️  No FCM token available — permission may not be granted');
        return null;
    } catch (error) {
        console.warn('⚠️  FCM token error (expected with dummy credentials):', error.message);
        return null;
    }
}

/**
 * Register FCM token with the backend
 * @param {string} module - 'patient' | 'doctor'
 * @param {boolean} forceUpdate - Force re-registration even if token is cached
 * @returns {Promise<string|null>} The FCM token or null
 */
async function registerFCMToken(module = 'patient', forceUpdate = false) {
    try {
        // Check if already registered (skip if not forcing update)
        const cachedToken = localStorage.getItem(`fcm_token_${module}`);
        if (cachedToken && !forceUpdate) {
            console.log('ℹ️  FCM token already registered for', module);
            return cachedToken;
        }

        // Request permission
        const hasPermission = await requestNotificationPermission();
        if (!hasPermission) {
            return null;
        }

        // Register service worker
        const registration = await registerServiceWorker();
        if (!registration) {
            return null;
        }

        // Get FCM token
        const token = await getFCMToken(registration);
        if (!token) {
            return null;
        }

        // Save to backend
        const api = getApiClient(module);
        await api.post(`/${module === 'doctor' ? 'doctors' : 'patients'}/fcm-tokens/save`, {
            token,
            platform: 'web',
        });

        // Cache the token locally
        localStorage.setItem(`fcm_token_${module}`, token);
        console.log(`✅ FCM token registered with backend for ${module}`);
        return token;
    } catch (error) {
        // Non-critical — log but don't throw
        console.warn(`⚠️  FCM token registration failed for ${module} (non-critical):`, error.message);
        return null;
    }
}

/**
 * Remove FCM token from backend (call on logout)
 * @param {string} module - 'patient' | 'doctor'
 */
async function unregisterFCMToken(module = 'patient') {
    try {
        const token = localStorage.getItem(`fcm_token_${module}`);
        if (!token) return;

        const api = getApiClient(module);
        await api.delete(`/${module === 'doctor' ? 'doctors' : 'patients'}/fcm-tokens/remove`, {
            token,
            platform: 'web',
        });

        localStorage.removeItem(`fcm_token_${module}`);
        console.log(`✅ FCM token removed for ${module}`);
    } catch (error) {
        // Non-critical
        console.warn(`⚠️  FCM token removal failed (non-critical):`, error.message);
    }
}

/**
 * Setup foreground notification handler
 * Called when the app is open and a push notification arrives
 * @param {function} customHandler - Optional custom handler (payload) => void
 */
function setupForegroundNotificationHandler(customHandler) {
    if (!messaging) return;

    onMessage(messaging, (payload) => {
        console.log('📬 Foreground push notification received:', payload);

        const title = payload.notification?.title || 'Healway';
        const body = payload.notification?.body || '';
        const data = payload.data || {};

        // Show browser notification if permission is granted
        if ('Notification' in window && Notification.permission === 'granted') {
            try {
                new Notification(title, {
                    body,
                    icon: payload.notification?.icon || '/favicon.ico',
                    data,
                });
            } catch (error) {
                // Some browsers block new Notification() in service worker context
                console.warn('Could not show foreground notification:', error.message);
            }
        }

        // Call custom handler if provided
        if (typeof customHandler === 'function') {
            customHandler(payload);
        }
    });
}

/**
 * Initialize push notifications on app load
 * Only registers the service worker — token registration happens after login
 */
async function initializePushNotifications() {
    try {
        await registerServiceWorker();
    } catch (error) {
        console.warn('⚠️  Push notification initialization failed (non-critical):', error.message);
    }
}

export {
    initializePushNotifications,
    registerFCMToken,
    unregisterFCMToken,
    setupForegroundNotificationHandler,
    requestNotificationPermission,
};
