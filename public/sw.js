// Service Worker for Kingdom Advancers — handles background notifications
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (e) => e.waitUntil(self.clients.claim()));

// Listen for messages from the main thread
self.addEventListener('message', (event) => {
  if (event.data?.type === 'PUSH_NOTIFY') {
    const { title, body, icon, tag, url } = event.data.payload;

    // Only show if all clients are hidden/background
    event.waitUntil(
      self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
        const hasVisibleClient = clients.some((c) => c.visibilityState === 'visible');
        if (!hasVisibleClient) {
          return self.registration.showNotification(title, {
            body,
            icon: icon || '/favicon.ico',
            tag: tag || 'ka-notification',
            data: { url },
            badge: '/favicon.ico',
            vibrate: [200, 100, 200],
          });
        }
      })
    );
  }
});

// Handle notification click — focus or open the app
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const targetUrl = event.notification.data?.url || '/';

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
      for (const client of clients) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          client.navigate(targetUrl);
          return client.focus();
        }
      }
      if (self.clients.openWindow) {
        return self.clients.openWindow(targetUrl);
      }
    })
  );
});
