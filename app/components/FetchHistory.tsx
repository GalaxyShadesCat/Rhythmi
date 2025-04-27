"use client";
import { useState, useEffect } from "react";
import { useMongoDB } from "@/hooks/useMongoDB";
import { RecordData } from "@/types/types";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
} from "chart.js";
import { Line } from "react-chartjs-2";

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);

interface FetchHistoryProps {
  user_name: string;
}

function FetchHistory({ user_name }: FetchHistoryProps) {
  const [records, setRecords] = useState<RecordData[]>([]);
  const [selectedRecord, setSelectedRecord] = useState<RecordData | null>(null);
  const [visibleDataPoints, setVisibleDataPoints] = useState(500);
  const { getUserByUsername, loading, error, setError } = useMongoDB();

  const fetchRecords = async () => {
    setError(null);
    
    if (!user_name.trim()) {
      setError("Username not available");
      return;
    }
  
    try {
      const user = await getUserByUsername(user_name);
      if (!user || !user._id) {
        setError("User not found or missing ID");
        return;
      }
  
      const response = await fetch(`/api/records?user_id=${encodeURIComponent(user._id)}`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
      });
  
      if (!response.ok) {
        throw new Error(`Failed to fetch records: ${response.statusText}`);
      }
  
      const result = await response.json();
      
      // Handle both possible response formats
      const recordsData = result.data || result;
      
      if (!Array.isArray(recordsData)) {
        throw new Error("Invalid records data format received");
      }
  
      setRecords(recordsData);
      console.log("Fetched records:", recordsData);
  
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error occurred";
      console.error("Fetch error:", message);
      setError(message);
    }
  };

  useEffect(() => {
    fetchRecords();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user_name]);

  const formatECGChartData = (
    ecgData: { timestamp: number; value: number }[]
  ) => {
    const visibleData = ecgData.slice(-visibleDataPoints);

    return {
      labels: visibleData.map(
        (point, index) =>
          new Date(point.timestamp).toLocaleTimeString() || index.toString()
      ),
      datasets: [
        {
          label: "ECG",
          data: visibleData.map((point) => point.value),
          borderColor: "rgb(75, 192, 192)",
          backgroundColor: "rgba(75, 192, 192, 0.5)",
          tension: 0.1,
        },
      ],
    };
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: "top" as const,
      },
      title: {
        display: true,
        text: "ECG Data",
      },
      tooltip: {
        callbacks: {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          label: (context: any) => {
            return `Value: ${context.parsed.y} µV`;
          },
        },
      },
    },
    scales: {
      x: {
        title: {
          display: true,
          text: "Time",
        },
      },
      y: {
        title: {
          display: true,
          text: "ECG Value (µV)",
        },
      },
    },
  };

  return (
    <div className="p-4 max-w-4xl mx-auto">
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
        <div className="mt-6 space-y-6">
          <div className="flex flex-col space-y-2">
            <label htmlFor="dataPoints" className="font-medium">
              Visible Data Points:
            </label>
            <select
              id="dataPoints"
              value={visibleDataPoints}
              onChange={(e) => setVisibleDataPoints(Number(e.target.value))}
              className="p-2 border rounded"
            >
              <option value={250}>250 points</option>
              <option value={500}>500 points</option>
              <option value={1000}>1000 points</option>
              <option value={0}>All points</option>
            </select>
          </div>

          <div className="space-y-4">
            {records.map((record) => (
              <div key={record._id} className="p-4 border rounded shadow-sm">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="font-semibold">
                      {new Date(record.datetime).toLocaleString()}
                    </p>
                    <p className="text-sm text-gray-600">
                      ECG Points: {record.ecg.length} | HR Points:{" "}
                      {record.hr.length}
                    </p>
                  </div>
                  <button
                    onClick={() =>
                      setSelectedRecord(
                        selectedRecord?._id === record._id ? null : record
                      )
                    }
                    className="bg-gray-100 hover:bg-gray-200 px-3 py-1 rounded text-sm"
                  >
                    {selectedRecord?._id === record._id
                      ? "Hide ECG"
                      : "Show ECG"}
                  </button>
                </div>

                {selectedRecord?._id === record._id && (
                  <div className="mt-4">
                    <div className="h-64 w-full">
                      <Line
                        options={chartOptions}
                        data={formatECGChartData(record.ecg)}
                      />
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      ) : (
        <p className="mt-4">No records found.</p>
      )}
    </div>
  );
}

export default FetchHistory;
