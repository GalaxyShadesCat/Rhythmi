"use client"
import React from 'react';
import { Line } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend } from 'chart.js';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend);

interface ECGDataPoint {
  timestamp: number;
  value: number;
}

interface ECGChartProps {
  ecgData: ECGDataPoint[];
}      

const ECGChart: React.FC<ECGChartProps> = ({ ecgData }) => {
  const formatTimestamp = (timestamp: number): string => {
    try {
      return new Date(timestamp).toISOString();
    } catch (error) {
      console.error('Invalid timestamp:', timestamp);
      console.error(error);
      return 'Invalid Date';
    }
  };

  const ecgChartData = {
    labels: ecgData.slice(-5000).map((point, index) => formatTimestamp(point.timestamp) || index.toString()),
    datasets: [
      {
        label: 'ECG',
        data: ecgData.slice(-5000).map(point => point.value),
        borderColor: 'rgb(75, 192, 192)',
        backgroundColor: 'rgba(75, 192, 192, 0.5)',
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    plugins: {
      legend: {
        position: 'top' as const,
      },
      title: {
        display: true,
        text: 'ECG Data',
      },
    },
    scales: {
      x: {
        type: 'category' as const,
        title: {
          display: true,
          text: 'Time',
        },
      },
      y: {
        title: {
          display: true,
          text: 'ECG Value (µV)',
        },
      },
    },
  };

  return (
    <div style={{ width: '100%', maxWidth: '800px' }}>
      <Line options={chartOptions} data={ecgChartData} />
    </div>
  );
};

export default ECGChart;
