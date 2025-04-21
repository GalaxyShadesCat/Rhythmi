// components/Calibration.tsx
"use client";

import { useState, useEffect } from "react";
import { ECGDataPoint } from "@/hooks/useHeartRateSensor";

type QualityRating = "excellent" | "good" | "fair" | "poor";

interface CalibrationProps {
  ecgData: ECGDataPoint[];
  onSaveCalibration: (sample: ECGDataPoint[]) => void;
}

export default function Calibration({ ecgData, onSaveCalibration }: CalibrationProps) {
  const [isCalibrating, setIsCalibrating] = useState(false);
  const [calibrationStartTime, setCalibrationStartTime] = useState<number | null>(null);
  const [calibrationDuration, setCalibrationDuration] = useState(0);
  const [calibrationData, setCalibrationData] = useState<ECGDataPoint[]>([]);
  const [showInstructions, setShowInstructions] = useState(false);
  const [qualityRating, setQualityRating] = useState<QualityRating | null>(null);

  const calculateSignalQuality = (data: ECGDataPoint[]): QualityRating => {
    const values = data.map(point => point.value);
    if (values.length === 0) return "poor";

    // Calculate standard deviation
    const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
    const squaredDiffs = values.map(val => Math.pow(val - mean, 2));
    const variance = squaredDiffs.reduce((sum, val) => sum + val, 0) / values.length;
    const standardDeviation = Math.sqrt(variance);

    if (standardDeviation < 0.1) return "excellent";
    if (standardDeviation < 0.2) return "good";
    if (standardDeviation < 0.5) return "fair";
    return "poor";
  };

  useEffect(() => {
    let interval: NodeJS.Timeout;
    
    if (isCalibrating) {
      setCalibrationData([]);
      setCalibrationStartTime(Date.now());
      setQualityRating(null);
      
      interval = setInterval(() => {
        const now = Date.now();
        setCalibrationDuration(Math.floor((now - (calibrationStartTime || now)) / 1000));
        
        if (calibrationStartTime) {
          const newData = ecgData.filter(point => point.timestamp >= calibrationStartTime);
          setCalibrationData(newData);
        }
      }, 1000);
    }
    
    return () => clearInterval(interval);
  }, [isCalibrating, calibrationStartTime, ecgData]);

  const startCalibration = () => setIsCalibrating(true);

  const stopCalibration = () => {
    setIsCalibrating(false);
    if (calibrationData.length > 0) {
      const rating = calculateSignalQuality(calibrationData);
      setQualityRating(rating);
      onSaveCalibration(calibrationData);
    }
    setCalibrationDuration(0);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const getQualityColor = (rating: QualityRating) => {
    switch (rating) {
      case "excellent": return "bg-green-100 text-green-800";
      case "good": return "bg-blue-100 text-blue-800";
      case "fair": return "bg-yellow-100 text-yellow-800";
      case "poor": return "bg-red-100 text-red-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  const instructions = [
    "Collect at least 5 minutes of resting ECG data for calibration",
    "Remain still and avoid movement during calibration",
    "Ensure good electrode contact with skin",
    "Trying adding some water to region of contact for better conductivity",
  ];

  return (
    <div className="bg-white p-6 rounded-lg shadow max-w-4xl mx-auto mt-8">
      <h2 className="text-xl font-semibold mb-4 text-gray-800">
        ECG Calibration
      </h2>
      
      <div className="flex justify-between items-center mb-4">
        <button
          onClick={() => setShowInstructions(!showInstructions)}
          className="w-6 h-6 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center hover:bg-blue-200"
          aria-label="Show instructions"
        >
          i
        </button>
      </div>

      {showInstructions && (
        <div className="mb-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
          <h3 className="font-medium text-blue-800 mb-2">Instructions:</h3>
          <ul className="list-disc pl-5 space-y-1 text-sm text-blue-700">
            {instructions.map((item, index) => (
              <li key={index}>{item}</li>
            ))}
          </ul>
        </div>
      )}

      <div className="flex items-center justify-between mb-4">
        <button
          onClick={isCalibrating ? stopCalibration : startCalibration}
          className={`px-6 py-2 rounded-full text-white font-medium ${
            isCalibrating ? "bg-red-500 hover:bg-red-600" : "bg-blue-500 hover:bg-blue-600"
          }`}
        >
          {isCalibrating ? "Stop Calibration" : "Start Calibration"}
        </button>
      </div>

      {isCalibrating && (
        <div className="flex items-center gap-4 mb-4">
          <div className={`text-2xl font-bold ${
            calibrationDuration >= 300 ? "text-green-600" : "text-red-600"
          }`}>
            {formatTime(calibrationDuration)}
          </div>
          <div className="text-gray-600">
            {calibrationDuration >= 300 ? (
              "✅ 5 minutes collected - ready for calibration"
            ) : (
              "⏳ Collecting resting ECG data..."
            )}
          </div>
        </div>
      )}

      <div className="bg-gray-100 p-4 rounded-lg mb-4">
        <h3 className="font-medium text-gray-800 mb-2">Status</h3>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-sm text-gray-600">State</p>
            <p className={isCalibrating ? "text-green-600 font-medium" : "text-red-600 font-medium"}>
              {isCalibrating ? "Active" : "Inactive"}
            </p>
          </div>
          <div>
            <p className="text-sm text-gray-600">Data Points</p>
            <p>{calibrationData.length}</p>
          </div>
        </div>
      </div>

      {qualityRating && !isCalibrating && (
        <div className={`p-4 rounded-lg ${getQualityColor(qualityRating)}`}>
          <h3 className="font-medium mb-1">Signal Quality</h3>
          <p className="text-lg font-semibold">
            {qualityRating.charAt(0).toUpperCase() + qualityRating.slice(1)}
          </p>
          <p className="text-sm mt-1">
            {qualityRating === "excellent" && "Perfect signal quality - ready for use"}
            {qualityRating === "good" && "Good signal quality - suitable for use"}
            {qualityRating === "fair" && "Moderate signal quality - consider recalibrating"}
            {qualityRating === "poor" && "Poor signal quality - check connections and recalibrate"}
          </p>
        </div>
      )}
    </div>
  );
}