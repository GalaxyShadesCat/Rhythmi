import { useState } from "react";
import { RecordData, User } from "@/types/types";

export function useMongoDB() {
  const [loading, setLoading] = useState(false); // Loading status
  const [error, setError] = useState<string | null>(null); // Errors encountered
  const [success, setSuccess] = useState(false); // Success status

  // Function to upload new user data to DB
  const createUser = async (user: Omit<User, "_id">): Promise<User | null> => {
    setLoading(true);
    setError(null);
    setSuccess(false);

    try {
      // POST request for user data
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
      return createdUser; // Return user data created
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("An unknown error occurred");
      }
      return null;
    } finally {
      setLoading(false); // Reset loading state
    }
  };

  // Function to retrieve user data by username
  const getUserByUsername = async (user_name: string): Promise<User | null> => {
    setLoading(true);
    setError(null);
    try {
      // GET request for user data
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
      setLoading(false); // Reset loading state
    }
  };

  // Function to upload record data
  const uploadRecord = async (record: RecordData) => {
    setLoading(true);
    setError(null);
    setSuccess(false);

    console.log("Uploading record:", record);

    try {
      // POST request for record data
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
      setLoading(false); // Reset loading state
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
