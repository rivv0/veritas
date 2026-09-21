'use client';

import { useState, useEffect, useCallback } from 'react';
import { fetchVapidKey, registerPushSubscription } from '@/lib/api';

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export function useWebPush() {
  const [isSupported, setIsSupported] = useState(false);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window !== 'undefined' && 'serviceWorker' in navigator && 'PushManager' in window) {
      setIsSupported(true);
      setPermission(Notification.permission);

      navigator.serviceWorker.ready.then((registration) => {
        registration.pushManager.getSubscription().then((subscription) => {
          setIsSubscribed(Boolean(subscription));
        });
      });
    }
  }, []);

  const subscribe = useCallback(async () => {
    if (!isSupported) {
      setError('Web Push is not supported in this browser');
      return false;
    }

    setLoading(true);
    setError(null);

    try {
      // 1. Request notification permissions
      const perm = await Notification.requestPermission();
      setPermission(perm);
      if (perm !== 'granted') {
        setError('Notification permission denied by user');
        return false;
      }

      // 2. Register Service Worker
      const reg = await navigator.serviceWorker.register('/sw.js');
      await navigator.serviceWorker.ready;

      // 3. Fetch VAPID key from backend
      const vapidRes = await fetchVapidKey();
      if (!vapidRes.success || !vapidRes.data?.publicKey) {
        throw new Error(vapidRes.error || 'Failed to obtain VAPID key from server');
      }

      const applicationServerKey = urlBase64ToUint8Array(vapidRes.data.publicKey);

      // 4. Subscribe with browser PushManager
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: applicationServerKey as any,
      });

      // 5. Send subscription to VERITAS backend
      await registerPushSubscription(sub.toJSON());
      setIsSubscribed(true);
      return true;
    } catch (err: any) {
      console.error('Web Push subscription failed:', err);
      setError(err.message || 'Web Push subscription failed');
      return false;
    } finally {
      setLoading(false);
    }
  }, [isSupported]);

  const unsubscribe = useCallback(async () => {
    if (!isSupported) return;
    setLoading(true);
    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      if (sub) {
        await sub.unsubscribe();
        setIsSubscribed(false);
      }
    } catch (err: any) {
      console.error('Web Push unsubscribe failed:', err);
      setError(err.message || 'Failed to unsubscribe');
    } finally {
      setLoading(false);
    }
  }, [isSupported]);

  return {
    isSupported,
    isSubscribed,
    permission,
    loading,
    error,
    subscribe,
    unsubscribe,
  };
}
