"use client";
import { Line } from "react-chartjs-2";
import { HRRPoint } from "@/types/types";

interface HRRChartProps {
  hrrPoints: HRRPoint[];
}

// HRR graph configurations
const hrrChartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: {
      position: "top" as const,
    },
    title: {
      display: true,
      text: "Heart Rate Recovery",
    },
  },
  scales: {
    x: {
      title: {
        display: true,
        text: "Time since recovery start (seconds)",
      },
    },
    y: {
      title: {
        display: true,
        text: "Value (bpm)",
      },
    },
  },
};

// HRR graph data handling
const formatHRRChartData = (hrrPoints: HRRPoint[]) => {
  return {
    labels: hrrPoints.map((point) => `${point.time}s`),
    datasets: [
      {
        label: "Heart Rate (bpm)",
        data: hrrPoints.map((point) => point.hr),
        borderColor: "rgb(255, 99, 132)",
        backgroundColor: "rgba(255, 99, 132, 0.5)",
        tension: 0.1,
      },
      {
        label: "HRR (bpm)",
        data: hrrPoints.map((point) => point.hrr),
        borderColor: "rgb(54, 162, 235)",
        backgroundColor: "rgba(54, 162, 235, 0.5)",
        tension: 0.1,
      },
    ],
  };
};

export default function HRRChart({ hrrPoints }: HRRChartProps) {
  if (!hrrPoints || hrrPoints.length === 0) return null;
  return (
    <div className="mt-4">
      <h4 className="font-medium text-gray-800 mb-2">Heart Rate Recovery</h4>
      <div className="h-64 w-full">
        <Line options={hrrChartOptions} data={formatHRRChartData(hrrPoints)} />
      </div>
    </div>
  );
}
