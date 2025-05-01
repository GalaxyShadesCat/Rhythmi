"use client";
import { useState, useEffect } from "react";
import { useMongoDB } from "@/hooks/useMongoDB";
import { RecordData, ECGMetrics } from "@/types/types";
import ChatBubbleOutlineIcon from "@mui/icons-material/ChatBubbleOutline";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from "chart.js";
import { Line } from "react-chartjs-2";
import annotationPlugin from "chartjs-plugin-annotation";
import HRPhasesChart from "@/app/components/HRPhasesChart";
import HRRChart from "@/app/components/HRRChart";
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler,
  annotationPlugin
);

interface FetchHistoryProps {
  user_name: string;
  records: RecordData[];
  setRecords: React.Dispatch<React.SetStateAction<RecordData[]>>;
  setChatRecord: React.Dispatch<React.SetStateAction<RecordData | null>>;
  setOpenChat: React.Dispatch<React.SetStateAction<boolean>>;
}

function FetchHistory({
  user_name,
  records,
  setRecords,
  setChatRecord,
  setOpenChat,
}: FetchHistoryProps) {
  const [selectedRecord, setSelectedRecord] = useState<RecordData | null>(null);
  const [visibleDataPoints, setVisibleDataPoints] = useState(500);
  const [loading, setLoading] = useState(false);
  const { getUserByUsername, error, setError } = useMongoDB();

  const handleChatAboutRecord = (record: RecordData) => {
    setChatRecord(record);
    setOpenChat(true);
  };

  const fetchRecords = async () => {
    setError(null);
    setLoading(true);

    try {
      const user = await getUserByUsername(user_name);

      if (!user || !user._id) {
        setError("User not found or missing ID");
        return;
      }

      const userId = user._id;

      const response = await fetch(
        `/api/records?user_id=${encodeURIComponent(userId)}`,
        {
          method: "GET",
          headers: { "Content-Type": "application/json" },
        }
      );

      if (!response.ok) {
        throw new Error(`Failed to fetch records: ${response.statusText}`);
      }

      const result = await response.json();
      const recordsData = result.data || [];

      if (!Array.isArray(recordsData)) {
        throw new Error("Invalid records data format received");
      }

      setRecords(recordsData);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Unknown error occurred";
      setError(message);
    } finally {
      setLoading(false);
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

  const renderMetrics = (metrics: ECGMetrics, title: string) => (
    <div className="bg-gray-50 p-3 rounded-lg mb-3">
      <h4 className="font-medium text-gray-800 mb-2">{title}</h4>
      <div className="grid grid-cols-2 gap-2 text-sm">
        <div>
          <span className="text-gray-500">Avg HR:</span>{" "}
          <span className="font-medium">
            {Math.round(metrics.avgHeartRate)} bpm
          </span>
        </div>
        <div>
          <span className="text-gray-500">Min HR:</span>{" "}
          <span className="font-medium">
            {Math.round(metrics.minHeartRate)} bpm
          </span>
        </div>
        <div>
          <span className="text-gray-500">Max HR:</span>{" "}
          <span className="font-medium">
            {Math.round(metrics.maxHeartRate)} bpm
          </span>
        </div>
        <div>
          <span className="text-gray-500">HRV:</span>{" "}
          <span className="font-medium">
            {Math.round(metrics.heartRateVariability)} ms
          </span>
        </div>
        <div>
          <span className="text-gray-500">Total Beats:</span>{" "}
          <span className="font-medium">{metrics.totalBeats}</span>
        </div>
        <div>
          <span className="text-gray-500">Duration:</span>{" "}
          <span className="font-medium">
            {Math.round(metrics.duration / 1000)} s
          </span>
        </div>
      </div>
    </div>
  );

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
              <option value={2000}>2000 points</option>
              <option value={0}>All points</option>
            </select>
          </div>

          <div className="space-y-4">
            {records.map((record) => (
              <div key={record._id} className="p-2 border rounded shadow-sm">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="font-semibold">
                      {new Date(record.datetime).toLocaleDateString("en-GB", {
                        day: "2-digit",
                        month: "2-digit",
                        year: "numeric",
                      })}
                      ,{" "}
                      {new Date(record.datetime).toLocaleTimeString("en-GB", {
                        hour: "2-digit",
                        minute: "2-digit",
                        second: "2-digit",
                        hour12: false,
                      })}
                    </p>
                    {record.notes && (
                      <div className="mt-3 py-2 rounded">
                        <p className="font-medium">Notes: {record.notes}</p>
                      </div>
                    )}
                  </div>
                  <button
                    onClick={() =>
                      setSelectedRecord(
                        selectedRecord?._id === record._id ? null : record
                      )
                    }
                    className="bg-gray-100 hover:bg-gray-200 px-3 py-1 rounded text-sm whitespace-nowrap"
                  >
                    {selectedRecord?._id === record._id
                      ? "Hide Details"
                      : "Show Details"}
                  </button>
                </div>

                {selectedRecord?._id === record._id && (
                  <div className="mt-4 space-y-4">
                    <button
                      onClick={() => handleChatAboutRecord(record)}
                      className="bg-blue-100 hover:bg-blue-200 text-blue-700 px-4 py-2 rounded text-sm whitespace-nowrap transition flex items-center"
                    >
                      Discuss This Record
                      <ChatBubbleOutlineIcon
                        className="ml-1"
                        fontSize="small"
                      />
                    </button>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      {renderMetrics(record.rest_metrics, "Rest Metrics")}
                      {renderMetrics(
                        record.exercise_metrics,
                        "Exercise Metrics"
                      )}
                      {renderMetrics(
                        record.recovery_metrics,
                        "Recovery Metrics"
                      )}
                    </div>

                    {record.hrr_points && record.hrr_points.length > 0 && (
                      <HRRChart hrrPoints={record.hrr_points} />
                    )}

                    {selectedRecord && (
                      <HRPhasesChart record={selectedRecord} />
                    )}

                    <div className="mt-4">
                      <h4 className="font-medium text-gray-800 mb-2">
                        ECG Signal
                      </h4>
                      <div className="h-64 w-full">
                        <Line
                          options={chartOptions}
                          data={formatECGChartData(record.ecg)}
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="mt-8 p-10 text-center bg-gray-50 border border-gray-100 rounded-xl shadow-sm">
          <div className="w-16 h-16 mx-auto mb-4 flex items-center justify-center rounded-full bg-blue-50">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-8 w-8 text-blue-500"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
              />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-gray-800 mb-1">
            No ECG Records Found
          </h3>
          <p className="text-gray-500 mb-6">
            You haven&apos;t created any heart monitoring records yet.
          </p>
        </div>
      )}
    </div>
  );
}

export default FetchHistory;
