import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App.jsx';
import './index.css';
import 'leaflet/dist/leaflet.css';

// Enregistrer le Service Worker pour les check-ins en arrière-plan
// UNIQUEMENT en localhost ou HTTPS (requirement des SW)
if ('serviceWorker' in navigator && (window.location.protocol === 'https:' || window.location.hostname === 'localhost')) {
  navigator.serviceWorker.register('/service-worker.js')
    .then((reg) => {
      console.log('[App] Service Worker enregistré:', reg.scope);
    })
    .catch((err) => {
      console.error('[App] Erreur SW:', err);
    });
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </React.StrictMode>
);
