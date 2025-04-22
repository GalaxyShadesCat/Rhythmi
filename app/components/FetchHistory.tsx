import { useState } from "react";
import { useMongoDB, RecordData } from "@/hooks/useMongoDB";

function FetchHistory() {
  const [username, setUsername] = useState("");
  const [records, setRecords] = useState<RecordData[]>([]);
  const { getUserByUsername, loading, error, setError } = useMongoDB();

  const fetchRecords = async () => {
    if (!username.trim()) {
      setError("Please enter a username");
      return;
    }

    try {
      const user = await getUserByUsername(username);
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

  return (
    <div className="p-4 max-w-md mx-auto">
      <h2 className="text-xl font-bold mb-4">Fetch User Records</h2>
      
      <div className="mb-4">
        <label htmlFor="username" className="block mb-2 font-medium">
          Username:
        </label>
        <input
          id="username"
          type="text"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          className="w-full p-2 border rounded"
          placeholder="Enter username"
        />
      </div>

      <button
        onClick={fetchRecords}
        disabled={loading}
        className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 disabled:bg-blue-300"
      >
        {loading ? "Loading..." : "Fetch Records"}
      </button>

      {error && <p className="mt-2 text-red-500">{error}</p>}

      {records.length > 0 && (
        <div className="mt-6">
          <h3 className="text-lg font-semibold mb-2">Records for {username}:</h3>
          <ul className="space-y-4">
            {records.map((record) => (
              <li key={record._id} className="p-3 border rounded shadow-sm">
                <p><strong>Date:</strong> {new Date(record.datetime).toLocaleString()}</p>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

export default FetchHistory;