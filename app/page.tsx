"use client";
import {
  ECGDataPoint,
  HRDataPoint,
  useHeartRateSensor,
} from "@/hooks/useHeartRateSensor";
import HeartRateMonitor from "@/components/HeartRateMonitor";
import UploadButton from "@/components/UploadButton";
import { ActivitySegment, RecordData } from "@/hooks/useMongoDB";
import UserPanel from "@/components/UserPanel";
import useLocalStorage from "@/hooks/useLocalStorage";
import { useMemo, useState } from "react";
import ActivitySegmentEditor from "@/components/ActivitySegmentEditor";
import HRRDisplay from "@/components/HRRDisplay";
import ECGCalibration from "@/app/components/ECGCalibration";
import useTestMode from "@/hooks/useTestMode";
import ECGAnalysis from "@/components/ECGAnalysis";
import ECGChartPanel from "@/components/ECGChartPanel";
import TestModePanel from "@/components/TestModePanel";

export default function Home() {
  const {
    connect,
    disconnect,
    startECGStream,
    stopECGStream,
    currentHR,
    hrHistory,
    currentECG,
    ecgHistory,
    error,
    isConnected,
    isECGStreaming,
  } = useHeartRateSensor();

  const { user, saveUser, clearUser } = useLocalStorage();
  const [activitySegments, setActivitySegments] = useState<ActivitySegment[]>(
    []
  );
  const [restECG, setRestECG] = useState<ECGDataPoint[]>([]);
  const [restHR, setRestHR] = useState<HRDataPoint[]>([]);
  const {
    isTestMode,
    isChartPaused,
    toggleTestMode,
    togglePauseChart,
    displayEcgData,
  } = useTestMode(currentECG);

  const record: RecordData | null = useMemo(() => {
    if (!user || !user._id || ecgHistory.length === 0) return null;

    return {
      user_id: user._id,
      datetime: new Date().toISOString(),
      ecg: ecgHistory,
      hr: hrHistory,
      activity_segments: activitySegments,
      rest_ecg: restECG,
      rest_hr: restHR,
    };
  }, [user, ecgHistory, hrHistory, activitySegments, restECG, restHR]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-100 to-teal-100 p-8 text-black">
      <UserPanel user={user} saveUser={saveUser} clearUser={clearUser} />
      <HeartRateMonitor
        isConnected={isConnected}
        isECGStreaming={isECGStreaming}
        connect={connect}
        disconnect={disconnect}
        startECGStream={startECGStream}
        stopECGStream={stopECGStream}
        error={error}
        heartRate={currentHR}
      />

      <TestModePanel
        isTestMode={isTestMode}
        onToggleTestMode={toggleTestMode}
      />

      {(isECGStreaming || isTestMode) && (
        <>
          <ECGChartPanel
            ecgData={displayEcgData}
            isPaused={isChartPaused}
            onTogglePause={togglePauseChart}
          />
          <ECGAnalysis
            ecgData={currentECG}
            currentHR={currentHR}
            restHR={restHR}
          />
        </>
      )}

      <div className="max-w-4xl mx-auto mt-6">
        <UploadButton record={record} />
      </div>

      <HRRDisplay isConnected={isConnected} hrHistory={hrHistory} />

      <ECGCalibration
        isECGStreaming={isECGStreaming}
        ecgData={ecgHistory}
        heartRateData={hrHistory}
        onRestECGUpdate={setRestECG}
        onRestHeartRateUpdate={setRestHR}
      />

      <ActivitySegmentEditor
        ecgData={ecgHistory}
        segments={activitySegments}
        setSegments={setActivitySegments}
      />
    </div>
  );
}
