/// <reference lib="webworker" />
/// <reference types="vite-plugin-pwa/client" />

/**
 * CaseManagement.AI — Service Worker
 * Handles:
 *  1. Workbox app-shell precaching + runtime caching
 *  2. Firebase Cloud Messaging background push notifications
 */

import { clientsClaim } from 'workbox-core';
import {
  precacheAndRoute,
  cleanupOutdatedCaches,
  createHandlerBoundToURL,
} from 'workbox-precaching';
import { registerRoute, NavigationRoute } from 'workbox-routing';
import {
  NetworkFirst,
  CacheFirst,
  StaleWhileRevalidate,
} from 'workbox-strategies';
import { ExpirationPlugin } from 'workbox-expiration';
import { CacheableResponsePlugin } from 'workbox-cacheable-response';

declare const self: ServiceWorkerGlobalScope;

// Take control of all clients immediately on activation
clientsClaim();

// ── Precaching ────────────────────────────────────────────────────────────────
// self.__WB_MANIFEST is replaced at build time with the list of assets to precache
precacheAndRoute(self.__WB_MANIFEST);
cleanupOutdatedCaches();

// ── SPA Navigation fallback ───────────────────────────────────────────────────
// Always serve index.html for navigation requests so the SPA router handles routing
const navigationHandler = createHandlerBoundToURL('/index.html');
registerRoute(new NavigationRoute(navigationHandler));

// ── Runtime caching strategies ────────────────────────────────────────────────

// Images — cache-first with 30-day expiry
registerRoute(
  ({ request }) => request.destination === 'image',
  new CacheFirst({
    cacheName: 'icm-images-v1',
    plugins: [
      new CacheableResponsePlugin({ statuses: [0, 200] }),
      new ExpirationPlugin({ maxEntries: 100, maxAgeSeconds: 30 * 24 * 60 * 60 }),
    ],
  })
);

// Google Fonts stylesheets — stale-while-revalidate
registerRoute(
  ({ url }) => url.origin === 'https://fonts.googleapis.com',
  new StaleWhileRevalidate({ cacheName: 'icm-fonts-sheets-v1' })
);

// Google Fonts files — cache-first with 1-year expiry
registerRoute(
  ({ url }) => url.origin === 'https://fonts.gstatic.com',
  new CacheFirst({
    cacheName: 'icm-fonts-files-v1',
    plugins: [
      new CacheableResponsePlugin({ statuses: [0, 200] }),
      new ExpirationPlugin({ maxAgeSeconds: 365 * 24 * 60 * 60 }),
    ],
  })
);

// Firebase Storage assets — network-first with short cache
registerRoute(
  ({ url }) => url.hostname.includes('firebasestorage.googleapis.com'),
  new NetworkFirst({
    cacheName: 'icm-storage-v1',
    networkTimeoutSeconds: 5,
    plugins: [
      new CacheableResponsePlugin({ statuses: [200] }),
      new ExpirationPlugin({ maxEntries: 50, maxAgeSeconds: 24 * 60 * 60 }),
    ],
  })
);

// ── SW lifecycle messages ─────────────────────────────────────────────────────
self.addEventListener('message', (event) => {
  if (event.data?.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

// ── Firebase Cloud Messaging — Background handler ─────────────────────────────
// Firebase config values are inlined at build time from import.meta.env
const firebaseConfig = {
  apiKey:            import.meta.env.VITE_FIREBASE_API_KEY            as string,
  authDomain:        import.meta.env.VITE_FIREBASE_AUTH_DOMAIN        as string,
  projectId:         import.meta.env.VITE_FIREBASE_PROJECT_ID         as string,
  storageBucket:     import.meta.env.VITE_FIREBASE_STORAGE_BUCKET     as string,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID as string,
  appId:             import.meta.env.VITE_FIREBASE_APP_ID             as string,
};

// Only initialise FCM if the messaging sender ID is present
if (firebaseConfig.messagingSenderId) {
  // Use dynamic import so the SW still loads even if Firebase fails to init
  import('firebase/app').then(({ initializeApp, getApps, getApp }) => {
    const fbApp = getApps().length === 0
      ? initializeApp(firebaseConfig)
      : getApp();

    import('firebase/messaging/sw').then(({ getMessaging, onBackgroundMessage }) => {
      const messaging = getMessaging(fbApp);

      onBackgroundMessage(messaging, (payload) => {
        const title = payload.notification?.title ?? 'CaseManagement.AI';
        const body  = payload.notification?.body  ?? 'You have a new notification.';
        const icon  = payload.notification?.icon  ?? '/icons/icon-192.png';

        self.registration.showNotification(title, {
          body,
          icon,
          badge: '/icons/icon-192.png',
          tag: (payload.data?.['tag'] as string) ?? 'icm-push',
          renotify: true,
          data: {
            url: (payload.data?.['url'] as string) ?? '/dashboard',
            ...payload.data,
          },
        });
      });
    });
  });
}

// Open the app (or focus an existing tab) when a notification is clicked
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const targetUrl: string = (event.notification.data?.url as string) ?? '/dashboard';
  event.waitUntil(
    (self.clients as Clients).matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          (client as WindowClient).navigate(targetUrl);
          return (client as WindowClient).focus();
        }
      }
      return (self.clients as Clients).openWindow(targetUrl);
    })
  );
});
