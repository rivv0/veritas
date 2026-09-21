import { query } from '../db/postgres';
import { v4 as uuidv4 } from 'uuid';

export interface PushSubscriptionRecord {
  id: string;
  userId: string;
  deviceFp: string;
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
  createdAt: Date;
}

export class PushRepository {
  async saveSubscription(
    userId: string,
    deviceFp: string,
    endpoint: string,
    keys: { p256dh: string; auth: string }
  ): Promise<void> {
    const id = `push-${uuidv4().slice(0, 8)}`;
    const sql = `
      INSERT INTO push_subscriptions (id, user_id, device_fp, endpoint, keys, created_at)
      VALUES ($1, $2, $3, $4, $5, NOW())
      ON CONFLICT (user_id, device_fp) DO UPDATE 
      SET endpoint = EXCLUDED.endpoint, keys = EXCLUDED.keys, created_at = NOW()
    `;
    await query(sql, [id, userId, deviceFp, endpoint, JSON.stringify(keys)]);
  }

  async getSubscriptionsForUser(userId: string): Promise<PushSubscriptionRecord[]> {
    const sql = `
      SELECT id, user_id as "userId", device_fp as "deviceFp", endpoint, keys, created_at as "createdAt"
      FROM push_subscriptions
      WHERE user_id = $1
    `;
    const rows = await query<any>(sql, [userId]);
    return rows.map(r => ({
      ...r,
      keys: typeof r.keys === 'string' ? JSON.parse(r.keys) : r.keys,
    }));
  }

  async getAllSubscriptions(): Promise<PushSubscriptionRecord[]> {
    const sql = `
      SELECT id, user_id as "userId", device_fp as "deviceFp", endpoint, keys, created_at as "createdAt"
      FROM push_subscriptions
    `;
    const rows = await query<any>(sql);
    return rows.map(r => ({
      ...r,
      keys: typeof r.keys === 'string' ? JSON.parse(r.keys) : r.keys,
    }));
  }

  async deleteSubscription(endpoint: string): Promise<void> {
    const sql = `DELETE FROM push_subscriptions WHERE endpoint = $1`;
    await query(sql, [endpoint]);
  }
}

export const pushRepository = new PushRepository();
