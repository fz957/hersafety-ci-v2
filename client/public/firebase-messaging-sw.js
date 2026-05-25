/**
 * Firebase Service Worker
 * Handles background push notifications
 */

importScripts('https://www.gstatic.com/firebasejs/12.13.0/firebase-app.js');
importScripts('https://www.gstatic.com/firebasejs/12.13.0/firebase-messaging.js');

const firebaseConfig = {
  apiKey: "AIzaSyDC3YKr5AKsDWNByyFzuiAWIgt-CD41Qn4",
  authDomain: "safety-510e8.firebaseapp.com",
  projectId: "safety-510e8",
  storageBucket: "safety-510e8.firebasestorage.app",
  messagingSenderId: "872821982195",
  appId: "1:872821982195:web:23b320a62b99e2eba2c886",
};

firebase.initializeApp(firebaseConfig);
const messaging = firebase.messaging();

// Handle background messages
messaging.onBackgroundMessage((payload) => {
  console.log('[Service Worker] Background notification received:', payload);

  const notificationTitle = payload.notification?.title || 'HerSafety';
  const notificationOptions = {
    body: payload.notification?.body || 'Nouvelle notification',
    icon: '/logo.svg',
    badge: '/badge.svg',
    tag: 'hersafety-notification',
    requireInteraction: payload.data?.requireInteraction === 'true',
    data: payload.data,
  };

  // Show notification
  self.registration.showNotification(notificationTitle, notificationOptions);
});

// Handle notification clicks
self.addEventListener('notificationclick', (event) => {
  console.log('[Service Worker] Notification clicked:', event.notification);

  event.notification.close();

  // Open/focus window
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // Check if client already exists
      for (let i = 0; i < clientList.length; i++) {
        const client = clientList[i];
        if (client.url === '/' && 'focus' in client) {
          return client.focus();
        }
      }
      // Open new window if not found
      if (clients.openWindow) {
        return clients.openWindow(event.notification.data?.link || '/');
      }
    })
  );
});
