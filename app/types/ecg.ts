// Constants for ECG analysis
export const SAMPLING_RATE = 130; // 130 Hz
export const ANALYSIS_WINDOW_SIZE = 5000; // 5000 samples (~38.5 seconds at 130Hz)
export const MIN_RR_INTERVALS = 5; // Minimum number of RR intervals for valid HRV calculation

// ECG analysis metrics
export interface ECGMetrics {
  heartRate: number;
  heartRateVariability: number;
  qtInterval: number;
  stSegment: {
    elevation: number;
    duration: number;
  };
  rPeaks: number[];
  qrsComplex: {
    duration: number;
    amplitude: number;
  };
}

// ECG comparison metrics (extends ECGMetrics)
export interface ECGComparisonMetrics extends ECGMetrics {
  heartRateRecovery: number;
  stDeviation: number;
  hrvChange: number;
  qtChange: number;
}