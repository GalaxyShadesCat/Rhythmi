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
  const [exerciseEndTimestamp, setExerciseEndTimestamp] = useState<
    number | null
  >(null);
  const [peakHR, setPeakHR] = useState<number>(0);
  const [recoveryHR, setRecoveryHR] = useState<number | null>(null);

  // Reset only when monitoring STARTS (not when it stops)
  useEffect(() => {
    if (isMonitoring && startTimestamp === null && currentHR.length > 0) {
      const latest = currentHR[currentHR.length - 1];
      setStartTimestamp(latest.timestamp);
      setExerciseEndTimestamp(null);
      setPeakHR(0);
      setRecoveryHR(null);
    }
  }, [isMonitoring, currentHR, startTimestamp]);

  // Track peak HR up to exercise end
  useEffect(() => {
    if (!isMonitoring || !startTimestamp) return;

    const endTime = exerciseEndTimestamp ?? Date.now();

    const sessionHR = currentHR.filter(
      (p) => p.timestamp >= startTimestamp && p.timestamp <= endTime
    );

    const maxHR = sessionHR.reduce((max, p) => Math.max(max, p.value), 0);
    if (maxHR > peakHR) {
      setPeakHR(maxHR);
    }

    // Calculate recovery HR 60s after exercise ends
    if (exerciseEndTimestamp && recoveryHR === null) {
      const targetTime = exerciseEndTimestamp + 60000;
      const now = Date.now();

      if (now >= targetTime) {
        const recoveryPoint = findClosestHR(currentHR, targetTime);
        if (recoveryPoint) {
          setRecoveryHR(recoveryPoint.value);
        }
      }
    }
  }, [
    currentHR,
    isMonitoring,
    startTimestamp,
    exerciseEndTimestamp,
    peakHR,
    recoveryHR,
  ]);

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

  const handleToggleExerciseEnd = () => {
    if (!exerciseEndTimestamp) {
      setExerciseEndTimestamp(Date.now());
    } else {
      // Undo if pressed again
      setExerciseEndTimestamp(null);
      setRecoveryHR(null);
    }
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow max-w-4xl mx-auto mt-8">
      <h2 className="text-xl font-semibold mb-4 text-gray-800">
        Heart Rate Recovery (HRR)
      </h2>

      <div className="mt-2 space-y-2 text-gray-700">
        <p>
          📊 <strong>Avg Historical HR:</strong>{" "}
          {averageHistoricalHR.toFixed(2)} bpm
        </p>

        {isMonitoring ? (
          <>
            <button
              onClick={handleToggleExerciseEnd}
              className={`px-4 py-2 rounded-md text-white font-medium ${
                exerciseEndTimestamp ? "bg-red-600" : "bg-blue-600"
              }`}
            >
              {exerciseEndTimestamp ? "Undo End Exercise" : "End Exercise"}
            </button>

            <p>
              💓 <strong>Peak HR:</strong> {peakHR} bpm
            </p>

            {exerciseEndTimestamp &&
              (recoveryHR !== null ? (
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
                  ⏳ Waiting 60 seconds after end of exercise to calculate
                  recovery HR...
                </p>
              ))}
          </>
        ) : (
          <>
            <p className="text-sm text-gray-500 italic">
              Monitoring is inactive.
            </p>

            {(peakHR !== 0 || recoveryHR !== null) && (
              <div className="mt-4 space-y-2">
                <p>
                  💓 <strong>Last Peak HR:</strong> {peakHR} bpm
                </p>
                {recoveryHR !== null && (
                  <>
                    <p>
                      🧘 <strong>Last HR after 60s:</strong> {recoveryHR} bpm
                    </p>
                    <p>
                      🔻 <strong>Last HRR:</strong> {hrr?.toFixed(2)} bpm
                    </p>
                  </>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
