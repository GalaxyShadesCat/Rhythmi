// components/Calibration.tsx
"use client";

import { useState, useEffect } from "react";
import { ECGDataPoint } from "@/hooks/useHeartRateSensor";

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

  useEffect(() => {
    let interval: NodeJS.Timeout;
    
    if (isCalibrating) {
      // Reset calibration data when starting
      setCalibrationData([]);
      setCalibrationStartTime(Date.now());
      
      interval = setInterval(() => {
        const now = Date.now();
        setCalibrationDuration(Math.floor((now - (calibrationStartTime || now)) / 1000));
        
        // Collect all ECG data since calibration started
        if (calibrationStartTime) {
          const newData = ecgData.filter(point => 
            point.timestamp >= calibrationStartTime
          );
          setCalibrationData(newData);
        }
      }, 1000);
    }
    
    return () => clearInterval(interval);
  }, [isCalibrating, calibrationStartTime, ecgData]);

  const startCalibration = () => {
    setIsCalibrating(true);
  };

  const stopCalibration = () => {
    setIsCalibrating(false);
    
    if (calibrationData.length > 0) {
      onSaveCalibration(calibrationData);
      alert(`Saved calibration with ${calibrationData.length} data points`);
    }
    
    setCalibrationDuration(0);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const instructions = [
    "In order for accurate calibration of baseline ECG, please collect atleast 5 minutes of resting ECG sample.",
  ];

  return (
    <div className="bg-white p-6 rounded-lg shadow max-w-4xl mx-auto mt-8">
      <h2 className={`text-xl font-semibold mb-4 ${!isCalibrating ? "text-black" : ""}`}>
        ECG Calibration
      </h2>
      <div className="flex justify-between items-center mb-4">
        <button
          onClick={() => setShowInstructions(!showInstructions)}
          className="w-6 h-6 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center hover:bg-blue-200 transition-colors"
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
            isCalibrating 
              ? "bg-red-500 hover:bg-red-600" 
              : "bg-blue-500 hover:bg-blue-600"
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

      <div className="bg-gray-100 p-4 rounded">
        <p className={`font-medium mb-2 ${!isCalibrating ? "text-black" : ""}`}>
          Calibration Status:
        </p>
        <ul className="list-disc pl-5 space-y-1">
        <li className={isCalibrating ? "text-green-600" : "text-red-600"}>
            {isCalibrating ? "Active" : "Inactive"}
        </li>
        <li className="text-black">{calibrationDuration}</li>
        <li className="text-black">{calibrationStartTime}</li>
        </ul>
      </div>
    </div>
  );
}