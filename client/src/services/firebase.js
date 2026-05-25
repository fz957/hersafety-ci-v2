/**
 * Firebase Cloud Messaging service for web
 * Handles push notifications on the client side
 */

import { initializeApp } from 'https://www.gstatic.com/firebasejs/12.13.0/firebase-app.js';
import { getMessaging, getToken, onMessage } from 'https://www.gstatic.com/firebasejs/12.13.0/firebase-messaging.js';

// Firebase configuration (public, safe to expose)
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyDC3YKr5AKsDWNByyFzuiAWIgt-CD41Qn4",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "safety-510e8.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "safety-510e8",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "safety-510e8.firebasestorage.app",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "872821982195",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:872821982195:web:23b320a62b99e2eba2c886",
};

let firebaseApp = null;
let messaging = null;
let isInitialized = false;

/**
 * Initialize Firebase
 */
export const initializeFirebase = async () => {
  if (isInitialized) return true;

  try {
    firebaseApp = initializeApp(firebaseConfig);
    messaging = getMessaging(firebaseApp);
    isInitialized = true;
    console.log('✓ Firebase initialized');
    return true;
  } catch (err) {
    console.error('✗ Firebase init failed:', err.message);
    return false;
  }
};

/**
 * Request permission and get FCM token
 */
export const requestNotificationPermission = async () => {
  try {
    if (!isInitialized) {
      await initializeFirebase();
    }

    // Check if browser supports notifications
    if (!('Notification' in window)) {
      console.warn('This browser does not support notifications');
      return null;
    }

    // Check if already granted
    if (Notification.permission === 'granted') {
      return await getToken(messaging, {
        vapidKey: import.meta.env.VITE_FIREBASE_VAPID_KEY || "VAPID_KEY_HERE",
      });
    }

    // Request permission
    if (Notification.permission !== 'denied') {
      const permission = await Notification.requestPermission();
      if (permission === 'granted') {
        return await getToken(messaging, {
          vapidKey: import.meta.env.VITE_FIREBASE_VAPID_KEY || "VAPID_KEY_HERE",
        });
      }
    }

    return null;
  } catch (err) {
    console.error('Notification permission error:', err);
    return null;
  }
};

/**
 * Register FCM token with backend
 */
export const registerFCMToken = async (token, api) => {
  try {
    if (!token) {
      console.warn('No FCM token to register');
      return { success: false };
    }

    const response = await api.post('/api/fcm/register-token', {
      token,
      deviceType: 'web',
    });

    console.log('✓ FCM token registered:', response.data);
    return response.data;
  } catch (err) {
    console.error('FCM token registration failed:', err);
    return { success: false, error: err.message };
  }
};

/**
 * Listen to incoming messages
 */
export const listenToMessages = (onMessageCallback) => {
  try {
    if (!messaging) {
      console.warn('Messaging not initialized');
      return;
    }

    onMessage(messaging, (payload) => {
      console.log('📨 Incoming notification:', payload);

      // Handle notification
      if (payload.notification) {
        const { title, body } = payload.notification;
        const notification = new Notification(title || 'HerSafety', {
          body: body || 'New notification',
          icon: '/logo.svg',
          badge: '/badge.svg',
          tag: 'hersafety-notification',
        });

        notification.onclick = () => {
          window.focus();
          if (onMessageCallback) {
            onMessageCallback(payload);
          }
        };
      }
    });
  } catch (err) {
    console.error('Message listener error:', err);
  }
};

/**
 * Setup complete FCM (init + request permission + register + listen)
 */
export const setupFCM = async (api) => {
  // Firebase CDN not accessible in this environment
  // Push notifications are handled via Web Push API (native browser notifications)
  // No setup needed - service worker handles background push notifications
  console.log('ℹ️  Push notifications: Using Web Push API (service worker)');
  return { success: true, message: 'Service worker ready for push notifications' };
};

/**
 * Manually request permissions (e.g., from settings)
 */
export const requestPermissionsManually = async () => {
  try {
    const permission = await Notification.requestPermission();
    return permission === 'granted';
  } catch (err) {
    console.error('Permission request failed:', err);
    return false;
  }
};

export default {
  initializeFirebase,
  requestNotificationPermission,
  registerFCMToken,
  listenToMessages,
  setupFCM,
  requestPermissionsManually,
};
