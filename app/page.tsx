"use client";
import { useHeartRateSensor } from "@/hooks/useHeartRateSensor";
import HeartRateMonitor from "@/components/HeartRateMonitor";
import ECGChart from "@/components/ECGChart";
import UploadButton from "@/components/UploadButton";
import { RecordData } from "@/hooks/useMongoDB";
import UserPanel from "@/components/UserPanel";
import { useLocalStorage } from "@/hooks/useLocalStorage";
import { useMemo } from "react";

export default function Home() {
  const {
    connect,
    disconnect,
    startECGStream,
    stopECGStream,
    heartRate,
    ecgData,
    ecgHistory,
    error,
    isConnected,
    isECGStreaming,
  } = useHeartRateSensor();

  const { user } = useLocalStorage();

  const record: RecordData | null = useMemo(() => {
    if (!user || !user._id || ecgHistory.length === 0) return null;

    return {
      user_id: user._id,
      datetime: new Date().toISOString(),
      ecg: ecgHistory,
      activity_segments: [],
    };
  }, [user, ecgHistory]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-100 to-teal-100 p-8">
      <UserPanel />
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
        <div className="max-w-4xl mx-auto mt-8 bg-white p-4 rounded-lg shadow-inner">
          <ECGChart ecgData={ecgData} />
        </div>
      )}

      <div className="max-w-4xl mx-auto mt-6">
        <UploadButton record={record} />
      </div>
    </div>
  );
}
