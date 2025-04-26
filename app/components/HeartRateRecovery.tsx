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
import { HRDataPoint } from "@/types/types";

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
  startTimestamp: number | null;
  exerciseEndTimestamp: number | null;
};

export default function HeartRateRecovery({
  isConnected,
  hrHistory,
  startTimestamp,
  exerciseEndTimestamp,
}: HeartRateRecoveryProps) {
  const [peakHR, setPeakHR] = useState<number>(0);
  const [recordedHRs, setRecordedHRs] = useState<HRDataPoint[]>([]);
  const immediateHR = recordedHRs[0]?.value ?? null; // HR at t=0
  const recoveryHR = recordedHRs[1]?.value ?? null;
  const chartRef = useRef<HTMLCanvasElement>(null);
  const chartInstanceRef = useRef<Chart | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const hrHistoryRef = useRef(hrHistory);

  useEffect(() => {
    hrHistoryRef.current = hrHistory;
  }, [hrHistory]);

  // Chart data
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
    setRecordedHRs([]); // Clear on new exerciseEndTimestamp!
    if (!exerciseEndTimestamp) return;

    let count = 0;
    intervalRef.current = setInterval(() => {
      if (count >= 10) {
        clearInterval(intervalRef.current!);
        return;
      }
      const now = Date.now();
      const closest = findClosestHR(hrHistoryRef.current, now);
      if (closest) {
        setRecordedHRs((prev) => {
          // Prevent duplicates
          if (prev.find((r) => r.timestamp === closest.timestamp)) return prev;
          count = prev.length + 1;
          return [...prev, closest];
        });
      }
    }, 30000); // every 30 seconds

    // Immediately record HR at t=0, as first entry
    const immediate = findClosestHR(hrHistoryRef.current, exerciseEndTimestamp);
    if (immediate) {
      setRecordedHRs([immediate]);
      count = 1;
    }

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [exerciseEndTimestamp]);

  // Calculate peak HR during exercise
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
    // eslint-disable-next-line
  }, [hrHistory, isConnected, startTimestamp, exerciseEndTimestamp, peakHR]);

  const hrr = useMemo(() => {
    if (peakHR && recoveryHR !== null) {
      return peakHR - recoveryHR;
    }
    return null;
  }, [peakHR, recoveryHR]);

  // Chart rendering
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
        {/* No start/end/reset button here! */}
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
