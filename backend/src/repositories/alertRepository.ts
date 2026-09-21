import { query } from '../db/postgres';
import { Alert, AlertCondition, MarketFilter } from '../domain/types';
import { v4 as uuidv4 } from 'uuid';

export class AlertRepository {
  async findByUserId(userId: string): Promise<Alert[]> {
    const sql = `
      SELECT id, user_id as "userId", symbol, condition, threshold::float, 
             market_filter as "marketFilter", triggered_at as "triggeredAt", 
             is_active as "isActive", created_at as "createdAt"
      FROM alerts
      WHERE user_id = $1
      ORDER BY created_at DESC
    `;
    const rows = await query<any>(sql, [userId]);
    return rows.map(r => ({
      ...r,
      marketFilter: typeof r.marketFilter === 'string' ? JSON.parse(r.marketFilter) : r.marketFilter,
    }));
  }

  async findActiveAlerts(): Promise<Alert[]> {
    const sql = `
      SELECT id, user_id as "userId", symbol, condition, threshold::float, 
             market_filter as "marketFilter", triggered_at as "triggeredAt", 
             is_active as "isActive", created_at as "createdAt"
      FROM alerts
      WHERE is_active = TRUE
    `;
    const rows = await query<any>(sql);
    return rows.map(r => ({
      ...r,
      marketFilter: typeof r.marketFilter === 'string' ? JSON.parse(r.marketFilter) : r.marketFilter,
    }));
  }

  async create(
    userId: string,
    symbol: string,
    condition: AlertCondition,
    threshold: number,
    marketFilter?: MarketFilter
  ): Promise<Alert> {
    const id = `alert-${uuidv4().slice(0, 8)}`;
    const sql = `
      INSERT INTO alerts (id, user_id, symbol, condition, threshold, market_filter, is_active, created_at)
      VALUES ($1, $2, $3, $4, $5, $6, TRUE, NOW())
      RETURNING id, user_id as "userId", symbol, condition, threshold::float, 
                market_filter as "marketFilter", triggered_at as "triggeredAt", 
                is_active as "isActive", created_at as "createdAt"
    `;
    const rows = await query<any>(sql, [
      id,
      userId,
      symbol.toUpperCase(),
      condition,
      threshold,
      marketFilter ? JSON.stringify(marketFilter) : null,
    ]);
    const r = rows[0];
    return {
      ...r,
      marketFilter: typeof r.marketFilter === 'string' ? JSON.parse(r.marketFilter) : r.marketFilter,
    };
  }

  async markTriggered(alertId: string): Promise<void> {
    const sql = `UPDATE alerts SET triggered_at = NOW(), is_active = FALSE WHERE id = $1`;
    await query(sql, [alertId]);
  }

  async toggleActive(alertId: string, userId: string): Promise<boolean> {
    const sql = `
      UPDATE alerts 
      SET is_active = NOT is_active 
      WHERE id = $1 AND user_id = $2
      RETURNING is_active as "isActive"
    `;
    const rows = await query<{ isActive: boolean }>(sql, [alertId, userId]);
    return rows.length > 0 ? rows[0].isActive : false;
  }

  async delete(alertId: string, userId: string): Promise<void> {
    const sql = `DELETE FROM alerts WHERE id = $1 AND user_id = $2`;
    await query(sql, [alertId, userId]);
  }
}

export const alertRepository = new AlertRepository();
