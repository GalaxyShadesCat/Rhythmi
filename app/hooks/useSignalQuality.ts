import { ECGDataPoint } from "@/types/types";

export type QualityRating = "excellent" | "good" | "fair" | "poor";

export default function useSignalQuality() {
  const calculateSignalQuality = (data: ECGDataPoint[]): QualityRating => {
    if (data.length === 0) return "poor";

    const sampleRate = 130; // 130Hz
    const fiveSecondsOfData = sampleRate * 5;

    // Get only the most recent 5 seconds of data
    const recentData =
      data.length > fiveSecondsOfData ? data.slice(-fiveSecondsOfData) : data;

    const values = recentData.map((point) => point.value);

    // Calculate standard deviation
    const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
    const squaredDiffs = values.map((val) => Math.pow(val - mean, 2));
    const variance =
      squaredDiffs.reduce((sum, val) => sum + val, 0) / values.length;
    const standardDeviation = Math.sqrt(variance);

    if (standardDeviation < 300) return "excellent";
    if (standardDeviation < 400) return "good";
    if (standardDeviation < 500) return "fair";
    return "poor";
  };

  return {
    calculateSignalQuality,
  };
}
