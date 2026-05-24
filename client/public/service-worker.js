// Service Worker pour les check-ins en arrière-plan
// Gère les check-ins même quand l'onglet HerSafety n'est pas actif

const CHECK_IN_INTERVAL = 1 * 60 * 1000; // 1 minute (test)
const API_URL = 'http://localhost:5000/api';

let lastCheckInTime = null;
let activeTrackId = null;
let missedCheckIns = 0;

// Recevoir messages depuis la app frontend
self.addEventListener('message', (event) => {
  const { type, trackId, action } = event.data;

  if (type === 'TRACK_STARTED') {
    activeTrackId = trackId;
    lastCheckInTime = Date.now();
    missedCheckIns = 0;
    console.log('[SW] Track started:', trackId);
  }

  if (type === 'TRACK_ENDED') {
    activeTrackId = null;
    lastCheckInTime = null;
    console.log('[SW] Track ended');
  }

  if (type === 'CHECK_IN_RESPONSE') {
    if (action === 'yes') {
      lastCheckInTime = Date.now();
      missedCheckIns = 0;
      console.log('[SW] Check-in OK - resetting timer');
    }
  }
});

// Background sync pour check-ins périodiques
self.addEventListener('sync', (event) => {
  if (event.tag === 'check-in-sync' && activeTrackId) {
    event.waitUntil(triggerCheckIn());
  }
});

// Envoyer notification check-in
async function triggerCheckIn() {
  if (!activeTrackId) return;

  const elapsed = Date.now() - lastCheckInTime;
  if (elapsed >= CHECK_IN_INTERVAL) {
    console.log('[SW] Check-in due after', Math.floor(elapsed / 1000), 'seconds');

    // Envoyer notification
    await self.registration.showNotification('HerSafety - Check-in', {
      body: 'Tout va bien ? Réponds rapidement',
      icon: '/hersafety-icon.png',
      tag: 'checkin-notification',
      requireInteraction: true,
      badge: '/hersafety-badge.png',
    });

    missedCheckIns++;

    // Auto-escalade après 2 check-ins manqués
    if (missedCheckIns >= 2) {
      console.log('[SW] Auto-escalade - 2 check-ins missed');
      await self.registration.showNotification('HerSafety - ESCALADE', {
        body: 'Alertes envoyées à tes contacts',
        icon: '/hersafety-icon.png',
        tag: 'escalade-notification',
        requireInteraction: true,
      });
    }

    lastCheckInTime = Date.now();
  }
}

// Notification click handler
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    clients.matchAll({ type: 'window' }).then((windowClients) => {
      for (let i = 0; i < windowClients.length; i++) {
        const client = windowClients[i];
        if (client.url === '/' && 'focus' in client) {
          client.focus();
          return;
        }
      }
      if (clients.openWindow) {
        return clients.openWindow('/');
      }
    })
  );
});

// Enregistrer periodic background sync toutes les minutes
setInterval(async () => {
  if (activeTrackId) {
    try {
      await self.registration.sync.register('check-in-sync');
    } catch (e) {
      console.error('[SW] Sync registration failed:', e);
    }
  }
}, 60 * 1000);

console.log('[SW] Service Worker registered');
