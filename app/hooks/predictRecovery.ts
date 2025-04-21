import { ECGDataPoint } from "@/hooks/useHeartRateSensor";
import { BaseMetrics } from "@/hooks/calculateBaseMetrics";

interface RecoveryPeriod {
  start: number; // timestamp in ms
  end: number; // timestamp in ms
}

interface PredictionOptions {
  windowSize?: number; // analysis window in ms (default: 30000 = 30s)
  stepSize?: number; // step between windows in ms (default: 10000 = 10s)
  similarityThreshold?: number; // % difference allowed (default: 0.1 = 10%)
}

export default function predictRecovery(
  ecgData: ECGDataPoint[],
  baseMetrics: BaseMetrics,
  options?: PredictionOptions
): RecoveryPeriod[] {
  const {
    windowSize = 30000,
    stepSize = 10000,
    similarityThreshold = 0.1,
  } = options || {};

  const recoveryPeriods: RecoveryPeriod[] = [];
  let currentPeriod: RecoveryPeriod | null = null;
  let currentWindowStart = ecgData[0]?.timestamp || 0;

  while (
    currentWindowStart + windowSize <=
    ecgData[ecgData.length - 1].timestamp
  ) {
    const windowEnd = currentWindowStart + windowSize;
    const windowData = ecgData.filter(
      (point) =>
        point.timestamp >= currentWindowStart && point.timestamp < windowEnd
    );

    if (windowData.length > 0) {
      const windowMetrics = calculateWindowMetrics(windowData);
      const isSimilar = compareMetrics(
        windowMetrics,
        baseMetrics,
        similarityThreshold
      );

      if (isSimilar) {
        if (!currentPeriod) {
          // Start new recovery period
          currentPeriod = { start: currentWindowStart, end: windowEnd };
        } else {
          // Extend existing period
          currentPeriod.end = windowEnd;
        }
      } else if (currentPeriod) {
        // Save completed period and reset
        recoveryPeriods.push(currentPeriod);
        currentPeriod = null;
      }
    }

    currentWindowStart += stepSize;
  }

  // Add the last period if it exists
  if (currentPeriod) {
    recoveryPeriods.push(currentPeriod);
  }

  return recoveryPeriods;
}

function calculateWindowMetrics(windowData: ECGDataPoint[]): {
  mean: number;
  variance: number;
} {
  const values = windowData.map((point) => point.value);
  const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
  const variance =
    values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) /
    values.length;
  return { mean, variance };
}

function compareMetrics(
  current: { mean: number; variance: number },
  baseline: BaseMetrics,
  threshold: number
): boolean {
  const meanDiff = Math.abs(current.mean - baseline.mean) / baseline.mean;
  const varianceDiff =
    Math.abs(current.variance - baseline.variance) / baseline.variance;

  return meanDiff <= threshold && varianceDiff <= threshold;
}

export type { RecoveryPeriod };
