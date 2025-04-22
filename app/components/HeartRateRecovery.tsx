import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Chart,
  LineElement,
  PointElement,
  LinearScale,
  CategoryScale,
  Tooltip,
  Legend,
  Filler,
} from "chart.js";
import { HRDataPoint } from "@/hooks/useHeartRateSensor";

Chart.register(
  LineElement,
  PointElement,
  LinearScale,
  CategoryScale,
  Tooltip,
  Legend,
  Filler
);

function findClosestHR(
  data: HRDataPoint[],
  target: number
): HRDataPoint | null {
  if (!data.length) return null;
  return data.reduce((closest, point) =>
    Math.abs(point.timestamp - target) < Math.abs(closest.timestamp - target)
      ? point
      : closest
  );
}

type HeartRateRecoveryProps = {
  isConnected: boolean;
  hrHistory: HRDataPoint[];
};

export default function HeartRateRecovery({
  isConnected,
  hrHistory,
}: HeartRateRecoveryProps) {
  const [startTimestamp, setStartTimestamp] = useState<number | null>(null);
  const [exerciseEndTimestamp, setExerciseEndTimestamp] = useState<
    number | null
  >(null);
  const [peakHR, setPeakHR] = useState<number>(0);

  const [recordedHRs, setRecordedHRs] = useState<HRDataPoint[]>([]);
  const recoveryHR = recordedHRs[0]?.value ?? null;

  const chartRef = useRef<HTMLCanvasElement>(null);
  const chartInstanceRef = useRef<Chart | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const chartData = useMemo(() => {
    if (!startTimestamp) return [];

    return hrHistory
      .filter(
        (p) =>
          p.timestamp >= startTimestamp &&
          (!exerciseEndTimestamp || p.timestamp <= exerciseEndTimestamp + 60000)
      )
      .map((p) => ({
        time: new Date(p.timestamp).toLocaleTimeString().slice(3, 8),
        value: p.value,
      }));
  }, [hrHistory, startTimestamp, exerciseEndTimestamp]);

  // Start 30s interval to record HR post-exercise
  useEffect(() => {
    if (!exerciseEndTimestamp) return;

    intervalRef.current = setInterval(() => {
      const now = Date.now();
      const closest = findClosestHR(hrHistory, now);
      if (closest) {
        setRecordedHRs((prev) => {
          const newRecord = {
            timestamp: closest.timestamp,
            value: closest.value,
          };
          if (prev.length < 10) {
            return [...prev, newRecord];
          } else {
            clearInterval(intervalRef.current!);
            return prev;
          }
        });
      }
    }, 30000); // every 30 seconds

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [exerciseEndTimestamp, hrHistory]);

  useEffect(() => {
    if (!isConnected || !startTimestamp) return;

    const now = Date.now();
    const endTime = exerciseEndTimestamp ?? now;

    const sessionHR = hrHistory.filter(
      (p) => p.timestamp >= startTimestamp && p.timestamp <= endTime
    );

    const recent = sessionHR.filter((p) => now - p.timestamp <= 5000);
    const avg = recent.length
      ? recent.reduce((sum, p) => sum + p.value, 0) / recent.length
      : 0;

    if (avg > peakHR) {
      setPeakHR(Math.round(avg));
    }
  }, [hrHistory, isConnected, startTimestamp, exerciseEndTimestamp, peakHR]);

  const hrr = useMemo(() => {
    if (peakHR && recoveryHR !== null) {
      return peakHR - recoveryHR;
    }
    return null;
  }, [peakHR, recoveryHR]);

  const handleToggleExercise = () => {
    const now = Date.now();
    const latest = hrHistory[hrHistory.length - 1];

    if (!startTimestamp) {
      if (latest) {
        setStartTimestamp(latest.timestamp);
        setExerciseEndTimestamp(null);
        setPeakHR(0);
        setRecordedHRs([]);
      }
    } else if (!exerciseEndTimestamp) {
      setExerciseEndTimestamp(now);
    } else {
      setStartTimestamp(null);
      setExerciseEndTimestamp(null);
      setPeakHR(0);
      setRecordedHRs([]);
      if (intervalRef.current) clearInterval(intervalRef.current);
    }
  };

  useEffect(() => {
    if (!chartRef.current) return;

    const ctx = chartRef.current.getContext("2d");
    if (!ctx) return;

    if (chartInstanceRef.current) {
      chartInstanceRef.current.destroy();
    }

    chartInstanceRef.current = new Chart(ctx, {
      type: "line",
      data: {
        labels: chartData.map((p) => p.time),
        datasets: [
          {
            label: "Heart Rate",
            data: chartData.map((p) => p.value),
            borderColor: "#3b82f6",
            backgroundColor: "rgba(59, 130, 246, 0.2)",
            tension: 0.3,
            pointRadius: 0,
            fill: true,
          },
        ],
      },
      options: {
        animation: false,
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          y: {
            beginAtZero: false,
            ticks: {
              precision: 0,
            },
          },
        },
        plugins: {
          legend: {
            display: false,
          },
        },
      },
    });
  }, [chartData]);

  return (
    <div className="bg-white p-6 rounded-lg shadow max-w-4xl mx-auto mt-8">
      <h2 className="text-xl font-semibold mb-4 text-gray-800">
        Heart Rate Recovery (HRR)
      </h2>

      <div className="space-y-2 text-gray-700 mb-4">
        <button
          onClick={handleToggleExercise}
          disabled={!startTimestamp && hrHistory.length === 0}
          className={`px-4 py-2 rounded-md text-white font-medium ${
            !startTimestamp
              ? "bg-green-600 disabled:bg-gray-400"
              : !exerciseEndTimestamp
              ? "bg-blue-600"
              : "bg-red-600"
          }`}
        >
          {!startTimestamp
            ? "Start Exercise"
            : !exerciseEndTimestamp
            ? "End Exercise"
            : "Reset"}
        </button>

        {startTimestamp && (
          <>
            <p>
              💓 <strong>Peak HR:</strong> {peakHR} bpm
            </p>
            {exerciseEndTimestamp &&
              (recoveryHR !== null ? (
                <>
                  <p>
                    🧘 <strong>HR after 30s:</strong> {recoveryHR} bpm
                  </p>
                  <p>
                    🔻 <strong>HRR:</strong> {hrr?.toFixed(2)} bpm
                  </p>
                </>
              ) : (
                <p className="text-sm text-gray-500">
                  ⏳ Waiting 30 seconds after exercise to calculate recovery
                  HR...
                </p>
              ))}
          </>
        )}
      </div>

      {recordedHRs.length > 0 && (
        <div className="bg-gray-50 p-4 rounded-lg mb-4">
          <h3 className="font-medium mb-2 text-gray-800">
            📋 Recorded HR every 30s
          </h3>
          <ul className="text-sm text-gray-700 space-y-1">
            {recordedHRs.map((entry, i) => (
              <li key={i}>
                {new Date(entry.timestamp).toLocaleTimeString()} — {entry.value}{" "}
                bpm
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="bg-gray-100 rounded-lg p-4">
        <h3 className="text-gray-800 font-medium mb-2">Live HR Chart</h3>
        <div className="relative" style={{ height: "256px" }}>
          <canvas
            ref={chartRef}
            className="absolute top-0 left-0 w-full h-full"
          />
        </div>
      </div>
    </div>
  );
}
