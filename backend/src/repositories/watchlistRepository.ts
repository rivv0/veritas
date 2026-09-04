import { query } from '../db/postgres';
import { Watchlist } from '../domain/types';
import { v4 as uuidv4 } from 'uuid';

export class WatchlistRepository {
  async findByUserId(userId: string): Promise<Watchlist[]> {
    const sql = `
      SELECT 
        w.id, w.user_id as "userId", w.name, w.sort_order as "sortOrder", 
        w.is_default as "isDefault", w.created_at as "createdAt", w.updated_at as "updatedAt",
        COALESCE(array_agg(wi.symbol ORDER BY wi.sort_order ASC, wi.added_at ASC) FILTER (WHERE wi.symbol IS NOT NULL), '{}') as symbols
      FROM watchlists w
      LEFT JOIN watchlist_items wi ON w.id = wi.watchlist_id
      WHERE w.user_id = $1
      GROUP BY w.id
      ORDER BY w.sort_order ASC, w.created_at ASC
    `;
    return query<Watchlist>(sql, [userId]);
  }

  async findById(watchlistId: string): Promise<Watchlist | null> {
    const sql = `
      SELECT 
        w.id, w.user_id as "userId", w.name, w.sort_order as "sortOrder", 
        w.is_default as "isDefault", w.created_at as "createdAt", w.updated_at as "updatedAt",
        COALESCE(array_agg(wi.symbol ORDER BY wi.sort_order ASC, wi.added_at ASC) FILTER (WHERE wi.symbol IS NOT NULL), '{}') as symbols
      FROM watchlists w
      LEFT JOIN watchlist_items wi ON w.id = wi.watchlist_id
      WHERE w.id = $1
      GROUP BY w.id
    `;
    const rows = await query<Watchlist>(sql, [watchlistId]);
    return rows.length > 0 ? rows[0] : null;
  }

  async create(userId: string, name: string): Promise<Watchlist> {
    const id = `wl-${uuidv4().slice(0, 8)}`;
    const sql = `
      INSERT INTO watchlists (id, user_id, name, is_default)
      VALUES ($1, $2, $3, FALSE)
      RETURNING id, user_id as "userId", name, sort_order as "sortOrder", is_default as "isDefault", created_at as "createdAt", updated_at as "updatedAt"
    `;
    const rows = await query<Watchlist>(sql, [id, userId, name]);
    return { ...rows[0], symbols: [] };
  }

  async addSymbol(watchlistId: string, symbol: string): Promise<void> {
    const id = `wi-${uuidv4().slice(0, 8)}`;
    const sql = `
      INSERT INTO watchlist_items (id, watchlist_id, symbol)
      VALUES ($1, $2, $3)
      ON CONFLICT (watchlist_id, symbol) DO NOTHING
    `;
    await query(sql, [id, watchlistId, symbol]);
  }

  async removeSymbol(watchlistId: string, symbol: string): Promise<void> {
    const sql = `DELETE FROM watchlist_items WHERE watchlist_id = $1 AND symbol = $2`;
    await query(sql, [watchlistId, symbol]);
  }

  async reorderSymbols(watchlistId: string, symbols: string[]): Promise<void> {
    // 1. Clear existing items
    await query(`DELETE FROM watchlist_items WHERE watchlist_id = $1`, [watchlistId]);

    // 2. Re-insert with new sort_order
    for (let i = 0; i < symbols.length; i++) {
      const id = `wi-${uuidv4().slice(0, 8)}`;
      await query(
        `INSERT INTO watchlist_items (id, watchlist_id, symbol, sort_order) VALUES ($1, $2, $3, $4)`,
        [id, watchlistId, symbols[i], i + 1]
      );
    }
  }

  async updateName(watchlistId: string, name: string): Promise<void> {
    await query(`UPDATE watchlists SET name = $2 WHERE id = $1`, [watchlistId, name]);
  }

  async delete(watchlistId: string): Promise<void> {
    await query(`DELETE FROM watchlists WHERE id = $1`, [watchlistId]);
  }

  async getAllWatchlistSymbols(): Promise<string[]> {
    const rows = await query<{ symbol: string }>(`SELECT DISTINCT symbol FROM watchlist_items`);
    return rows.map((r) => r.symbol);
  }
}

export const watchlistRepository = new WatchlistRepository();
