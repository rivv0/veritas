import { query } from '../db/postgres';
import { Signal, SignalType } from '../domain/types';

export class SignalService {
  async getRecentSignals(symbols: string[], since: Date): Promise<Signal[]> {
    if (symbols.length === 0) return [];
    
    const sql = `
      SELECT 
        id, symbol, signal_type as "signalType", severity, description, metadata, triggered_at as "triggeredAt"
      FROM signals
      WHERE symbol = ANY($1) AND triggered_at >= $2
      ORDER BY triggered_at DESC
      LIMIT 100
    `;
    const rows = await query<any>(sql, [symbols, since]);
    return rows.map((r) => ({
      ...r,
      signalType: r.signalType as SignalType,
    }));
  }
}

export const signalService = new SignalService();
