import { describe, it, expect } from 'vitest';
import { calculateVolumeAnomaly } from '../src/signal/volume';
import { calculateSectorDivergence } from '../src/signal/divergence';
import { calculateOptionsFlow } from '../src/signal/optionsFlow';
import { calculateMarketStructure } from '../src/signal/marketStructure';
import { Tick, SignalType } from '../src/domain/types';

describe('Signal Engine Modules Verification', () => {
  describe('Volume Anomaly Detection', () => {
    it('triggers volume anomaly signal when volume exceeds 1.5x 20d average', () => {
      const tick: Tick = {
        timestamp: new Date(),
        symbol: 'RELIANCE',
        ltp: 1280,
        volume: 25000000, // 25M shares
      };
      const avgVolume20d = 10000000; // 10M shares (2.5x ratio)

      const signal = calculateVolumeAnomaly(tick, avgVolume20d);

      expect(signal).not.toBeNull();
      expect(signal?.signalType).toBe(SignalType.VOLUME_ANOMALY);
      expect(signal?.metadata?.volumeRatio).toBe(2.5);
      expect(signal?.description).toContain('2.5x 20-day average volume');
    });

    it('rejects volume anomaly when volume is normal (< 1.5x)', () => {
      const tick: Tick = {
        timestamp: new Date(),
        symbol: 'RELIANCE',
        ltp: 1280,
        volume: 11000000,
      };
      const avgVolume20d = 10000000; // 1.1x ratio

      const signal = calculateVolumeAnomaly(tick, avgVolume20d);
      expect(signal).toBeNull();
    });
  });

  describe('Sector Divergence Detection', () => {
    it('triggers sector divergence when stock decouples from sector benchmark by >= 1.2%', () => {
      const stockTick: Tick = {
        timestamp: new Date(),
        symbol: 'TCS',
        ltp: 3060,
      };
      const stockClose = 3000; // +2.0% stock move
      const sectorChangePercent = 0.3; // +0.3% sector move (divergence = +1.7%)

      const signal = calculateSectorDivergence(stockTick, stockClose, sectorChangePercent);

      expect(signal).not.toBeNull();
      expect(signal?.signalType).toBe(SignalType.SECTOR_DIVERGENCE);
      expect(signal?.metadata?.divergence).toBe(1.7);
      expect(signal?.description).toContain('outperforming');
    });

    it('rejects sector divergence when stock tracks sector closely (< 1.2% divergence)', () => {
      const stockTick: Tick = {
        timestamp: new Date(),
        symbol: 'INFY',
        ltp: 1510,
      };
      const stockClose = 1500; // +0.67% stock move
      const sectorChangePercent = 0.5; // +0.5% sector move (divergence ≈ 0.17%)

      const signal = calculateSectorDivergence(stockTick, stockClose, sectorChangePercent);
      expect(signal).toBeNull();
    });
  });

  describe('Institutional Flow (Formerly Options Flow) Integrity', () => {
    it('executes deterministically with zero Math.random and calculates authentic turnover in ₹ Cr', () => {
      const prevTick: Tick = {
        timestamp: new Date('2026-09-15T10:00:00Z'),
        symbol: 'HDFCBANK',
        ltp: 1600,
        volume: 20000000,
        close: 1600,
      };

      const currTick: Tick = {
        timestamp: new Date('2026-09-15T10:01:00Z'),
        symbol: 'HDFCBANK',
        ltp: 1632, // +2.0% gain
        volume: 30000000, // 30M shares vs 10M avg = 3.0x
        close: 1600,
      };

      const avgVolume20d = 10000000;

      const signal = calculateOptionsFlow(currTick, prevTick, avgVolume20d);

      expect(signal).not.toBeNull();
      expect(signal?.signalType).toBe(SignalType.OPTIONS_FLOW);
      expect(signal?.description).toContain('Institutional Block Accumulation');
      expect(signal?.description).not.toContain('NaN');
      expect(signal?.description).not.toContain('CE');
      expect(signal?.description).not.toContain('PE');

      // Authentic turnover in ₹ Cr: (30,000,000 * 1632) / 10,000,000 = 4896.0 Cr
      expect(signal?.metadata?.estimatedTurnoverCr).toBe(4896.0);
      expect(signal?.metadata?.volumeRatio).toBe(3.0);
      expect(signal?.metadata?.sentiment).toBe('BULLISH');
    });

    it('returns null on quiet session with low volume ratio (< 2.0x)', () => {
      const prevTick: Tick = {
        timestamp: new Date(),
        symbol: 'HDFCBANK',
        ltp: 1600,
        volume: 5000000,
        close: 1600,
      };
      const currTick: Tick = {
        timestamp: new Date(),
        symbol: 'HDFCBANK',
        ltp: 1605,
        volume: 6000000,
        close: 1600,
      };
      const avgVolume20d = 10000000;

      const signal = calculateOptionsFlow(currTick, prevTick, avgVolume20d);
      expect(signal).toBeNull();
    });
  });

  describe('20-EMA Calculation Rigor', () => {
    it('computes 20-EMA accurately using 20-period trajectory', () => {
      const sparkline = [
        100, 101, 102, 103, 104, 105, 106, 107, 108, 109,
        110, 111, 112, 113, 114, 115, 116, 117, 118, 119, 120
      ];

      const structure = calculateMarketStructure('GROWW', 120, 2.0, sparkline);

      // In an upward trending series to 120, 20-EMA should lag behind current price (around 110-115)
      expect(structure.ema20).toBeGreaterThan(105);
      expect(structure.ema20).toBeLessThan(120);
      expect(structure.emaState).toBe('ABOVE_EMA');
    });

    it('prevents degenerate fallback (ema20 === ltp and rsi === 50.0) when sparkline is sparse but day range exists', () => {
      // Sparse sparkline of only 2 ticks (common on static or newly tracked symbols)
      const sparseSparkline = [200.0, 200.0];
      const structure = calculateMarketStructure(
        'GROWW',
        200.0,
        2.12, // +2.12% move from base close
        sparseSparkline,
        204.0, // high
        194.0  // low
      );

      // Must NOT be trivially equal to ltp or 50.0
      expect(structure.ema20).not.toBe(200.0);
      expect(structure.ema20).toBeCloseTo(197.96, 0);
      expect(structure.rsi).not.toBe(50.0);
      expect(structure.rsi).toBeGreaterThan(50.0); // +2.12% session gain should show momentum > 50
    });

    it('guarantees positive stocks are NEVER classified as BEARISH or Dead Cat Bounce', () => {
      // Stock is up +0.8%, but currently trading slightly below a descending 20-EMA
      const sparkline = [105, 104, 103, 102, 101.5, 101, 100.8];
      const structure = calculateMarketStructure(
        'INFY',
        100.8,
        0.80, // +0.80% positive day gain
        sparkline,
        105.0, // high
        99.5   // low
      );

      // Must NEVER be BEARISH when day change is positive
      expect(structure.sentiment).not.toBe('BEARISH');
      expect(['BULLISH', 'NEUTRAL']).toContain(structure.sentiment);
      expect(structure.isDeadCatBounce).toBe(false);
    });
  });

  describe('Static Market Signal Deduplication', () => {
    it('suppresses identical signal re-fire when price and condition have not moved', async () => {
      const { SignalEngine } = await import('../src/signal/engine');
      const engine = new SignalEngine();

      const tick1: Tick = {
        timestamp: new Date('2026-09-15T10:00:00Z'),
        symbol: 'NVDA',
        ltp: 120.0,
        high: 121.0,
        low: 119.0,
        volume: 50000000,
        close: 120.0, // Quiet initial tick to establish baseline
      };

      const tick2: Tick = {
        timestamp: new Date('2026-09-15T10:01:00Z'),
        symbol: 'NVDA',
        ltp: 120.0,
        high: 121.0,
        low: 119.0,
        volume: 50100000,
        close: 130.0, // -7.7% drop vs base close -> volatility spike
      };

      // Seed previous tick so delta is calculated
      await engine.processTick(tick1);

      // First trigger: price is 120.0, drop vs close triggers volatility spike
      const signalsFirst = await engine.processTick(tick2);
      expect(signalsFirst.length).toBe(1);
      expect(signalsFirst[0].symbol).toBe('NVDA');

      // Now simulate arrival 5 minutes later (past the 3-minute symbol cooldown)
      // but price and market condition are completely UNCHANGED (market is static/closed)
      const staticTick: Tick = {
        timestamp: new Date('2026-09-15T10:06:00Z'),
        symbol: 'NVDA',
        ltp: 120.0, // Exact same price
        high: 121.0,
        low: 119.0,
        volume: 50100000,
        close: 130.0,
      };

      const signalsSecond = await engine.processTick(staticTick);
      // Deduplication MUST suppress this static market spam
      expect(signalsSecond.length).toBe(0);

      // Now simulate a genuine price shift of -4.1% (to 115.0) 5 minutes later
      const shiftedTick: Tick = {
        timestamp: new Date('2026-09-15T10:11:00Z'),
        symbol: 'NVDA',
        ltp: 115.0,
        high: 121.0,
        low: 114.0,
        volume: 55000000,
        close: 130.0,
      };

      // When price genuinely moves, it is not blocked by the static dedupe rule
      const signalsThird = await engine.processTick(shiftedTick);
      expect(signalsThird.length).toBe(1);
      expect(signalsThird[0].symbol).toBe('NVDA');
    });
  });

  describe('News Sentiment Analysis Rigor', () => {
    it('correctly tags bearish headlines instead of falsely marking them Bullish', async () => {
      const { inferNewsTag } = await import('../src/services/newsService');

      expect(inferNewsTag('Reliance sinks to 52-week low amid broad market selloff')).toBe('Bearish');
      expect(inferNewsTag('Infosys plunges 4% as revenue guidance slashed')).toBe('Bearish');
      expect(inferNewsTag('Tata Motors tumbles on weak European sales data')).toBe('Bearish');
      expect(inferNewsTag('HDFC Bank shares drop 3% on margin compression')).toBe('Bearish');
    });

    it('correctly tags bullish headlines, regulatory notices, and corporate earnings', async () => {
      const { inferNewsTag } = await import('../src/services/newsService');

      expect(inferNewsTag('Tata Motors surges to record high on EV expansion')).toBe('Bullish');
      expect(inferNewsTag('Wipro rallies 5% on upbeat revenue pipeline')).toBe('Bullish');
      expect(inferNewsTag('ICICI Bank reports Q4 net profit jump of 18%')).toBe('Earnings');
      expect(inferNewsTag('L&T bags order win worth Rs 5,000 crore')).toBe('Deal');
      expect(inferNewsTag('HDFC Bank faces RBI regulatory scrutiny')).toBe('Regulatory');
    });
  });
});

