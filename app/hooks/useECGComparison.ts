import { useState, useEffect, useCallback, useMemo } from "react";
import { ECGComparisonMetrics } from "@/types/ecg";
import { useECGAnalysis } from "@/hooks/useECGAnalysis";
import { ECGDataPoint, ActivitySegment } from "@/types/types";

export function useECGComparison(
  baselineECG: ECGDataPoint[],
  currentECG: ECGDataPoint[],
  activitySegments?: ActivitySegment[]
) {
  const [comparisonMetrics, setComparisonMetrics] =
    useState<ECGComparisonMetrics>({
      // Include base ECG metrics
      heartRate: 0,
      heartRateVariability: 0,
      qtInterval: 0,
      stSegment: {
        elevation: 0,
        duration: 0,
      },
      rPeaks: [],
      qrsComplex: {
        duration: 0,
        amplitude: 0,
      },
      // Additional comparison metrics
      heartRateRecovery: 0,
      stDeviation: 0,
      hrvChange: 0,
      qtChange: 0,
    });

  // Use the base ECG analysis hook for both baseline and current ECG
  const baselineMetrics = useECGAnalysis(baselineECG);
  const currentMetrics = useECGAnalysis(currentECG);

  // Get current activity type if available
  const getCurrentActivityType = useCallback(
    (timestamp: number): string | null => {
      if (!activitySegments) return null;
      const currentSegment = activitySegments.find(
        (segment) => timestamp >= segment.start && timestamp <= segment.end
      );
      return currentSegment?.type || null;
    },
    [activitySegments]
  );

  // Calculate heart rate recovery based on activity type
  const calculateHRRecovery = useCallback((): number => {
    if (baselineMetrics.heartRate === 0 || currentMetrics.heartRate === 0)
      return 0;

    // Get the current activity type
    const currentActivity = getCurrentActivityType(Date.now());

    // Different recovery calculations based on activity
    if (currentActivity === "rest") {
      return Math.max(0, currentMetrics.heartRate - baselineMetrics.heartRate);
    } else if (currentActivity === "walk") {
      return (
        Math.max(0, currentMetrics.heartRate - baselineMetrics.heartRate) * 1.5
      );
    } else if (currentActivity === "run") {
      return (
        Math.max(0, currentMetrics.heartRate - baselineMetrics.heartRate) * 2
      );
    }

    return Math.max(0, currentMetrics.heartRate - baselineMetrics.heartRate);
  }, [
    baselineMetrics.heartRate,
    currentMetrics.heartRate,
    getCurrentActivityType,
  ]);

  // Calculate ST segment deviation with activity context
  const calculateSTDeviation = useCallback((): number => {
    // Since stSegment doesn't exist in our actual ECGMetrics, provide a default value
    // In a real implementation, you would need to calculate or get this from somewhere
    const baselineElevation = 0;
    const currentElevation = 0;
    const deviation = currentElevation - baselineElevation;
    const currentActivity = getCurrentActivityType(Date.now());

    // Adjust expected deviation based on activity
    if (currentActivity === "rest") {
      return deviation;
    } else if (currentActivity === "walk") {
      return deviation * 1.2;
    } else if (currentActivity === "run") {
      return deviation * 1.5;
    }

    return deviation;
  }, [getCurrentActivityType]);

  // Calculate HRV change as a percentage
  const calculateHRVChange = useCallback((): number => {
    if (baselineMetrics.heartRateVariability === 0) return 0;
    return (
      ((currentMetrics.heartRateVariability -
        baselineMetrics.heartRateVariability) /
        baselineMetrics.heartRateVariability) *
      100
    );
  }, [
    baselineMetrics.heartRateVariability,
    currentMetrics.heartRateVariability,
  ]);

  // Calculate QT interval change as a percentage
  const calculateQTChange = useCallback((): number => {
    // Since qtInterval doesn't exist in our actual ECGMetrics, provide a default value
    // In a real implementation, you would need to calculate or get this from somewhere
    const baselineQT = 0;
    const currentQT = 0;
    if (baselineQT === 0) return 0;
    return ((currentQT - baselineQT) / baselineQT) * 100;
  }, []);

  // Memoize the calculation results to prevent recalculation on every render
  const calculatedMetrics = useMemo(() => {
    // Only calculate if we have enough data
    if (baselineECG.length < 50 || currentECG.length < 50) {
      return null;
    }

    const hrRecovery = calculateHRRecovery();
    const stDev = calculateSTDeviation();
    const hrvChange = calculateHRVChange();
    const qtChange = calculateQTChange();

    return {
      hrRecovery,
      stDev,
      hrvChange,
      qtChange,
    };
  }, [
    baselineECG.length,
    currentECG.length,
    calculateHRRecovery,
    calculateSTDeviation,
    calculateHRVChange,
    calculateQTChange,
  ]);

  // Main comparison effect
  useEffect(() => {
    console.log(
      `Comparison - Baseline ECG length: ${baselineECG.length}, Current ECG length: ${currentECG.length}`
    );

    // Only update if we have calculated metrics
    if (!calculatedMetrics) {
      console.log("Not enough data for comparison");
      return;
    }

    console.log("Baseline metrics:", baselineMetrics);
    console.log("Current metrics:", currentMetrics);

    const { hrRecovery, stDev, hrvChange, qtChange } = calculatedMetrics;

    console.log(
      `Calculated comparison metrics - HR Recovery: ${hrRecovery}, ST Deviation: ${stDev}, HRV Change: ${hrvChange}%, QT Change: ${qtChange}%`
    );

    setComparisonMetrics({
      // Include current ECG metrics
      heartRate: currentMetrics.heartRate,
      heartRateVariability: currentMetrics.heartRateVariability,
      // Provide default values for fields that don't exist in our ECGMetrics
      qtInterval: 0,
      stSegment: {
        elevation: 0,
        duration: 0,
      },
      rPeaks: currentMetrics.rPeaks,
      qrsComplex: {
        duration: 0,
        amplitude: 0,
      },
      // Add comparison metrics
      heartRateRecovery: hrRecovery,
      stDeviation: stDev,
      hrvChange: hrvChange,
      qtChange: qtChange,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [calculatedMetrics, baselineMetrics, currentMetrics]);

  return comparisonMetrics;
}
