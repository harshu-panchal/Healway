// Firebase Cloud Messaging Service Worker — TEMPLATE
// This file is committed to git. Credentials are injected at build/dev time.
// The generated output goes to public/firebase-messaging-sw.js (gitignored).

importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-messaging-compat.js');

const firebaseConfig = {
    apiKey: '__VITE_FIREBASE_API_KEY__',
    authDomain: '__VITE_FIREBASE_AUTH_DOMAIN__',
    projectId: '__VITE_FIREBASE_PROJECT_ID__',
    storageBucket: '__VITE_FIREBASE_STORAGE_BUCKET__',
    messagingSenderId: '__VITE_FIREBASE_MESSAGING_SENDER_ID__',
    appId: '__VITE_FIREBASE_APP_ID__',
    measurementId: '__VITE_FIREBASE_MEASUREMENT_ID__',
};

try {
    firebase.initializeApp(firebaseConfig);
} catch (error) {
    console.warn('[SW] Firebase init failed:', error.message);
}

let messaging;
try {
    messaging = firebase.messaging();
} catch (error) {
    console.warn('[SW] Firebase messaging unavailable:', error.message);
}

if (messaging) {
    messaging.onBackgroundMessage((payload) => {
        const notificationTitle = payload.notification?.title || 'Healway Notification';
        const notificationOptions = {
            body: payload.notification?.body || '',
            icon: payload.notification?.icon || '/favicon.ico',
            badge: '/favicon.ico',
            data: payload.data || {},
            requireInteraction: false,
        };
        self.registration.showNotification(notificationTitle, notificationOptions);
    });
}

self.addEventListener('notificationclick', (event) => {
    event.notification.close();
    const urlToOpen = event.notification.data?.link || '/';
    event.waitUntil(
        clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
            for (const client of clientList) {
                if ('focus' in client) {
                    client.focus();
                    if ('navigate' in client) client.navigate(urlToOpen);
                    return;
                }
            }
            if (clients.openWindow) return clients.openWindow(urlToOpen);
        })
    );
});
