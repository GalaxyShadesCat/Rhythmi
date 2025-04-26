import { useState, useEffect, useCallback } from "react";
import { ECGDataPoint, ECGMetrics } from "@/app/types/types";
import { ECG_DEFAULT_SAMPLE_RATE } from "@/utils/constants";

// Shared constants
const MIN_RR_INTERVALS = 5;
const HRV_WINDOW_SIZE = 8;
const MIN_HR_BPM = 40;
const MAX_HR_BPM = 220;

// Utility: Median
const median = (arr: number[]) =>
  arr.length === 0
    ? 0
    : arr.slice().sort((a, b) => a - b)[Math.floor(arr.length / 2)];

// Utility: Mean
const mean = (arr: number[]) =>
  arr.length === 0 ? 0 : arr.reduce((sum, v) => sum + v, 0) / arr.length;

export function useECGMetrics(ecgData: ECGDataPoint[]) {
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
  const findPeaks = useCallback((data: ECGDataPoint[]): number[] => {
    if (data.length < 10) return [];
    const values = data.map((point) => point.value);

    const meanVal = mean(values);
    const stdDev = Math.sqrt(
      values.reduce((sum, val) => sum + Math.pow(val - meanVal, 2), 0) /
        values.length
    );

    const sorted = [...values].sort((a, b) => a - b);
    const q1 = sorted[Math.floor(sorted.length * 0.25)];
    const q3 = sorted[Math.floor(sorted.length * 0.75)];
    const iqr = q3 - q1;
    const snr = iqr / stdDev;
    const thresholdFactor = snr < 1.5 ? 2.5 : snr < 2.5 ? 2.0 : 1.5;
    const adaptiveThreshold = meanVal + thresholdFactor * stdDev;

    const peaks: number[] = [];
    const minRefractoryPeriod = Math.round(0.25 * ECG_DEFAULT_SAMPLE_RATE);
    let lastPeakIndex = -minRefractoryPeriod;

    const potentialPeaks: {
      index: number;
      value: number;
      timestamp: number;
    }[] = [];
    for (let i = 2; i < data.length - 2; i++) {
      const isPeak =
        data[i].value > data[i - 2].value &&
        data[i].value > data[i - 1].value &&
        data[i].value >= data[i + 1].value &&
        data[i].value >= data[i + 2].value;
      const isAboveThreshold = data[i].value > adaptiveThreshold;
      if (isPeak && isAboveThreshold) {
        potentialPeaks.push({
          index: i,
          value: data[i].value,
          timestamp: data[i].timestamp,
        });
      }
    }

    if (potentialPeaks.length > 0) {
      potentialPeaks.sort((a, b) => a.index - b.index);
      peaks.push(potentialPeaks[0].timestamp);
      lastPeakIndex = potentialPeaks[0].index;
      for (let i = 1; i < potentialPeaks.length; i++) {
        const currentPeak = potentialPeaks[i];
        if (currentPeak.index - lastPeakIndex >= minRefractoryPeriod) {
          peaks.push(currentPeak.timestamp);
          lastPeakIndex = currentPeak.index;
        } else if (currentPeak.value > potentialPeaks[i - 1].value) {
          peaks.pop();
          peaks.push(currentPeak.timestamp);
          lastPeakIndex = currentPeak.index;
        }
      }
    }
    return peaks;
  }, []);

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
    if (rrIntervals.length < MIN_RR_INTERVALS) return 0;
    const recent = rrIntervals.slice(-HRV_WINDOW_SIZE);
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
    const hrSeries = getHRFromRR(rrIntervals);

    const avgHR = Math.round(mean(hrSeries));
    const medHR = Math.round(median(hrSeries));
    const minHR = Math.round(Math.min(...hrSeries, 0));
    const maxHR = Math.round(Math.max(...hrSeries, 0));
    const hrv = Math.round(getRMSSD(rrIntervals));
    const totalBeats = rPeaks.length;
    const duration =
      ecgData.length > 0
        ? ecgData[ecgData.length - 1].timestamp - ecgData[0].timestamp
        : 0;

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
  }, [ecgData, findPeaks, getRRIntervals, getHRFromRR, getRMSSD]);

  return metrics;
}

export default useECGMetrics;
