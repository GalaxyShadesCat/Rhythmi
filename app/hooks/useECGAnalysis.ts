import { useState, useEffect, useCallback } from "react";
import { ECGDataPoint } from "@/hooks/useHeartRateSensor";

// Define our own interface here to avoid circular dependencies
export interface ECGMetrics {
  heartRate: number;
  heartRateVariability: number;
  rPeaks: number[];

  // Heart Rate Recovery tracking
  baselineTime: number | null;
  baselineHeartRate: number;
  exerciseStartTime: number | null;
  peakHeartRate: number;
  peakHeartRateTime: number | null;
  recoveryStartTime: number | null;
  recoveryTime: number | null; // Time taken to return to baseline
  recoveryStatus: "not-started" | "in-progress" | "completed";
}

// Heart rate history point interface
export interface HRHistoryPoint {
  time: number;
  value: number;
}

// Constants for analysis
const SAMPLING_RATE = 130; // 130 Hz
const MIN_RR_INTERVALS = 5; // Minimum number of RR intervals for valid HRV calculation
const HRV_WINDOW_SIZE = 8; // Number of R-R intervals to use for HRV calculation
const HR_RISE_THRESHOLD = 10; // % increase in HR to detect exercise start
const HR_RECOVERY_THRESHOLD = 5; // % decrease in HR to detect recovery
const HR_BASELINE_THRESHOLD = 2; // % difference from baseline to consider recovered

// Minimum and maximum physiologically plausible heart rates
const MIN_HR_BPM = 40; // 40 BPM
const MAX_HR_BPM = 220; // 220 BPM

export function useECGAnalysis(ecgData: ECGDataPoint[]) {
  const [metrics, setMetrics] = useState<ECGMetrics>({
    heartRate: 0,
    heartRateVariability: 0,
    rPeaks: [],

    // Heart Rate Recovery tracking
    baselineTime: null,
    baselineHeartRate: 0,
    exerciseStartTime: null,
    peakHeartRate: 0,
    peakHeartRateTime: null,
    recoveryStartTime: null,
    recoveryTime: null,
    recoveryStatus: "not-started",
  });

  // Track heart rate history for analysis and visualization
  const [hrHistory, setHrHistory] = useState<HRHistoryPoint[]>([]);

  // Enhanced peak detection with adaptive thresholding and signal pre-processing
  const findPeaks = useCallback((data: ECGDataPoint[]): number[] => {
    if (data.length < 10) return []; // Need minimum data for meaningful analysis

    // Step 1: Extract values and apply basic noise filtering
    const values = data.map((point) => point.value);

    // Step 2: Compute adaptive threshold based on signal statistics
    // First, compute the mean and standard deviation
    const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
    const stdDev = Math.sqrt(
      values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) /
        values.length
    );

    // Calculate signal-to-noise ratio statistics
    const sorted = [...values].sort((a, b) => a - b);
    const q1 = sorted[Math.floor(sorted.length * 0.25)]; // 25th percentile
    const q3 = sorted[Math.floor(sorted.length * 0.75)]; // 75th percentile
    const iqr = q3 - q1; // Interquartile range

    // Use a dynamic threshold that adapts to signal quality
    // For more noisy signals (higher stdDev/IQR), use a higher threshold
    const snr = iqr / stdDev; // Use IQR instead of (q3-q1)
    const thresholdFactor = snr < 1.5 ? 2.5 : snr < 2.5 ? 2.0 : 1.5;
    const adaptiveThreshold = mean + thresholdFactor * stdDev;

    console.log(
      `Signal stats - Mean: ${mean.toFixed(2)}, StdDev: ${stdDev.toFixed(
        2
      )}, SNR: ${snr.toFixed(2)}`
    );
    console.log(
      `Using threshold factor: ${thresholdFactor}, Threshold: ${adaptiveThreshold.toFixed(
        2
      )}`
    );

    // Step 3: Find peaks with proper refractory period
    const peaks: number[] = [];
    // Define minimum refractory period (250ms) to avoid detecting physiologically impossible R-peaks
    const minRefractoryPeriod = Math.round(0.25 * SAMPLING_RATE);
    let lastPeakIndex = -minRefractoryPeriod;

    // First pass: find all potential peaks
    const potentialPeaks: {
      index: number;
      value: number;
      timestamp: number;
    }[] = [];
    for (let i = 2; i < data.length - 2; i++) {
      // Looking at a 5-point window to find local maxima
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

    // Second pass: apply refractory period and select the highest peak in each segment
    if (potentialPeaks.length > 0) {
      potentialPeaks.sort((a, b) => a.index - b.index); // Sort by index

      // Start with the first peak
      peaks.push(potentialPeaks[0].timestamp);
      lastPeakIndex = potentialPeaks[0].index;

      // Process remaining peaks
      for (let i = 1; i < potentialPeaks.length; i++) {
        const currentPeak = potentialPeaks[i];

        // Check if this peak is outside the refractory period
        if (currentPeak.index - lastPeakIndex >= minRefractoryPeriod) {
          peaks.push(currentPeak.timestamp);
          lastPeakIndex = currentPeak.index;
        }
        // If inside refractory period but higher amplitude, replace the previous peak
        else if (currentPeak.value > potentialPeaks[i - 1].value) {
          // Remove the last peak
          peaks.pop();
          // Add this higher peak
          peaks.push(currentPeak.timestamp);
          lastPeakIndex = currentPeak.index;
        }
      }
    }

    console.log(`Found ${peaks.length} R-peaks in ECG data`);
    return peaks;
  }, []);

  // Calculate heart rate from R-R intervals
  const calculateHeartRate = useCallback((rPeaks: number[]): number => {
    if (rPeaks.length < 2) return 0;

    // Calculate R-R intervals in seconds
    const rrIntervals: number[] = [];
    for (let i = 1; i < rPeaks.length; i++) {
      const rrInterval = (rPeaks[i] - rPeaks[i - 1]) / 1000; // Convert to seconds

      // Physiological validation: skip intervals that would give impossible heart rates
      const bpm = 60 / rrInterval;
      if (bpm >= MIN_HR_BPM && bpm <= MAX_HR_BPM) {
        rrIntervals.push(rrInterval);
      }
    }

    if (rrIntervals.length < 1) return 0;

    // Use median for robustness against outliers
    rrIntervals.sort((a, b) => a - b);
    const medianRR = rrIntervals[Math.floor(rrIntervals.length / 2)];
    const heartRate = Math.round(60 / medianRR);

    console.log(
      `Calculated heart rate: ${heartRate} BPM from ${rrIntervals.length} valid RR intervals`
    );
    return heartRate;
  }, []);

  // Calculate heart rate variability (RMSSD method)
  const calculateHRV = useCallback((rPeaks: number[]): number => {
    if (rPeaks.length < MIN_RR_INTERVALS) return 0;

    // Calculate R-R intervals in milliseconds
    const rrIntervals: number[] = [];
    for (let i = 1; i < rPeaks.length; i++) {
      const interval = rPeaks[i] - rPeaks[i - 1];

      // Validate interval physiologically (40-220 BPM range in milliseconds)
      const minInterval = (60 / MAX_HR_BPM) * 1000; // Minimum RR interval (ms)
      const maxInterval = (60 / MIN_HR_BPM) * 1000; // Maximum RR interval (ms)

      if (interval >= minInterval && interval <= maxInterval) {
        rrIntervals.push(interval);
      }
    }

    // Use at most HRV_WINDOW_SIZE intervals for calculation
    const recentIntervals = rrIntervals.slice(-HRV_WINDOW_SIZE);

    // Calculate successive differences
    const successiveDiffs: number[] = [];
    for (let i = 1; i < recentIntervals.length; i++) {
      successiveDiffs.push(
        Math.abs(recentIntervals[i] - recentIntervals[i - 1])
      );
    }

    // Calculate RMSSD (Root Mean Square of Successive Differences)
    if (successiveDiffs.length === 0) return 0;

    const squaredDiffs = successiveDiffs.map((diff) => diff * diff);
    const meanSquaredDiff =
      squaredDiffs.reduce((sum, diff) => sum + diff, 0) / squaredDiffs.length;
    const rmssd = Math.sqrt(meanSquaredDiff);

    console.log(
      `Calculated HRV (RMSSD): ${rmssd.toFixed(2)} ms from ${
        successiveDiffs.length
      } intervals`
    );
    return rmssd;
  }, []);

  // Track heart rate changes for recovery monitoring
  const trackHeartRateChanges = useCallback(
    (currentHR: number, timestamp: number) => {
      // Store current heart rate in history
      setHrHistory((prev) => {
        const newHistory = [...prev, { time: timestamp, value: currentHR }];
        // Keep only the last 100 measurements
        return newHistory.slice(-100);
      });

      // Update metrics based on current heart rate and history
      setMetrics((prevMetrics) => {
        // Don't process if heart rate is 0 (no valid measurement)
        if (currentHR === 0) return prevMetrics;

        // Current timestamp
        const now = timestamp;

        // Create a copy of previous metrics to update
        const newMetrics = { ...prevMetrics };

        // If baseline is set
        if (
          newMetrics.baselineTime !== null &&
          newMetrics.baselineHeartRate > 0
        ) {
          // 1. Check for exercise start (if not already started)
          if (newMetrics.exerciseStartTime === null) {
            const hrIncrease =
              ((currentHR - newMetrics.baselineHeartRate) /
                newMetrics.baselineHeartRate) *
              100;
            if (hrIncrease >= HR_RISE_THRESHOLD) {
              console.log(
                `Exercise started: HR increased by ${hrIncrease.toFixed(
                  1
                )}% above baseline`
              );
              newMetrics.exerciseStartTime = now;
              newMetrics.recoveryStatus = "not-started";
            }
          }

          // 2. Track peak heart rate (once exercise has started)
          if (newMetrics.exerciseStartTime !== null) {
            if (currentHR > newMetrics.peakHeartRate) {
              newMetrics.peakHeartRate = currentHR;
              newMetrics.peakHeartRateTime = now;
            }

            // 3. Check for recovery start (decrease from peak)
            if (
              newMetrics.recoveryStartTime === null &&
              newMetrics.peakHeartRate > 0 &&
              newMetrics.peakHeartRateTime !== null
            ) {
              // Only check for recovery if we've been over the peak for a bit
              if (now - newMetrics.peakHeartRateTime > 5000) {
                // 5 seconds after peak
                const hrDecrease =
                  ((newMetrics.peakHeartRate - currentHR) /
                    newMetrics.peakHeartRate) *
                  100;
                if (hrDecrease >= HR_RECOVERY_THRESHOLD) {
                  console.log(
                    `Recovery started: HR decreased by ${hrDecrease.toFixed(
                      1
                    )}% from peak`
                  );
                  newMetrics.recoveryStartTime = now;
                  newMetrics.recoveryStatus = "in-progress";
                }
              }
            }

            // 4. Check for recovery completion (return to near baseline)
            if (
              newMetrics.recoveryStartTime !== null &&
              newMetrics.recoveryTime === null
            ) {
              const diffFromBaseline =
                Math.abs(
                  (currentHR - newMetrics.baselineHeartRate) /
                    newMetrics.baselineHeartRate
                ) * 100;
              if (diffFromBaseline <= HR_BASELINE_THRESHOLD) {
                const recoveryTimeMs =
                  now - (newMetrics.recoveryStartTime || now);
                console.log(
                  `Recovery completed in ${(recoveryTimeMs / 1000).toFixed(
                    1
                  )} seconds`
                );
                newMetrics.recoveryTime = recoveryTimeMs;
                newMetrics.recoveryStatus = "completed";
              }
            }
          }
        }

        return newMetrics;
      });
    },
    []
  );

  // Set baseline heart rate and timestamp
  const setBaseline = useCallback((hr: number, timestamp: number) => {
    setMetrics((prev) => ({
      ...prev,
      baselineHeartRate: hr,
      baselineTime: timestamp,
      exerciseStartTime: null,
      peakHeartRate: 0,
      peakHeartRateTime: null,
      recoveryStartTime: null,
      recoveryTime: null,
      recoveryStatus: "not-started",
    }));
    console.log(
      `Set baseline heart rate: ${hr} BPM at ${new Date(
        timestamp
      ).toLocaleTimeString()}`
    );
  }, []);

  // Main analysis effect
  useEffect(() => {
    // Ensure we have enough data for analysis
    if (ecgData.length < 50) {
      console.log("Not enough ECG data for analysis");
      return;
    }

    // Use a sliding window approach for analysis - focus on the most recent data
    const windowSize = Math.min(300, ecgData.length); // Use a larger window for better R-peak detection
    const windowData = ecgData.slice(-windowSize);

    // Find R peaks in the current window
    const detectedPeaks = findPeaks(windowData);

    // Calculate heart rate and HRV
    const currentHR = calculateHeartRate(detectedPeaks);
    const currentHRV = calculateHRV(detectedPeaks);

    // Get latest timestamp
    const latestTimestamp =
      windowData[windowData.length - 1]?.timestamp || Date.now();

    // Track heart rate changes for recovery analysis
    if (currentHR > 0) {
      trackHeartRateChanges(currentHR, latestTimestamp);
    }

    // Update metrics
    setMetrics((prev) => ({
      ...prev,
      heartRate: currentHR,
      heartRateVariability: currentHRV,
      rPeaks: detectedPeaks,
    }));
  }, [
    ecgData,
    findPeaks,
    calculateHeartRate,
    calculateHRV,
    trackHeartRateChanges,
  ]);

  // Return the metrics, hrHistory and setBaseline function
  return {
    metrics,
    hrHistory, // Include heart rate history in the return value
    setBaseline: (timestamp = Date.now()) =>
      setBaseline(metrics.heartRate, timestamp),
  };
}
export default useECGAnalysis;
