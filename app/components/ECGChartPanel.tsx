"use client";
import React from "react";
import ECGChart from "./ECGChart";
import { ECGDataPoint } from "@/hooks/useHeartRateSensor";

interface ECGChartPanelProps {
  ecgData: ECGDataPoint[];
  isPaused: boolean;
  onTogglePause: () => void;
  visibleDataPoints?: number;
}

const ECGChartPanel: React.FC<ECGChartPanelProps> = ({
  ecgData,
  isPaused,
  onTogglePause,
  visibleDataPoints = 1000,
}) => {
  return (
    <div className="max-w-4xl mx-auto mt-8 bg-white p-4 rounded-lg shadow-inner">
      <div className="flex justify-between items-center mb-2">
        <h3 className="text-lg font-semibold">ECG Chart</h3>
        <div className="flex items-center gap-3">
          {isPaused && (
            <span className="text-amber-600 font-medium animate-pulse bg-amber-50 px-3 py-1 rounded-full border border-amber-200">
              Visualization Frozen
            </span>
          )}
          <button
            onClick={onTogglePause}
            className={`px-4 py-2 rounded text-white transition ${
              isPaused
                ? "bg-green-600 hover:bg-green-700"
                : "bg-yellow-600 hover:bg-yellow-700"
            }`}
          >
            {isPaused ? "Resume" : "Freeze"} Visualization
          </button>
        </div>
      </div>
      <ECGChart ecgData={ecgData} visibleDataPoints={visibleDataPoints} />
    </div>
  );
};

export default ECGChartPanel;
