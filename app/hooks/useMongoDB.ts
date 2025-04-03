import { useState } from "react";

export interface HRPoint {
  timestamp: number;
  value: number;
}

export interface ECGPoint {
  timestamp: number;
  value: number;
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
  ecg: ECGPoint[];
  hr: HRPoint[];
  activity_segments: ActivitySegment[];
}

export function useMongoDB() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const createUser = async (user: Omit<User, "_id">): Promise<User | null> => {
    setLoading(true);
    setError(null);
    setSuccess(false);

    try {
      const response = await fetch("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(user),
      });

      if (!response.ok) {
        if (response.status === 409) {
          throw new Error("Username already exists");
        }
        throw new Error("Failed to create user");
      }

      const createdUser = await response.json();
      setSuccess(true);
      return createdUser;
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("An unknown error occurred");
      }
      return null;
    } finally {
      setLoading(false);
    }
  };

  const getUserByUsername = async (user_name: string): Promise<User | null> => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/users/${user_name}`);
      if (!response.ok) {
        throw new Error("User not found");
      }
      return await response.json();
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("An unknown error occurred");
      }
      return null;
    } finally {
      setLoading(false);
    }
  };

  const uploadRecord = async (record: RecordData) => {
    setLoading(true);
    setError(null);
    setSuccess(false);

    console.log("Uploading record:", record);

    try {
      const response = await fetch("/api/records", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(record),
      });

      if (!response.ok) {
        throw new Error(`Upload failed: ${response.statusText}`);
      }

      setSuccess(true);
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("An unknown error occurred");
      }
      return null;
    } finally {
      setLoading(false);
    }
  };

  return {
    createUser,
    getUserByUsername,
    uploadRecord,
    loading,
    error,
    success,
    setError,
    setSuccess,
  };
}
