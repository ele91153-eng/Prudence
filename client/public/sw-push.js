// Push notification handler (loaded by vite-plugin-pwa's service worker)
self.addEventListener('push', event => {
  const data = event.data?.json() || { title: 'Goal Coach', body: 'Time to work on your goal!' };
  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: '/icon-192.png',
      badge: '/icon-192.png',
      vibrate: [200, 100, 200],
      data: data.url ? { url: data.url } : undefined,
    })
  );
});

self.addEventListener('notificationclick', event => {
  event.notification.close();
  const url = event.notification.data?.url || '/';
  event.waitUntil(clients.openWindow(url));
});
