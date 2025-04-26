import { useECGAnalysis } from "@/hooks/useECGAnalysis";
import { ECGDataPoint, HRDataPoint } from "@/types/types";

function ECGAnalysis({
  ecgData,
  currentHR,
  restHR,
}: {
  ecgData: ECGDataPoint[];
  currentHR: number | null;
  restHR: HRDataPoint[];
}) {
  const ecgMetrics = useECGAnalysis(ecgData, currentHR ?? 0, restHR);

  const formatTime = (timestamp: number | null): string => {
    if (timestamp === null) return "Not set";
    return new Date(timestamp).toLocaleTimeString();
  };

  const formatRecoveryTime = (ms: number | null): string => {
    if (ms === null) return "Not completed";
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}m ${remainingSeconds}s`;
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow max-w-4xl mx-auto mt-8">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <h3 className="text-lg font-semibold mb-2">ECG Analysis</h3>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span>Heart Rate:</span>
              <span className="font-medium">{ecgMetrics.heartRate} BPM</span>
            </div>
            <div className="flex justify-between">
              <span>Heart Rate Variability:</span>
              <span className="font-medium">
                {ecgMetrics.heartRateVariability.toFixed(2)} ms
              </span>
            </div>
            <div className="flex justify-between">
              <span>R-Peaks Detected:</span>
              <span className="font-medium">{ecgMetrics.rPeaks.length}</span>
            </div>
          </div>
        </div>

        {ecgMetrics.baselineTime !== null && (
          <div>
            <h3 className="text-lg font-semibold mb-2">
              Heart Rate Recovery Tracking
            </h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span>Baseline HR:</span>
                <span className="font-medium">
                  {ecgMetrics.baselineHeartRate} BPM
                </span>
              </div>
              <div className="flex justify-between">
                <span>Baseline Time:</span>
                <span className="font-medium">
                  {formatTime(ecgMetrics.baselineTime)}
                </span>
              </div>

              {ecgMetrics.exerciseStartTime !== null && (
                <>
                  <div className="flex justify-between">
                    <span>Exercise Start:</span>
                    <span className="font-medium">
                      {formatTime(ecgMetrics.exerciseStartTime)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Peak HR:</span>
                    <span className="font-medium">
                      {ecgMetrics.peakHeartRate} BPM
                    </span>
                  </div>
                  {ecgMetrics.peakHeartRateTime && (
                    <div className="flex justify-between">
                      <span>Peak HR Time:</span>
                      <span className="font-medium">
                        {formatTime(ecgMetrics.peakHeartRateTime)}
                      </span>
                    </div>
                  )}
                </>
              )}

              {ecgMetrics.recoveryStartTime !== null && (
                <>
                  <div className="flex justify-between">
                    <span>Recovery Start:</span>
                    <span className="font-medium">
                      {formatTime(ecgMetrics.recoveryStartTime)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Recovery Time:</span>
                    <span
                      className={`font-medium ${
                        ecgMetrics.recoveryStatus === "completed"
                          ? "text-green-600"
                          : "text-amber-600"
                      }`}
                    >
                      {formatRecoveryTime(ecgMetrics.recoveryTime)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Status:</span>
                    <span
                      className={`font-medium ${
                        ecgMetrics.recoveryStatus === "completed"
                          ? "text-green-600"
                          : ecgMetrics.recoveryStatus === "in-progress"
                          ? "text-amber-600"
                          : "text-gray-600"
                      }`}
                    >
                      {ecgMetrics.recoveryStatus === "completed"
                        ? "Completed"
                        : ecgMetrics.recoveryStatus === "in-progress"
                        ? "In Progress"
                        : "Not Started"}
                    </span>
                  </div>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default ECGAnalysis;
