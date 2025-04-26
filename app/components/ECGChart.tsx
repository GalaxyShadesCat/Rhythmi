"use client";
import React, { useMemo } from "react";
import { Line } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
} from "chart.js";
import { ECGDataPoint } from "@/types/types";

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);

interface ECGChartProps {
  ecgData: ECGDataPoint[];
  visibleDataPoints?: number;
}

const ECGChart: React.FC<ECGChartProps> = ({
  ecgData,
  visibleDataPoints = 500,
}) => {
  // Log the data received for debugging
  // console.log(`ECGChart received ${ecgData.length} data points`);

  const formatTimestamp = (timestamp: number): string => {
    try {
      return new Date(timestamp).toISOString();
    } catch (error) {
      console.error("Invalid timestamp:", timestamp);
      console.error(error);
      return "Invalid Date";
    }
  };

  // Limit the number of points to display
  const visibleData = useMemo(() => {
    return ecgData.slice(-visibleDataPoints);
  }, [ecgData, visibleDataPoints]);

  // console.log(`Rendering chart with ${visibleData.length} visible points`);

  const ecgChartData = {
    labels: visibleData.map(
      (point, index) => formatTimestamp(point.timestamp) || index.toString()
    ),
    datasets: [
      {
        label: "ECG",
        data: visibleData.map((point) => point.value),
        borderColor: "rgb(75, 192, 192)",
        backgroundColor: "rgba(75, 192, 192, 0.5)",
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    plugins: {
      legend: {
        position: "top" as const,
      },
      title: {
        display: true,
        text: "ECG Data",
      },
    },
    scales: {
      x: {
        type: "category" as const,
        title: {
          display: true,
          text: "Time",
        },
      },
      y: {
        title: {
          display: true,
          text: "ECG Value (µV)",
        },
      },
    },
  };

  return (
    <div style={{ width: "100%", maxWidth: "800px" }}>
      <Line options={chartOptions} data={ecgChartData} />
    </div>
  );
};

export default ECGChart;
