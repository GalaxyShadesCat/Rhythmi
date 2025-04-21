import { useState, useEffect, useMemo } from "react";
import { ECGDataPoint } from "@/hooks/useHeartRateSensor";

function useTestMode(
  ecgData: ECGDataPoint[],
  testSpeed = 500 // Set test mode animation speed to match actual sampling rate
) {
  const [isTestMode, setIsTestMode] = useState<boolean>(false);
  const [testCounter, setTestCounter] = useState(0);
  const [isChartPaused, setIsChartPaused] = useState(false);
  const [pausedEcgData, setPausedEcgData] = useState<ECGDataPoint[]>([]);

  // Auto-update timer to simulate real-time data flow
  useEffect(() => {
    if (isTestMode && !isChartPaused) {
      const timer = setInterval(() => {
        setTestCounter((prev) => prev + 1);
      }, testSpeed);

      return () => clearInterval(timer);
    }
  }, [isTestMode, isChartPaused, testSpeed]);

  // Generate realistic sample ECG data
  const testEcgData = useMemo(() => {
    const samples = [];
    const sampleSize = 1000;
    const now = Date.now();
    const timeOffset = testCounter * 16;

    const baseHeartRate = 72;
    const hrVariability = 5;

    let sampleIndex = 0;
    while (sampleIndex < sampleSize) {
      const hrVariation = (Math.random() * 2 - 1) * hrVariability;
      const currentHR = baseHeartRate + hrVariation;
      const currentRRInterval = Math.round((60 / currentHR) * 125);

      for (
        let beatIndex = 0;
        beatIndex < currentRRInterval && sampleIndex < sampleSize;
        beatIndex++
      ) {
        const beatPhase = beatIndex / currentRRInterval;
        let value = 0;

        if (beatPhase < 0.1) {
          value = 25 * Math.sin((beatPhase * Math.PI) / 0.1);
        } else if (beatPhase >= 0.2 && beatPhase < 0.35) {
          if (beatPhase < 0.22) {
            value = (-30 * (beatPhase - 0.2)) / 0.02;
          } else if (beatPhase < 0.28) {
            const rPeakIntensity = 150 + (Math.random() * 20 - 10);
            value =
              rPeakIntensity * Math.sin(((beatPhase - 0.22) * Math.PI) / 0.06);
          } else {
            value = -40 * Math.sin(((beatPhase - 0.28) * Math.PI) / 0.07);
          }
        } else if (beatPhase >= 0.35 && beatPhase < 0.45) {
          value = 5;
        } else if (beatPhase >= 0.45 && beatPhase < 0.7) {
          const tAmplitude = 35 + (Math.random() * 10 - 5);
          const tPhase = (beatPhase - 0.45) / 0.25;
          if (tPhase < 0.6) {
            value = tAmplitude * Math.sin((tPhase * Math.PI) / 0.6);
          } else {
            value =
              tAmplitude * Math.sin(((1 - (tPhase - 0.6) / 0.4) * Math.PI) / 2);
          }
        }

        value += 5 * Math.sin((2 * Math.PI * sampleIndex) / (125 * 5));
        value += (Math.random() * 2 - 1) * 2;

        const timestamp = now - (sampleSize - sampleIndex) * 8 + timeOffset;
        samples.push({ timestamp, value });

        sampleIndex++;
      }
    }

    return samples;
  }, [testCounter]);

  // Determine data to visualize
  const displayEcgData = useMemo(() => {
    if (isChartPaused) return pausedEcgData;
    return isTestMode ? testEcgData : ecgData;
  }, [isChartPaused, isTestMode, testEcgData, ecgData, pausedEcgData]);

  // Toggle test mode
  const toggleTestMode = () => {
    setIsTestMode((prev) => {
      if (!prev) {
        setTestCounter(0);
        setIsChartPaused(false);
        setPausedEcgData([]);
      }
      return !prev;
    });
  };

  // Toggle pause
  const togglePauseChart = () => {
    if (!isChartPaused) {
      const frozen = isTestMode ? testEcgData : ecgData;
      setPausedEcgData(frozen);
    }
    setIsChartPaused((prev) => !prev);
  };

  return {
    isTestMode,
    isChartPaused,
    toggleTestMode,
    togglePauseChart,
    displayEcgData,
    testEcgData,
  };
}

export default useTestMode;
