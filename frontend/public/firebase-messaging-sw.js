// Firebase Cloud Messaging Service Worker
// Handles background push notifications when the app is not in focus

importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-messaging-compat.js');

// Firebase configuration
// NOTE: These values must be hardcoded in the service worker since it cannot
// access Vite environment variables. Replace with real credentials for production.
const firebaseConfig = {
    apiKey: 'AIzaSyDummy-Key-For-Testing-Only',
    authDomain: 'healway-dummy.firebaseapp.com',
    projectId: 'healway-dummy',
    storageBucket: 'healway-dummy.appspot.com',
    messagingSenderId: '123456789012',
    appId: '1:123456789012:web:abcdef123456',
    measurementId: 'G-DUMMY12345',
};

// Initialize Firebase
try {
    firebase.initializeApp(firebaseConfig);
} catch (error) {
    console.warn('[SW] Firebase init failed (dummy credentials):', error.message);
}

// Get messaging instance
let messaging;
try {
    messaging = firebase.messaging();
} catch (error) {
    console.warn('[SW] Firebase messaging unavailable:', error.message);
}

// Handle background messages (app is minimized or tab is not active)
if (messaging) {
    messaging.onBackgroundMessage((payload) => {
        console.log('[firebase-messaging-sw.js] Background message received:', payload);

        const notificationTitle = payload.notification?.title || 'Healway Notification';
        const notificationOptions = {
            body: payload.notification?.body || '',
            icon: payload.notification?.icon || '/favicon.ico',
            badge: '/favicon.ico',
            data: payload.data || {},
            // Show notification even if app is open in another tab
            requireInteraction: false,
        };

        self.registration.showNotification(notificationTitle, notificationOptions);
    });
}

// Handle notification click — open or focus the app
self.addEventListener('notificationclick', (event) => {
    event.notification.close();

    const data = event.notification.data || {};
    const urlToOpen = data.link || '/';

    event.waitUntil(
        clients
            .matchAll({ type: 'window', includeUncontrolled: true })
            .then((clientList) => {
                // If app is already open, focus it and navigate
                for (const client of clientList) {
                    if ('focus' in client) {
                        client.focus();
                        if ('navigate' in client) {
                            client.navigate(urlToOpen);
                        }
                        return;
                    }
                }
                // Otherwise open a new window
                if (clients.openWindow) {
                    return clients.openWindow(urlToOpen);
                }
            })
    );
});
