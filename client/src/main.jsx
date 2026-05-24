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

// Service Worker - DISABLED
// Check-in system works fine with frontend timer (useCheckInTimer)
// Service Workers cause caching issues and sync registration errors
// if ('serviceWorker' in navigator) {
//   navigator.serviceWorker.getRegistrations()
//     .then((registrations) => {
//       registrations.forEach((reg) => reg.unregister());
//     });
// }
console.log('[App] Service Worker disabled - using frontend timer only');

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </React.StrictMode>
);
