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
  hrr_points?: HRRPoint[];
  notes?: string;
}

export interface ECGDataPoint {
  timestamp: number;
  value: number;
}

export interface HRDataPoint {
  timestamp: number;
  value: number;
}

export interface HRRPoint {
  time: number; // Seconds since recovery start
  hr: number | null;
  hrr: number | null;
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
  exercise: "green",
  recovery: "red",
};

export type ActivityType = "rest" | "exercise" | "recovery";

export interface ActivitySegment {
  type: keyof typeof ACTIVITY_COLORS;
  start: number;
  end: number;
}

export const PHASE_COLORS: Record<ActivityType, string> = {
  rest: "#a5b4fc",
  exercise: "#bbf7d0",
  recovery: "#fdba74",
};
