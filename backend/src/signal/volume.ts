import { Tick, Signal, SignalType } from '../domain/types';
import { v4 as uuidv4 } from 'uuid';

export function calculateVolumeAnomaly(
  tick: Tick,
  avgVolume20dParam?: number
): Signal | null {
  const currentVolume = tick.volume || 0;
  // If avgVolume20d not supplied, estimate a standard baseline
  const avgVolume20d = avgVolume20dParam && avgVolume20dParam > 0 ? avgVolume20dParam : 1000000;

  if (avgVolume20d <= 0 || currentVolume <= 0) return null;

  const volumeRatio = Number((currentVolume / avgVolume20d).toFixed(2));

  // Volume anomaly threshold: current volume exceeds 1.5x of 20-day average
  if (volumeRatio >= 1.5) {
    const severity = Math.min(100, Math.max(50, Math.round(volumeRatio * 35)));

    return {
      id: `sig-${uuidv4().slice(0, 8)}`,
      symbol: tick.symbol,
      signalType: SignalType.VOLUME_ANOMALY,
      severity,
      description: `${tick.symbol} volume anomaly: ${volumeRatio}x 20-day average volume (${currentVolume.toLocaleString()} shares)`,
      metadata: {
        currentVolume,
        avgVolume20d,
        volumeRatio,
      },
      triggeredAt: tick.timestamp,
    };
  }

  return null;
}
