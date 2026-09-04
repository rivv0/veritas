import { query } from '../db/postgres';
import { UserSession } from '../domain/types';

export class SessionRepository {
  async getSession(userId: string, deviceFp: string): Promise<UserSession | null> {
    const sql = `
      SELECT user_id as "userId", device_fp as "deviceFp", last_seen_at as "lastSeenAt", last_watchlist_id as "lastWatchlistId"
      FROM user_sessions
      WHERE user_id = $1 AND device_fp = $2
    `;
    const rows = await query<UserSession>(sql, [userId, deviceFp]);
    return rows.length > 0 ? rows[0] : null;
  }

  async updateLastSeen(userId: string, deviceFp: string, watchlistId?: string): Promise<UserSession> {
    const sql = `
      INSERT INTO user_sessions (user_id, device_fp, last_seen_at, last_watchlist_id)
      VALUES ($1, $2, CURRENT_TIMESTAMP, $3)
      ON CONFLICT (user_id, device_fp)
      DO UPDATE SET last_seen_at = CURRENT_TIMESTAMP, last_watchlist_id = COALESCE(EXCLUDED.last_watchlist_id, user_sessions.last_watchlist_id)
      RETURNING user_id as "userId", device_fp as "deviceFp", last_seen_at as "lastSeenAt", last_watchlist_id as "lastWatchlistId"
    `;
    const rows = await query<UserSession>(sql, [userId, deviceFp, watchlistId]);
    return rows[0];
  }
}

export const sessionRepository = new SessionRepository();
