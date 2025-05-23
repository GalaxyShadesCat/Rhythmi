import {
  Chart as ChartJS,
  LineElement,
  PointElement,
  LinearScale,
  CategoryScale,
  TimeScale,
  Tooltip,
  Legend,
  Filler,
} from "chart.js";
import { Line } from "react-chartjs-2";
import annotationPlugin from "chartjs-plugin-annotation";
import { RecordData, PHASE_COLORS } from "@/types/types";

ChartJS.register(
  LineElement,
  PointElement,
  LinearScale,
  CategoryScale,
  TimeScale,
  Tooltip,
  Legend,
  Filler,
  annotationPlugin
);

// Define props
type HRPhasesChartProps = {
  record: RecordData;
};

export default function HRPhasesChart({ record }: HRPhasesChartProps) {
  const hrData = record.hr; // Get heart rate data

  const labels = hrData.map((dp) => dp.timestamp); // Get timestamps
  const values = hrData.map((dp) => dp.value); // Get heart rate values

  // Find the min/max timestamp for x domain
  const minTime = labels[0];
  const maxTime = labels[labels.length - 1];

  // Build segment boundaries for background color regions
  // We'll use the annotation plugin to add background boxes
  const backgroundAnnotations = record.activity_segments.map((seg) => ({
    type: "box",
    xMin: seg.start,
    xMax: seg.end,
    backgroundColor: PHASE_COLORS[seg.type] + "22", // transparent
    borderWidth: 0,
    yScaleID: "y",
    z: -1,
    label: {
      display: false,
    },
  }));

  // HR graph data handling
  const data = {
    labels,
    datasets: [
      {
        label: "Heart Rate",
        data: values,
        borderColor: "#2563eb",
        backgroundColor: "rgba(59,130,246,0.12)",
        fill: false,
        pointRadius: 0,
        tension: 0.2,
      },
    ],
  };

  // HR graph configurations
  const options = {
    responsive: true,
    plugins: {
      legend: { display: false },
      tooltip: {
        callbacks: {
          label: (ctx: any) => `HR: ${ctx.parsed.y} bpm`,
        },
      },
      annotation: {
        annotations: backgroundAnnotations,
      },
    },
    scales: {
      x: {
        type: "linear",
        title: { display: true, text: "Time (seconds)" },
        min: minTime,
        max: maxTime,
        ticks: {
          callback: (val: number | string) => {
            if (typeof val === "number") {
              // Convert ms to seconds for display
              return Math.round((val - minTime) / 1000) + "s";
            }
            return val;
          },
        },
      },
      y: {
        title: { display: true, text: "Heart Rate (bpm)" },
      },
    },
  };

  return (
    <div className="w-full">
      <h4 className="font-medium text-gray-800 mb-2">Heart Rate</h4>
      <Line data={data} options={options as any} />
      <div className="flex gap-4 mt-2">
        {Object.entries(PHASE_COLORS).map(([phase, color]) => (
          <div key={phase} className="flex items-center gap-1 text-xs">
            <span
              className="inline-block w-3 h-3 rounded"
              style={{ background: color }}
            />
            {phase.charAt(0).toUpperCase() + phase.slice(1)}
          </div>
        ))}
      </div>
    </div>
  );
}
