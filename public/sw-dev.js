// Development Service Worker for Push Notifications
// This is a minimal service worker that only handles push notifications
// The full PWA service worker is generated during production build

console.log('[Dev SW] Service Worker loading...');

// Install event - just activate immediately
self.addEventListener('install', (event) => {
  console.log('[Dev SW] Installing...');
  self.skipWaiting();
});

// Activate event - take control immediately
self.addEventListener('activate', (event) => {
  console.log('[Dev SW] Activating...');
  event.waitUntil(self.clients.claim());
});

// Handle push notifications
self.addEventListener('push', function(event) {
  console.log('[Dev SW] Push received:', event);

  if (!event.data) {
    console.log('[Dev SW] Push event but no data');
    return;
  }

  try {
    const data = event.data.json();
    console.log('[Dev SW] Push data:', data);

    const options = {
      body: data.body || 'You have a new notification',
      icon: data.icon || '/icons/icon-192x192.png',
      badge: data.badge || '/icons/icon-72x72.png',
      tag: data.tag || 'grindproof-notification',
      requireInteraction: data.requireInteraction || false,
      data: data.data || { url: '/' },
      vibrate: [200, 100, 200],
      actions: [
        {
          action: 'open',
          title: 'Open App',
        },
        {
          action: 'close',
          title: 'Dismiss',
        },
      ],
    };

    event.waitUntil(
      self.registration.showNotification(data.title || 'Grindproof', options)
    );
  } catch (error) {
    console.error('[Dev SW] Error parsing push data:', error);
    // Show a generic notification if parsing fails
    event.waitUntil(
      self.registration.showNotification('Grindproof', {
        body: 'You have a new notification',
        icon: '/icons/icon-192x192.png',
      })
    );
  }
});

// Handle notification clicks
self.addEventListener('notificationclick', function(event) {
  console.log('[Dev SW] Notification clicked:', event);

  event.notification.close();

  if (event.action === 'close') {
    return;
  }

  const urlToOpen = event.notification.data?.url || '/dashboard';
  console.log('[Dev SW] Opening URL:', urlToOpen);

  event.waitUntil(
    clients
      .matchAll({
        type: 'window',
        includeUncontrolled: true,
      })
      .then(function(clientList) {
        // Check if there's already a window open
        for (let i = 0; i < clientList.length; i++) {
          const client = clientList[i];
          const clientUrl = new URL(client.url);
          const targetUrl = new URL(urlToOpen, self.location.origin);
          
          // Always navigate to show the modal, even if on same origin
          if (clientUrl.origin === targetUrl.origin && 'focus' in client) {
            return client.focus().then(function(focusedClient) {
              if ('navigate' in focusedClient) {
                return focusedClient.navigate(urlToOpen);
              }
            });
          }
        }
        
        // No window open, open a new one
        if (clients.openWindow) {
          return clients.openWindow(urlToOpen);
        }
      })
  );
});

// Handle notification close
self.addEventListener('notificationclose', function(event) {
  console.log('[Dev SW] Notification closed:', event);
});

console.log('[Dev SW] Push notification handlers loaded');

