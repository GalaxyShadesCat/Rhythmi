export interface User {
  _id?: string;
  user_name: string; // Unique across all users
  birth_year: number;
  gender: string;
}

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
}

export interface ECGDataPoint {
  timestamp: number;
  value: number;
}

export interface HRDataPoint {
  timestamp: number;
  value: number;
}

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

export const ACTIVITY_COLORS: Record<ActivityType, string> = {
  rest: "blue",
  walk: "green",
  run: "red",
};

export type ActivityType = "rest" | "walk" | "run";

export interface ActivitySegment {
  type: keyof typeof ACTIVITY_COLORS;
  start: number;
  end: number;
}
