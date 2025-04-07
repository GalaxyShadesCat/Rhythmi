"use client";
import { useHeartRateSensor } from "@/hooks/useHeartRateSensor";
import HeartRateMonitor from "@/components/HeartRateMonitor";
import ECGChart from "@/components/ECGChart";
import UploadButton from "@/components/UploadButton";
import { ActivitySegment, RecordData } from "@/hooks/useMongoDB";
import UserPanel from "@/components/UserPanel";
import { useLocalStorage } from "@/hooks/useLocalStorage";
import { useMemo, useState } from "react";
import { ECGDataPoint } from "@/hooks/useHeartRateSensor";
import ActivitySegmentEditor from "@/components/ActivitySegmentEditor";
import Calibration from "@/components/Calibration";

export default function Home() {
  const {
    connect,
    disconnect,
    startECGStream,
    stopECGStream,
    heartRate,
    heartRateData,
    ecgData,
    ecgHistory,
    error,
    isConnected,
    isECGStreaming,
  } = useHeartRateSensor();

  const { user, saveUser, clearUser } = useLocalStorage();
  const [activitySegments, setActivitySegments] = useState<ActivitySegment[]>([]);
  const [calibrationData, setCalibrationData] = useState<ECGDataPoint[]>([]);

  const record: RecordData | null = useMemo(() => {
    if (!user || !user._id || ecgHistory.length === 0) return null;

    return {
      user_id: user._id,
      datetime: new Date().toISOString(),
      ecg: ecgHistory,
      hr: heartRateData,
      activity_segments: activitySegments,
      calibration_data: calibrationData,
    };
  }, [user, ecgHistory, heartRateData, activitySegments, calibrationData]);

  const handleSaveCalibration = (sample: ECGDataPoint[]) => {
    setCalibrationData(sample);
  };


  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-100 to-teal-100 p-8">
      <UserPanel user={user} saveUser={saveUser} clearUser={clearUser} />
      
      <HeartRateMonitor
        isConnected={isConnected}
        isECGStreaming={isECGStreaming}
        connect={connect}
        disconnect={disconnect}
        startECGStream={startECGStream}
        stopECGStream={stopECGStream}
        error={error}
        heartRate={heartRate}
      />

      {isECGStreaming && (
        <>
          <div className="max-w-4xl mx-auto mt-8 bg-white p-4 rounded-lg shadow-inner">
            <ECGChart ecgData={ecgData} />
          </div>

          <Calibration 
            ecgData={ecgHistory}
            onSaveCalibration={handleSaveCalibration}
          />

          <ActivitySegmentEditor
            ecgData={ecgHistory}
            segments={activitySegments}
            setSegments={setActivitySegments}
          />
        </>
      )}

      <div className="max-w-4xl mx-auto mt-6">
        <UploadButton record={record} />
      </div>
    </div>
  );
}