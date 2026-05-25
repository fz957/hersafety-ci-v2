import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App.jsx';
import './index.css';
import 'leaflet/dist/leaflet.css';

// Catch all unhandled errors
window.addEventListener('error', (event) => {
  console.error('🔴 UNHANDLED ERROR:', event.error);
});

window.addEventListener('unhandledrejection', (event) => {
  console.error('🔴 UNHANDLED REJECTION:', event.reason);
});

// Service Worker — ENABLED for Firebase Cloud Messaging only
// Allows push notifications to work even when the app is closed
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('/firebase-messaging-sw.js')
    .then((registration) => {
      console.log('✓ FCM Service Worker registered');
    })
    .catch((err) => {
      console.warn('⚠ FCM Service Worker registration failed:', err.message);
    });
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </React.StrictMode>
);
