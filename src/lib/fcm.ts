/**
 * Firebase Cloud Messaging — foreground token + message handling.
 *
 * SETUP REQUIRED:
 *   1. Go to Firebase Console → Project Settings → Cloud Messaging
 *   2. Under "Web Push certificates", click "Generate key pair" (if none exist)
 *   3. Copy the key pair string and add it to .env.local:
 *        VITE_FIREBASE_VAPID_KEY=<your-vapid-key>
 *   4. Re-deploy. Push notifications will then work on desktop Chrome + Edge
 *      and on Android Chrome.
 *
 * iOS Safari support for Web Push requires iOS 16.4+ and the site must be
 * added to the home screen first.
 */

import { getMessaging, getToken, onMessage, isSupported } from 'firebase/messaging';
import { toast } from 'sonner';
import app from '@/lib/firebase';

const VAPID_KEY = import.meta.env.VITE_FIREBASE_VAPID_KEY as string | undefined;

/**
 * Request permission, register SW, and retrieve the FCM registration token.
 * Returns the token string on success, or null if unsupported / denied.
 */
export async function initFCM(): Promise<string | null> {
  // Guard: need VAPID key, Notification API, and service worker support
  if (!VAPID_KEY) {
    console.info('[FCM] VITE_FIREBASE_VAPID_KEY not set — push notifications disabled.');
    return null;
  }

  try {
    const supported = await isSupported();
    if (!supported) {
      console.info('[FCM] Firebase Messaging not supported in this environment.');
      return null;
    }

    if (!('Notification' in window) || !('serviceWorker' in navigator)) {
      return null;
    }

    const permission = Notification.permission === 'granted'
      ? 'granted'
      : await Notification.requestPermission();

    if (permission !== 'granted') {
      console.info('[FCM] Notification permission denied.');
      return null;
    }

    // Wait for the Workbox-generated SW to be ready — it also handles FCM
    // background messages (see src/sw.ts).
    const registration = await navigator.serviceWorker.ready;

    const messaging = getMessaging(app);
    const token = await getToken(messaging, {
      vapidKey: VAPID_KEY,
      serviceWorkerRegistration: registration,
    });

    console.info('[FCM] Registration token obtained.');
    return token;
  } catch (err) {
    // Non-fatal — app works fine without push
    console.warn('[FCM] Could not initialise push notifications:', err);
    return null;
  }
}

/**
 * Listen for foreground push messages and surface them as toasts.
 * Call once after the user has authenticated.
 */
export async function setupForegroundMessages(): Promise<void> {
  if (!VAPID_KEY) return;

  try {
    const supported = await isSupported();
    if (!supported) return;

    const messaging = getMessaging(app);

    onMessage(messaging, (payload) => {
      const title = payload.notification?.title ?? 'CaseManagement.AI';
      const body  = payload.notification?.body  ?? 'You have a new notification.';

      toast(title, {
        description: body,
        duration: 8000,
        action: payload.data?.['url']
          ? {
              label: 'View',
              onClick: () => {
                window.location.href = payload.data!['url'] as string;
              },
            }
          : undefined,
      });
    });
  } catch (err) {
    console.warn('[FCM] Could not set up foreground message handler:', err);
  }
}
