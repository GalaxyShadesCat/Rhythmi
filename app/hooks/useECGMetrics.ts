import { useState, useEffect, useCallback } from "react";
import { ECGDataPoint, ECGMetrics, HRDataPoint } from "@/app/types/types";

// Shared constants
const MIN_RR_INTERVALS = 5;
const HRV_WINDOW_SIZE = 8;
const MIN_HR_BPM = 40;
const MAX_HR_BPM = 220;

// Utility: Mean
const mean = (arr: number[]) =>
  arr.length === 0 ? 0 : arr.reduce((sum, v) => sum + v, 0) / arr.length;

export default function useECGMetrics(
  ecgData: ECGDataPoint[],
  hrData: HRDataPoint[]
) {
  const [metrics, setMetrics] = useState<ECGMetrics>({
    avgHeartRate: 0,
    medianHeartRate: 0,
    minHeartRate: 0,
    maxHeartRate: 0,
    heartRateVariability: 0,
    rrIntervals: [],
    rPeaks: [],
    totalBeats: 0,
    duration: 0,
  });

  // R-peak detection
  const findPeaks = useCallback(
    (data: ECGDataPoint[], minPeriod: number = 250): number[] => {
      if (data.length < 3) return [];

      // Calculate mean and std deviation for thresholding
      const values = data.map((d) => d.value);
      const mean = values.reduce((a, b) => a + b, 0) / values.length;
      const std = Math.sqrt(
        values.map((v) => (v - mean) ** 2).reduce((a, b) => a + b, 0) /
          values.length
      );

      // Set a threshold
      const threshold = mean + 0.8 * std;

      const rPeakTimestamps: number[] = [];
      let lastPeakTimestamp = -Infinity;

      for (let i = 1; i < data.length - 1; i++) {
        // Local maxima and above threshold and minPeriod since last peak
        if (
          data[i].value > data[i - 1].value &&
          data[i].value > data[i + 1].value &&
          data[i].value > threshold &&
          data[i].timestamp - lastPeakTimestamp >= minPeriod
        ) {
          rPeakTimestamps.push(data[i].timestamp);
          lastPeakTimestamp = data[i].timestamp;
        }
      }

      return rPeakTimestamps;
    },
    []
  );

  const filterArtifacts = (rr: number[]) => {
    if (rr.length < 3) return rr;
    const filtered = [];
    for (let i = 1; i < rr.length - 1; i++) {
      const prev = rr[i - 1],
        curr = rr[i],
        next = rr[i + 1];
      const isArtifact =
        Math.abs(curr - prev) > 0.2 * prev &&
        Math.abs(curr - next) > 0.2 * next;
      if (!isArtifact) filtered.push(curr);
      // Optionally: else filtered.push(mean([prev, next])); // Impute
    }
    return filtered;
  };

  // RR intervals (ms)
  const getRRIntervals = useCallback((rPeaks: number[]): number[] => {
    const rr: number[] = [];
    for (let i = 1; i < rPeaks.length; i++) {
      const interval = rPeaks[i] - rPeaks[i - 1];
      const minInterval = (60 / MAX_HR_BPM) * 1000;
      const maxInterval = (60 / MIN_HR_BPM) * 1000;
      if (interval >= minInterval && interval <= maxInterval) {
        rr.push(interval);
      }
    }
    return rr;
  }, []);

  // Heart rate series (bpm)
  const getHRFromRR = useCallback((rrIntervals: number[]): number[] => {
    return rrIntervals.map((interval) => 60000 / interval);
  }, []);

  // HRV - RMSSD
  const getRMSSD = useCallback((rrIntervals: number[]): number => {
    const filtered = filterArtifacts(rrIntervals);
    if (filtered.length < MIN_RR_INTERVALS) return 0;
    const recent = filtered.slice(-HRV_WINDOW_SIZE);
    const successiveDiffs: number[] = [];
    for (let i = 1; i < recent.length; i++) {
      successiveDiffs.push(Math.abs(recent[i] - recent[i - 1]));
    }
    if (successiveDiffs.length === 0) return 0;
    const squaredDiffs = successiveDiffs.map((diff) => diff * diff);
    const meanSquaredDiff = mean(squaredDiffs);
    return Math.sqrt(meanSquaredDiff);
  }, []);

  useEffect(() => {
    if (!ecgData || ecgData.length < 50) {
      setMetrics((prev) => ({
        ...prev,
        avgHeartRate: 0,
        medianHeartRate: 0,
        minHeartRate: 0,
        maxHeartRate: 0,
        heartRateVariability: 0,
        rrIntervals: [],
        rPeaks: [],
        totalBeats: 0,
        duration: 0,
      }));
      return;
    }

    const rPeaks = findPeaks(ecgData);
    const rrIntervals = getRRIntervals(rPeaks);

    // Extract only the heart rate values
    const hrSeries = hrData.map((dp) => dp.value);

    // Utility function for mean (average)
    const mean = (arr: number[]) =>
      arr.reduce((a, b) => a + b, 0) / (arr.length || 1);

    // Calculate statistics
    const avgHR = Math.round(mean(hrSeries));
    const minHR = Math.round(Math.min(...hrSeries));
    const maxHR = Math.round(Math.max(...hrSeries));
    const median = (arr: number[]) => {
      if (!arr.length) return 0;
      const sorted = [...arr].sort((a, b) => a - b);
      const mid = Math.floor(sorted.length / 2);
      return sorted.length % 2
        ? sorted[mid]
        : (sorted[mid - 1] + sorted[mid]) / 2;
    };
    const medHR = Math.round(median(hrSeries));

    const hrv = Math.round(getRMSSD(rrIntervals));
    const sessionStart = hrData[0]?.timestamp;
    const sessionEnd = hrData[hrData.length - 1]?.timestamp;
    const durationMin = (sessionEnd - sessionStart) / 60000; // ms to minutes
    const totalBeats = Math.round(avgHR * durationMin);
    const duration = sessionEnd - sessionStart;

    setMetrics({
      avgHeartRate: avgHR,
      medianHeartRate: medHR,
      minHeartRate: minHR,
      maxHeartRate: maxHR,
      heartRateVariability: hrv,
      rrIntervals,
      rPeaks,
      totalBeats,
      duration,
    });
  }, [ecgData, hrData, findPeaks, getRRIntervals, getHRFromRR, getRMSSD]);

  return metrics;
}
