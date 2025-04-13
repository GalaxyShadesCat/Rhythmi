import React, { useEffect, useMemo, useState } from "react";
import { HRPoint } from "@/hooks/useMongoDB";

function findClosestHR(data: HRPoint[], target: number): HRPoint | null {
  if (!data.length) return null;
  return data.reduce((closest, point) => {
    return Math.abs(point.timestamp - target) <
      Math.abs(closest.timestamp - target)
      ? point
      : closest;
  }, data[0]);
}

type HRRDisplayProps = {
  isMonitoring: boolean;
  historicalHR: HRPoint[];
  currentHR: HRPoint[];
};

export default function HRRDisplay({
  isMonitoring,
  historicalHR,
  currentHR,
}: HRRDisplayProps) {
  const [startTimestamp, setStartTimestamp] = useState<number | null>(null);
  const [peakHR, setPeakHR] = useState<number>(0);
  const [recoveryHR, setRecoveryHR] = useState<number | null>(null);

  // Reset internal state when monitoring stops
  useEffect(() => {
    if (!isMonitoring) {
      setStartTimestamp(null);
      setPeakHR(0);
      setRecoveryHR(null);
    } else if (
      isMonitoring &&
      startTimestamp === null &&
      currentHR.length > 0
    ) {
      const latest = currentHR[currentHR.length - 1];
      setStartTimestamp(latest.timestamp);
    }
  }, [isMonitoring, currentHR]);

  // Track peak HR and fetch recovery HR after 60 seconds
  useEffect(() => {
    if (!isMonitoring || startTimestamp === null) return;

    const now = Date.now();

    // Filter HR points during monitoring session
    const sessionHR = currentHR.filter((p) => p.timestamp >= startTimestamp);

    // Update peak HR
    const maxHR = sessionHR.reduce((max, p) => Math.max(max, p.value), 0);
    if (maxHR > peakHR) {
      setPeakHR(maxHR);
    }

    // Try to get recovery HR after 60 seconds
    const targetTime = startTimestamp + 60000;
    if (now >= targetTime && recoveryHR === null) {
      const recoveryPoint = findClosestHR(currentHR, targetTime);
      if (recoveryPoint) {
        setRecoveryHR(recoveryPoint.value);
      }
    }
  }, [currentHR, isMonitoring, startTimestamp, peakHR, recoveryHR]);

  const averageHistoricalHR = useMemo(() => {
    if (!historicalHR.length) return 0;
    const total = historicalHR.reduce((sum, p) => sum + p.value, 0);
    return total / historicalHR.length;
  }, [historicalHR]);

  const hrr = useMemo(() => {
    if (peakHR && recoveryHR !== null) {
      return peakHR - recoveryHR;
    }
    return null;
  }, [peakHR, recoveryHR]);

  return (
    <div className="max-w-xl mx-auto mt-6 p-4 bg-white rounded-lg shadow-md">
      <h2 className="text-xl font-semibold mb-4 text-gray-800">
        Heart Rate Recovery (HRR)
      </h2>

      <div className="mt-2 space-y-2 text-gray-700">
        <p>
          📊 <strong>Avg Historical HR:</strong>{" "}
          {averageHistoricalHR.toFixed(2)} bpm
        </p>

        {isMonitoring && (
          <>
            <p>
              💓 <strong>Peak HR:</strong> {peakHR} bpm
            </p>
            {recoveryHR !== null ? (
              <>
                <p>
                  🧘 <strong>HR after 60s:</strong> {recoveryHR} bpm
                </p>
                <p>
                  🔻 <strong>HRR:</strong> {hrr?.toFixed(2)} bpm
                </p>
              </>
            ) : (
              <p className="text-sm text-gray-500">
                ⏳ Waiting for 60 seconds to calculate recovery HR...
              </p>
            )}
          </>
        )}

        {!isMonitoring && (
          <p className="text-sm text-gray-500 italic">
            Monitoring is inactive.
          </p>
        )}
      </div>
    </div>
  );
}
