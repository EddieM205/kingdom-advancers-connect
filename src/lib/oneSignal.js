import OneSignal from 'react-onesignal';

let initialized = false;

export async function initOneSignal() {
  if (initialized || !import.meta.env.VITE_ONESIGNAL_APP_ID) return;
  try {
    await OneSignal.init({
      appId: import.meta.env.VITE_ONESIGNAL_APP_ID,
      allowLocalhostAsSecureOrigin: true,
      serviceWorkerPath: 'OneSignalSDKWorker.js',
      notifyButton: { enable: false },
      promptOptions: {
        slidedown: {
          enabled: true,
          autoPrompt: true,
          timeDelay: 5,
          pageViews: 1,
          type: 'push',
          actionMessage: 'Allow push notifications for messages and updates.',
          acceptButtonText: 'Allow',
          cancelButtonText: 'No thanks',
        },
      },
    });
    initialized = true;
  } catch (e) {
    console.warn('OneSignal init failed:', e);
  }
}

export async function setOneSignalUser(email) {
  if (!email || !initialized) return;
  try {
    await OneSignal.login(email);
  } catch (e) {
    console.warn('OneSignal login failed:', e);
  }
}

export async function clearOneSignalUser() {
  if (!initialized) return;
  try {
    await OneSignal.logout();
  } catch (e) {}
}
