import { Tick, Alert, AlertCondition, MarketFilter } from '../domain/types';
import { alertRepository } from '../repositories/alertRepository';
import { redisPub } from '../db/redis';
import { pushService } from '../services/pushService';

export interface TriggeredAlertEvent {
  alertId: string;
  userId: string;
  symbol: string;
  condition: AlertCondition;
  threshold: number;
  triggerPrice: number;
  marketContext?: string;
  timestamp: string;
}

export class AlertEngine {
  private activeAlerts: Alert[] = [];
  private lastAlertsFetchTime = 0;
  private fetchIntervalMs = 30000; // Refresh active alerts every 30s
  private marketIndexStates: Map<string, { ltp: number; changePercent: number }> = new Map();
  private onAlertTriggeredCallbacks: ((event: TriggeredAlertEvent) => void)[] = [];

  constructor() {
    // Default benchmark index states
    this.marketIndexStates.set('SPX', { ltp: 5800, changePercent: 0.35 });
    this.marketIndexStates.set('NIFTY', { ltp: 25400, changePercent: 0.28 });
  }

  onAlertTriggered(cb: (event: TriggeredAlertEvent) => void) {
    this.onAlertTriggeredCallbacks.push(cb);
  }

  /**
   * Update latest known index state (e.g. SPX or NIFTY or sector benchmark)
   */
  updateIndexState(indexName: string, ltp: number, changePercent: number) {
    this.marketIndexStates.set(indexName.toUpperCase(), { ltp, changePercent });
  }

  async refreshActiveAlerts(): Promise<void> {
    try {
      this.activeAlerts = await alertRepository.findActiveAlerts();
      this.lastAlertsFetchTime = Date.now();
    } catch (err: any) {
      // In-memory or initial DB query failure
    }
  }

  /**
   * Evaluates active alerts against the incoming tick within the single evaluation loop.
   */
  async evaluateTick(tick: Tick): Promise<TriggeredAlertEvent[]> {
    if (Date.now() - this.lastAlertsFetchTime > this.fetchIntervalMs) {
      await this.refreshActiveAlerts();
    }

    if (this.activeAlerts.length === 0) return [];

    const triggered: TriggeredAlertEvent[] = [];
    const remainingAlerts: Alert[] = [];

    // Derive change percent for tick
    const baseClose = tick.close || tick.open || tick.ltp;
    const changePercent = baseClose > 0 ? ((tick.ltp - baseClose) / baseClose) * 100 : 0;

    for (const alert of this.activeAlerts) {
      if (alert.symbol.toUpperCase() !== tick.symbol.toUpperCase()) {
        remainingAlerts.push(alert);
        continue;
      }

      let isConditionMet = false;

      switch (alert.condition) {
        case 'ABOVE':
          isConditionMet = tick.ltp >= alert.threshold;
          break;
        case 'BELOW':
          isConditionMet = tick.ltp <= alert.threshold;
          break;
        case 'PCT_CHANGE_UP':
          isConditionMet = changePercent >= alert.threshold;
          break;
        case 'PCT_CHANGE_DOWN':
          isConditionMet = changePercent <= -Math.abs(alert.threshold);
          break;
      }

      // Check optional composite market-level condition (e.g. "AND SPX green")
      if (isConditionMet && alert.marketFilter) {
        const isFilterSatisfied = this.evaluateMarketFilter(alert.marketFilter);
        if (!isFilterSatisfied) {
          isConditionMet = false;
        }
      }

      if (isConditionMet) {
        // Mark alert as triggered
        try {
          await alertRepository.markTriggered(alert.id);
        } catch (e) { }

        let marketDesc = '';
        if (alert.marketFilter) {
          marketDesc = ` (Market Condition: ${alert.marketFilter.index} is ${alert.marketFilter.condition})`;
        }

        const event: TriggeredAlertEvent = {
          alertId: alert.id,
          userId: alert.userId,
          symbol: alert.symbol,
          condition: alert.condition,
          threshold: alert.threshold,
          triggerPrice: tick.ltp,
          marketContext: marketDesc,
          timestamp: new Date().toISOString(),
        };

        triggered.push(event);

        // Publish to user-specific Redis channel
        try {
          await redisPub.publish(
            `market:alerts:${alert.userId}`,
            JSON.stringify({ type: 'alert_triggered', alert: event })
          );
        } catch (e) { }

        // Dispatch Web Push notification
        try {
          await pushService.sendToUser(alert.userId, {
            title: `🔔 Price Alert: ${alert.symbol} triggered!`,
            body: `${alert.symbol} hit ₹${tick.ltp.toFixed(2)} (${alert.condition} ${alert.threshold})${marketDesc}`,
            tag: `alert-${alert.id}`,
            data: { symbol: alert.symbol, alertId: alert.id },
          });
        } catch (e) { }

        // Trigger local listeners
        this.onAlertTriggeredCallbacks.forEach((cb) => cb(event));
      } else {
        remainingAlerts.push(alert);
      }
    }

    this.activeAlerts = remainingAlerts;
    return triggered;
  }

  private evaluateMarketFilter(filter: MarketFilter): boolean {
    const idxState = this.marketIndexStates.get(filter.index.toUpperCase());
    if (!idxState) return true; // If benchmark not yet tracked, default to passing

    if (filter.condition === 'GREEN') {
      return idxState.changePercent > 0;
    }
    if (filter.condition === 'RED') {
      return idxState.changePercent < 0;
    }
    if (filter.condition === 'ABOVE' && filter.value !== undefined) {
      return idxState.ltp >= filter.value;
    }
    if (filter.condition === 'BELOW' && filter.value !== undefined) {
      return idxState.ltp <= filter.value;
    }
    return true;
  }
}

export const alertEngine = new AlertEngine();
