// Web Push Service Worker

self.addEventListener('push', (event) => {
  let title = 'New Notification';
  let body = '';
  let url = '/';
  let icon = '/icon-192x192.png';

  if (event.data) {
    try {
      const data = event.data.json();
      title = data.title || title;
      body = data.body || body;
      url = data.url || url;
      icon = data.icon || icon;
    } catch {
      // Fallback if payload isn't JSON
      body = event.data.text();
    }
  }

  event.waitUntil(
    self.registration.getNotifications().then((existing) => {
      const count = existing.length + 1;
      if ('setAppBadge' in self.navigator) {
        self.navigator.setAppBadge(count);
      }
      return self.registration.showNotification(title, {
        body,
        icon,
        badge: '/icon-192x192.png',
        data: { url },
        // Samsung Internet requires vibrate to reliably show notifications
        vibrate: [200, 100, 200],
      });
    })
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = event.notification.data?.url || '/';

  if ('clearAppBadge' in self.navigator) {
    self.navigator.clearAppBadge();
  }

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      for (const client of windowClients) {
        if (client.url === url && 'focus' in client) {
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(url);
      }
    })
  );
});
