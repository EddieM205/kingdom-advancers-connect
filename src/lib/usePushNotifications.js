import { useEffect, useRef } from 'react';

let swRegistration = null;
let permissionGranted = false;

/**
 * Registers the service worker and requests Notification permission.
 * Returns a `notify(title, body, options)` function you can call anywhere.
 */
export function usePushNotifications() {
  const swRef = useRef(null);

  useEffect(() => {
    if (!('serviceWorker' in navigator) || !('Notification' in window)) return;

    // Register SW once globally
    if (!swRegistration) {
      navigator.serviceWorker
        .register('/sw.js')
        .then((reg) => {
          swRegistration = reg;
          swRef.current = reg;
        })
        .catch(() => {});
    } else {
      swRef.current = swRegistration;
    }

    // Request permission silently (no prompt if already decided)
    if (Notification.permission === 'default') {
      Notification.requestPermission().then((p) => {
        permissionGranted = p === 'granted';
      });
    } else {
      permissionGranted = Notification.permission === 'granted';
    }
  }, []);
}

/**
 * Send a push notification.
 * If the app is in the foreground the SW suppresses it automatically.
 * Can be called outside of React (e.g. in event handlers).
 */
export function sendPushNotification({ title, body, icon, tag, url }) {
  if (!('Notification' in window)) return;
  if (Notification.permission !== 'granted') return;

  // Use SW messaging for background support
  if (swRegistration) {
    swRegistration.active?.postMessage({
      type: 'PUSH_NOTIFY',
      payload: { title, body, icon, tag, url },
    });
  } else if (navigator.serviceWorker?.controller) {
    navigator.serviceWorker.controller.postMessage({
      type: 'PUSH_NOTIFY',
      payload: { title, body, icon, tag, url },
    });
  }
}