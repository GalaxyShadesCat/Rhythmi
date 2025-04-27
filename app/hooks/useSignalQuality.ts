import { ECGDataPoint } from "@/types/types";

export type QualityRating = "excellent" | "good" | "fair" | "poor";

export default function useSignalQuality() {
  const calculateSignalQuality = (data: ECGDataPoint[]): QualityRating => {
    if (data.length === 0) return "poor";

    const values = data.map(point => point.value);

    // Calculate standard deviation
    const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
    const squaredDiffs = values.map(val => Math.pow(val - mean, 2));
    const variance = squaredDiffs.reduce((sum, val) => sum + val, 0) / values.length;
    const standardDeviation = Math.sqrt(variance);

    if (standardDeviation < 0.1) return "excellent";
    if (standardDeviation < 0.2) return "good";
    if (standardDeviation < 0.5) return "fair";
    return "poor";
  };

  return {
    calculateSignalQuality
  };
}
