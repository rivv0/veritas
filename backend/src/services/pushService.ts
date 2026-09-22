import webpush from 'web-push';
import { pushRepository } from '../repositories/pushRepository';

// VAPID keys loaded from environment variables or generated securely at runtime
// Eliminates any committed private key strings flagged by security/secret scanners
const vapidKeys =
  process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY
    ? {
        publicKey: process.env.VAPID_PUBLIC_KEY,
        privateKey: process.env.VAPID_PRIVATE_KEY,
      }
    : webpush.generateVAPIDKeys();

const VAPID_SUBJECT = process.env.VAPID_SUBJECT || 'mailto:alerts@veritas.market';

try {
  webpush.setVapidDetails(VAPID_SUBJECT, vapidKeys.publicKey, vapidKeys.privateKey);
} catch (err: any) {
  console.warn('[PushService] VAPID initialization warning:', err.message || err);
}

export class PushService {
  getPublicKey(): string {
    return vapidKeys.publicKey;
  }

  async sendToUser(
    userId: string,
    payload: { title: string; body: string; tag?: string; data?: any }
  ): Promise<{ sent: number; failed: number }> {
    const subs = await pushRepository.getSubscriptionsForUser(userId);
    let sent = 0;
    let failed = 0;

    const jsonPayload = JSON.stringify({
      title: payload.title,
      body: payload.body,
      tag: payload.tag || 'veritas-alert',
      data: payload.data || {},
      icon: '/icon-192.png',
      badge: '/badge-72.png',
    });

    for (const sub of subs) {
      try {
        const pushSubscription = {
          endpoint: sub.endpoint,
          keys: sub.keys,
        };
        await webpush.sendNotification(pushSubscription, jsonPayload);
        sent++;
      } catch (err: any) {
        failed++;
        // If 410 Gone or 404 Not Found, delete the invalid subscription
        if (err.statusCode === 410 || err.statusCode === 404) {
          console.log(`[PushService] Removing expired subscription for endpoint: ${sub.endpoint}`);
          await pushRepository.deleteSubscription(sub.endpoint);
        } else {
          console.warn('[PushService] Error sending push notification:', err.message || err);
        }
      }
    }

    return { sent, failed };
  }
}

export const pushService = new PushService();
