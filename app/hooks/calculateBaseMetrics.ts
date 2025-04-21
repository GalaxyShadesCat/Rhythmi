import { ECGDataPoint } from "@/hooks/useHeartRateSensor";

export interface BaseMetrics {
  mean: number;
  variance: number;
  standardDeviation: number;
  min: number;
  max: number;
  range: number;
}

export default function calculateBaseMetrics(
  calibrationData: ECGDataPoint[]
): BaseMetrics {
  if (!calibrationData || calibrationData.length === 0) {
    throw new Error("Calibration data is empty or undefined");
  }

  // Extract values from ECGDataPoint array
  const values = calibrationData.map((point) => point.value);

  // Calculate basic metrics
  const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
  const squaredDiffs = values.map((val) => Math.pow(val - mean, 2));
  const variance =
    squaredDiffs.reduce((sum, val) => sum + val, 0) / values.length;
  const standardDeviation = Math.sqrt(variance);

  // Calculate min/max/range
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min;

  return {
    mean,
    variance,
    standardDeviation,
    min,
    max,
    range,
  };
}
