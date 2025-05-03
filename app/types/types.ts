// User data
export interface User {
  _id?: string; // Unique across all users
  user_name: string; // Unique across all users
  birth_year: number;
  gender: string;
}

// Record data
export interface RecordData {
  _id?: string;
  user_id: string; // Reference to User._id
  datetime: string; // ISO string
  ecg: ECGDataPoint[];
  hr: HRDataPoint[];
  rest_metrics: ECGMetrics;
  exercise_metrics: ECGMetrics;
  recovery_metrics: ECGMetrics;
  activity_segments: ActivitySegment[];
  hrr_points?: HRRPoint[];
  notes?: string;
}

// Single ECG data point
export interface ECGDataPoint {
  timestamp: number;
  value: number;
}

// Single HR data point
export interface HRDataPoint {
  timestamp: number;
  value: number;
}

// Single HRR data point
export interface HRRPoint {
  time: number; // Seconds since recovery start
  hr: number | null;
  hrr: number | null;
}

// ECG metrics
export interface ECGMetrics {
  avgHeartRate: number;
  medianHeartRate: number;
  minHeartRate: number;
  maxHeartRate: number;
  heartRateVariability: number; // RMSSD, ms
  rrIntervals: number[]; // ms
  rPeaks: number[]; // timestamps (ms)
  totalBeats: number;
  duration: number; // ms
}

// Color mapping for different activity types
export const ACTIVITY_COLORS: Record<ActivityType, string> = {
  rest: "blue",
  exercise: "green",
  recovery: "red",
};

// Type definition for activity types
export type ActivityType = "rest" | "exercise" | "recovery";

// Timestamp of activity switch
export interface ActivitySegment {
  type: keyof typeof ACTIVITY_COLORS;
  start: number;
  end: number;
}

// Color mapping for different phases in HR graph
export const PHASE_COLORS: Record<ActivityType, string> = {
  rest: "#a5b4fc",
  exercise: "#bbf7d0",
  recovery: "#fdba74",
};
