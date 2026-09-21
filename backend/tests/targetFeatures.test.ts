import { describe, it, expect, beforeEach } from 'vitest';
import { calendarService } from '../src/services/calendarService';
import { gapDetector } from '../src/signal/gapDetector';
import { alertEngine } from '../src/signal/alertEngine';
import { replayBacktester } from '../src/signal/replayBacktester';
import { SignalType, Tick, Alert } from '../src/domain/types';
import { alertRepository } from '../src/repositories/alertRepository';

describe('VERITAS Target Architecture Unit & Integration Tests', () => {
  describe('CalendarService', () => {
    it('accurately identifies exchange for Indian and US symbols', () => {
      expect(calendarService.getExchange('RELIANCE')).toBe('NSE');
      expect(calendarService.getExchange('GROWW')).toBe('NSE');
      expect(calendarService.getExchange('NVDA')).toBe('NASDAQ');
      expect(calendarService.getExchange('AAPL')).toBe('NASDAQ');
    });

    it('correctly reports market state during active NSE hours', () => {
      // Create a Wednesday at 10:30 IST (05:00 UTC)
      const openTime = new Date('2026-09-23T05:00:00Z');
      const session = calendarService.getMarketSession('RELIANCE', openTime);
      expect(session.isOpen).toBe(true);
      expect(session.sessionState).toBe('REGULAR');
    });

    it('correctly reports market closed outside trading hours', () => {
      // Create a Sunday at 12:00 UTC
      const weekendTime = new Date('2026-09-20T12:00:00Z');
      const session = calendarService.getMarketSession('RELIANCE', weekendTime);
      expect(session.isOpen).toBe(false);
      expect(session.sessionState).toBe('CLOSED');
      expect(session.minutesToOpen).toBeGreaterThan(0);
    });
  });

  describe('GapDetector', () => {
    beforeEach(() => {
      gapDetector.resetDailyCache();
    });

    it('detects a bullish gap up exceeding threshold', () => {
      const tick: Tick = {
        timestamp: new Date('2026-09-23T09:15:00Z'),
        symbol: 'TCS',
        ltp: 2250,
        volume: 50000,
        open: 2250,
        close: 2200, // +2.27% gap
      };

      const signal = gapDetector.detectGap(tick, 'live');
      expect(signal).not.toBeNull();
      expect(signal?.signalType).toBe(SignalType.GAP_DETECTION);
      expect(signal?.metadata?.direction).toBe('GAP_UP');
      expect(signal?.metadata?.gapPercent).toBeCloseTo(2.27, 1);
    });

    it('suppresses repeat gap signals for the same symbol on the same day', () => {
      const tick: Tick = {
        timestamp: new Date('2026-09-23T09:15:00Z'),
        symbol: 'INFY',
        ltp: 1050,
        volume: 50000,
        open: 1050,
        close: 1000, // +5.0% gap
      };

      const first = gapDetector.detectGap(tick, 'live');
      expect(first).not.toBeNull();

      const second = gapDetector.detectGap(tick, 'live');
      expect(second).toBeNull();
    });

    it('ignores small gaps below threshold', () => {
      const tick: Tick = {
        timestamp: new Date('2026-09-23T09:15:00Z'),
        symbol: 'HDFCBANK',
        ltp: 702,
        volume: 50000,
        open: 702,
        close: 700, // +0.28% gap (< 1.2%)
      };

      const signal = gapDetector.detectGap(tick, 'live');
      expect(signal).toBeNull();
    });
  });

  describe('AlertEngine with Composite Market Conditions', () => {
    it('triggers price alert when threshold is hit and market condition is satisfied', async () => {
      alertEngine.updateIndexState('SPX', 5850, 0.45); // SPX is green (+0.45%)

      const alert = await alertRepository.create(
        'test-user',
        'NVDA',
        'ABOVE',
        150.0,
        { index: 'SPX', condition: 'GREEN' }
      );

      await alertEngine.refreshActiveAlerts();

      // Tick at $152 (> $150)
      const tick: Tick = {
        timestamp: new Date(),
        symbol: 'NVDA',
        ltp: 152.0,
        volume: 100000,
        open: 148.0,
        close: 148.0,
      };

      const triggered = await alertEngine.evaluateTick(tick);
      expect(triggered.length).toBe(1);
      expect(triggered[0].symbol).toBe('NVDA');
      expect(triggered[0].triggerPrice).toBe(152.0);
    });

    it('suppresses alert when composite market condition is NOT satisfied', async () => {
      alertEngine.updateIndexState('SPX', 5700, -0.65); // SPX is RED (-0.65%)

      const alert = await alertRepository.create(
        'test-user-2',
        'AAPL',
        'ABOVE',
        220.0,
        { index: 'SPX', condition: 'GREEN' }
      );

      await alertEngine.refreshActiveAlerts();

      // Price hit, but SPX is red
      const tick: Tick = {
        timestamp: new Date(),
        symbol: 'AAPL',
        ltp: 225.0,
        volume: 100000,
        open: 215.0,
        close: 215.0,
      };

      const triggered = await alertEngine.evaluateTick(tick);
      expect(triggered.length).toBe(0);
    });
  });

  describe('ReplayBacktester', () => {
    it('runs offline replay and produces hit-rate reports', async () => {
      const reports = await replayBacktester.runBacktest({
        symbols: ['GROWW', 'RELIANCE'],
        forwardWindowMinutes: 15,
        targetReturnThreshold: 0.1,
      });

      expect(Array.isArray(reports)).toBe(true);
      reports.forEach((rep) => {
        expect(rep.detectorId).toBeDefined();
        expect(typeof rep.hitRate).toBe('number');
        expect(['PROMOTE_TO_LIVE', 'NEEDS_TUNING', 'REJECT']).toContain(rep.recommendation);
      });
    });
  });
});
