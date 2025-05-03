import { useState, useEffect, useCallback } from "react";
import { ECGDataPoint, ECGMetrics, HRDataPoint } from "@/app/types/types";

// Constants for ECG analysis
const MIN_RR_INTERVALS = 5;      // Minimum number of RR intervals needed for valid analysis
const HRV_WINDOW_SIZE = 8;       // Number of recent RR intervals to use for HRV calculation
const MIN_HR_BPM = 40;           // Minimum physiologically possible heart rate
const MAX_HR_BPM = 220;          // Maximum physiologically possible heart rate

// Utility: Calculate mean of an array
const mean = (arr: number[]) =>
  arr.length === 0 ? 0 : arr.reduce((sum, v) => sum + v, 0) / arr.length;

/**
 * Hook for calculating ECG metrics including heart rate, HRV, and R-peak detection
 * Takes raw ECG data and heart rate data as input
 */
export default function useECGMetrics(
  ecgData: ECGDataPoint[],
  hrData: HRDataPoint[]
) {
  // State to store calculated metrics
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

  // R-peak detection algorithm using adaptive thresholding
  const findPeaks = useCallback(
    (data: ECGDataPoint[], minPeriod: number = 250): number[] => {
      if (data.length < 3) return [];

      // Calculate adaptive threshold based on signal statistics
      const values = data.map((d) => d.value);
      const mean = values.reduce((a, b) => a + b, 0) / values.length;
      const std = Math.sqrt(
        values.map((v) => (v - mean) ** 2).reduce((a, b) => a + b, 0) /
          values.length
      );

      // Threshold is set to mean + 0.8 * standard deviation
      const threshold = mean + 0.8 * std;

      const rPeakTimestamps: number[] = [];
      let lastPeakTimestamp = -Infinity;

      // Find local maxima that are above threshold and respect minimum period
      for (let i = 1; i < data.length - 1; i++) {
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

  // Filter out RR intervals that are likely artifacts
  const filterArtifacts = (rr: number[]) => {
    if (rr.length < 3) return rr;
    const filtered = [];
    for (let i = 1; i < rr.length - 1; i++) {
      const prev = rr[i - 1],
        curr = rr[i],
        next = rr[i + 1];
      // Mark as artifact if current interval differs by more than 20% from neighbors
      const isArtifact =
        Math.abs(curr - prev) > 0.2 * prev &&
        Math.abs(curr - next) > 0.2 * next;
      if (!isArtifact) filtered.push(curr);
    }
    return filtered;
  };

  // Calculate RR intervals from R-peak timestamps
  const getRRIntervals = useCallback((rPeaks: number[]): number[] => {
    const rr: number[] = [];
    for (let i = 1; i < rPeaks.length; i++) {
      const interval = rPeaks[i] - rPeaks[i - 1];
      // Filter out intervals that would result in impossible heart rates
      const minInterval = (60 / MAX_HR_BPM) * 1000;
      const maxInterval = (60 / MIN_HR_BPM) * 1000;
      if (interval >= minInterval && interval <= maxInterval) {
        rr.push(interval);
      }
    }
    return rr;
  }, []);

  // Convert RR intervals to heart rate in BPM
  const getHRFromRR = useCallback((rrIntervals: number[]): number[] => {
    return rrIntervals.map((interval) => 60000 / interval);
  }, []);

  // Calculate Heart Rate Variability using RMSSD method
  const getRMSSD = useCallback((rrIntervals: number[]): number => {
    const filtered = filterArtifacts(rrIntervals);
    if (filtered.length < MIN_RR_INTERVALS) return 0;
    // Use only the most recent intervals for HRV calculation
    const recent = filtered.slice(-HRV_WINDOW_SIZE);
    const successiveDiffs: number[] = [];
    for (let i = 1; i < recent.length; i++) {
      successiveDiffs.push(Math.abs(recent[i] - recent[i - 1]));
    }
    if (successiveDiffs.length === 0) return 0;
    // Calculate Root Mean Square of Successive Differences
    const squaredDiffs = successiveDiffs.map((diff) => diff * diff);
    const meanSquaredDiff = mean(squaredDiffs);
    return Math.sqrt(meanSquaredDiff);
  }, []);

  // Main effect to calculate all metrics when data changes
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

    // Detect R-peaks and calculate RR intervals
    const rPeaks = findPeaks(ecgData);
    const rrIntervals = getRRIntervals(rPeaks);

    // Extract heart rate values
    const hrSeries = hrData.map((dp) => dp.value);

    // Calculate basic heart rate statistics
    const avgHR = Math.round(mean(hrSeries));
    const minHR = Math.round(Math.min(...hrSeries));
    const maxHR = Math.round(Math.max(...hrSeries));
    
    // Calculate median heart rate
    const median = (arr: number[]) => {
      if (!arr.length) return 0;
      const sorted = [...arr].sort((a, b) => a - b);
      const mid = Math.floor(sorted.length / 2);
      return sorted.length % 2
        ? sorted[mid]
        : (sorted[mid - 1] + sorted[mid]) / 2;
    };
    const medHR = Math.round(median(hrSeries));

    // Calculate session duration and total beats
    const hrv = Math.round(getRMSSD(rrIntervals));
    const sessionStart = hrData[0]?.timestamp;
    const sessionEnd = hrData[hrData.length - 1]?.timestamp;
    const durationMin = (sessionEnd - sessionStart) / 60000; // ms to minutes
    const totalBeats = Math.round(avgHR * durationMin);
    const duration = sessionEnd - sessionStart;

    // Update metrics state
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
