import { useState, useEffect } from "react";
import { useMongoDB, RecordData } from "@/hooks/useMongoDB";

interface FetchHistoryProps {
  user_name: string;
}

function FetchHistory({ user_name }: FetchHistoryProps) {
  const [records, setRecords] = useState<RecordData[]>([]);
  const { getUserByUsername, loading, error, setError } = useMongoDB();

  const fetchRecords = async () => {
    if (!user_name.trim()) {
      setError("Username not available");
      return;
    }

    try {
      const user = await getUserByUsername(user_name);
      if (!user) {
        setError("User not found");
        return;
      }

      const response = await fetch(`/api/records?user_id=${user._id}`);
      if (!response.ok) {
        throw new Error("Failed to fetch records");
      }

      const userRecords = await response.json();
      setRecords(userRecords);
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("An unknown error occurred while fetching records");
      }
    }
  };

  // Automatically fetch records when component mounts
  useEffect(() => {
    fetchRecords();
  }, [user_name]);

  return (
    <div className="p-4 max-w-md mx-auto">
      <h2 className="text-xl font-bold mb-4">Your Records</h2>

      <button
        onClick={fetchRecords}
        disabled={loading}
        className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 disabled:bg-blue-300 mb-4"
      >
        {loading ? "Loading..." : "Refresh Records"}
      </button>

      {error && <p className="mt-2 text-red-500">{error}</p>}

      {records.length > 0 ? (
        <div className="mt-6">
          <h3 className="text-lg font-semibold mb-2">
            Records for {user_name}:
          </h3>
          <ul className="space-y-4">
            {records.map((record) => (
              <li key={record._id} className="p-3 border rounded shadow-sm">
                <p>
                  <strong>Date:</strong>{" "}
                  {new Date(record.datetime).toLocaleString()}
                </p>
              </li>
            ))}
          </ul>
        </div>
      ) : (
        <p className="mt-4">No records found.</p>
      )}
    </div>
  );
}

export default FetchHistory;