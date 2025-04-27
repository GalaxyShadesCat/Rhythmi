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
  Filler,
} from "chart.js";
import { ECGDataPoint } from "@/types/types";

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
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
      const date = new Date(timestamp);
      return date.toLocaleTimeString('en-GB', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false
      });
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
      (point) => formatTimestamp(point.timestamp)
    ),
    datasets: [
      {
        label: "ECG",
        data: visibleData.map((point) => point.value),
        borderColor: "rgb(75, 192, 192)",
        backgroundColor: "rgba(75, 192, 192, 0.5)",
        pointRadius: 1.5,
        pointHoverRadius: 3,
        borderWidth: 1.5,
        tension: 0.1,
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: "top" as const,
      },
      title: {
        display: true,
        text: "ECG Data",
      },
      tooltip: {
        callbacks: {
          label: function(context: any) {
            return `Value: ${context.parsed.y} µV`;
          }
        }
      }
    },
    scales: {
      x: {
        type: "category" as const,
        title: {
          display: true,
          text: "Time",
        },
        ticks: {
          autoSkip: true,
          maxTicksLimit: 15
        }
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
    <div style={{ width: "100%", height: "300px", margin: "10px auto" }}>
      <Line options={chartOptions} data={ecgChartData} />
    </div>
  );
};

export default ECGChart;
