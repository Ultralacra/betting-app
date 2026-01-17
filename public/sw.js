/* eslint-disable no-restricted-globals */

// Versión del SW - cambiar en cada deploy para forzar actualización
const SW_VERSION = '1.0.0';

self.addEventListener('install', (event) => {
  console.log('[SW] Installing new version:', SW_VERSION);
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  console.log('[SW] Activated version:', SW_VERSION);
  event.waitUntil(self.clients.claim());
});

// Mensaje desde el cliente para verificar versión o forzar recarga
self.addEventListener('message', (event) => {
  if (event.data === 'GET_VERSION') {
    event.ports[0].postMessage({ version: SW_VERSION });
  }
  if (event.data === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

// Notificar a todos los clientes cuando hay una nueva versión disponible
self.addEventListener('controllerchange', () => {
  self.clients.matchAll().then((clients) => {
    clients.forEach((client) => {
      client.postMessage({ type: 'SW_UPDATED', version: SW_VERSION });
    });
  });
});

self.addEventListener('push', (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch {
    data = { title: 'BetTracker', body: event.data ? event.data.text() : '' };
  }

  const title = data.title || 'BetTracker';
  const options = {
    body: data.body || 'Tienes una actualización.',
    icon: data.icon || '/icon.svg',
    badge: data.badge || '/icon.svg',
    data: {
      url: data.url || '/',
    },
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = event.notification?.data?.url || '/';

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url && 'focus' in client) {
          client.navigate(url);
          return client.focus();
        }
      }
      if (self.clients.openWindow) return self.clients.openWindow(url);
      return undefined;
    })
  );
});
