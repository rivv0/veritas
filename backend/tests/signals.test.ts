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
  });
});
