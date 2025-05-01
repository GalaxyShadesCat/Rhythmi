import React, { useState, useRef, useEffect, useMemo } from "react";
import {
  Box,
  Button,
  Card,
  CardContent,
  Typography,
  Stack,
  Alert,
  TextField,
} from "@mui/material";
import DirectionsRunIcon from "@mui/icons-material/DirectionsRun";
import RestoreIcon from "@mui/icons-material/Restore";
import {
  Chart,
  LineController,
  LineElement,
  PointElement,
  LinearScale,
  CategoryScale,
  Tooltip,
  Legend,
  Filler,
} from "chart.js";
import {
  ActivitySegment,
  ECGDataPoint,
  HRDataPoint,
  ActivityType,
  RecordData,
  User,
} from "@/types/types";
import ECGChart from "@/components/ECGChart";
import HRPhasesChart from "@/components/HRPhasesChart";
import HRRChart from "@/components/HRRChart";
import RecordSummaryCard from "@/components/RecordSummaryCard";
import PhaseControlCard from "@/components/PhaseControlCard";
import useECGMetrics from "@/hooks/useECGMetrics";
import useSignalQuality from "@/hooks/useSignalQuality";
import { useMongoDB } from "@/hooks/useMongoDB";

// --- Constants and Helpers ---
export const PHASES: ActivityType[] = ["rest", "exercise", "recovery"];
export const PHASE_LABELS: Record<ActivityType, string> = {
  rest: "Rest",
  exercise: "Exercise",
  recovery: "Recovery",
};
export const PHASE_ICONS: Record<ActivityType, JSX.Element> = {
  rest: <RestoreIcon />,
  exercise: <DirectionsRunIcon />,
  recovery: <RestoreIcon />,
};
export const PHASE_MINIMUM_DURATIONS = {
  rest: 10 * 1000, // 10 seconds for testing (was 3 minutes)
  exercise: 10 * 1000, // 10 seconds for testing (was 6 minutes)
  recovery: 0,
};

Chart.register(
  LineController,
  LineElement,
  PointElement,
  LinearScale,
  CategoryScale,
  Tooltip,
  Legend,
  Filler
);

export function calculateStatsForSegment(
  hrHistory: HRDataPoint[],
  segment: ActivitySegment
) {
  const points = hrHistory.filter(
    (p) => p.timestamp >= segment.start && p.timestamp <= segment.end
  );
  if (!points.length) return null;
  const values = points.map((p) => p.value);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const mean = Math.round(values.reduce((a, b) => a + b, 0) / values.length);
  return { min, max, mean, count: values.length };
}

// Util: Get HR at or just after a certain timestamp
function getHRAtOrAfter(
  hrData: HRDataPoint[],
  timestamp: number
): number | null {
  const next = hrData.find((p) => p.timestamp >= timestamp);
  return next ? next.value : null;
}

// Calculate HRR points every 30s, up to e.g. 2 mins
function getRecoveryHRR(
  hrData: HRDataPoint[],
  exerciseSegment: ActivitySegment | undefined,
  recoverySegment: ActivitySegment | undefined,
  intervalMs = 30000,
  maxPoints = 5 // For 0s, 30s, 60s, 90s, 120s
): { time: number; hr: number | null; hrr: number | null }[] {
  if (!exerciseSegment || !recoverySegment) return [];

  // Find peak HR during exercise
  const exercisePoints = hrData.filter(
    (p) =>
      p.timestamp >= exerciseSegment.start && p.timestamp <= exerciseSegment.end
  );
  const peakHR = exercisePoints.length
    ? Math.max(...exercisePoints.map((p) => p.value))
    : null;

  // Collect HR at each 30s mark in recovery
  const points: { time: number; hr: number | null; hrr: number | null }[] = [];
  for (let i = 0; i < maxPoints; i++) {
    const t = recoverySegment.start + i * intervalMs;
    if (t > recoverySegment.end) break;
    const hr = getHRAtOrAfter(hrData, t);
    points.push({
      time: i * 30, // seconds
      hr,
      hrr: peakHR !== null && hr !== null ? peakHR - hr : null,
    });
  }
  return points;
}
function getDataForSegment<T extends { timestamp: number }>(
  dataPoints: T[],
  segment: ActivitySegment
): T[] {
  return dataPoints.filter(
    (pt) => pt.timestamp >= segment.start && pt.timestamp <= segment.end
  );
}

// --- Main Component ---
interface NewRecordProps {
  isConnected: boolean;
  isECGStreaming: boolean;
  ecgHistory: ECGDataPoint[];
  hrHistory: HRDataPoint[];
  user: User;
}

const NewRecord: React.FC<NewRecordProps> = ({
  isConnected,
  isECGStreaming,
  ecgHistory,
  hrHistory,
  user,
}) => {
  const [phaseIdx, setPhaseIdx] = useState(0);
  const [phaseStart, setPhaseStart] = useState<number | null>(null);
  const [activitySegments, setActivitySegments] = useState<ActivitySegment[]>(
    []
  );
  const [timer, setTimer] = useState(0);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const [isSessionDone, setIsSessionDone] = useState(false);
  const { uploadRecord, loading, error, success, setError, setSuccess } =
    useMongoDB();
  const { calculateSignalQuality } = useSignalQuality();
  const [notes, setNotes] = useState("");

  const currentPhase = PHASES[phaseIdx];
  const restSegment = activitySegments.find((s) => s.type === "rest");
  const exerciseSegment = activitySegments.find((s) => s.type === "exercise");
  const recoverySegment = activitySegments.find((s) => s.type === "recovery");

  const restECG = useMemo(
    () => (restSegment ? getDataForSegment(ecgHistory, restSegment) : []),
    [ecgHistory, restSegment]
  );
  const exerciseECG = useMemo(
    () =>
      exerciseSegment ? getDataForSegment(ecgHistory, exerciseSegment) : [],
    [ecgHistory, exerciseSegment]
  );
  const recoveryECG = useMemo(
    () =>
      recoverySegment ? getDataForSegment(ecgHistory, recoverySegment) : [],
    [ecgHistory, recoverySegment]
  );

  const restHR = useMemo(
    () => (restSegment ? getDataForSegment(hrHistory, restSegment) : []),
    [hrHistory, restSegment]
  );
  const exerciseHR = useMemo(
    () =>
      exerciseSegment ? getDataForSegment(hrHistory, exerciseSegment) : [],
    [hrHistory, exerciseSegment]
  );
  const recoveryHR = useMemo(
    () =>
      recoverySegment ? getDataForSegment(hrHistory, recoverySegment) : [],
    [hrHistory, recoverySegment]
  );

  const restMetrics = useECGMetrics(restECG, restHR);
  const exerciseMetrics = useECGMetrics(exerciseECG, exerciseHR);
  const recoveryMetrics = useECGMetrics(recoveryECG, recoveryHR);
  const hrrPoints = useMemo(
    () => getRecoveryHRR(hrHistory, exerciseSegment, recoverySegment),
    [hrHistory, exerciseSegment, recoverySegment]
  );

  const baseHR = useMemo(() => {
    if (!restSegment) return "--";
    const restPoints = hrHistory.filter(
      (p) => p.timestamp >= restSegment.start && p.timestamp <= restSegment.end
    );
    if (!restPoints.length) return "--";
    const avg = Math.round(
      restPoints.reduce((sum, p) => sum + p.value, 0) / restPoints.length
    );
    return avg;
  }, [hrHistory, restSegment]);

  const peakHR = useMemo(() => {
    if (!exerciseSegment) return "--";
    const exercisePoints = hrHistory.filter(
      (p) =>
        p.timestamp >= exerciseSegment.start &&
        p.timestamp <= exerciseSegment.end
    );
    if (!exercisePoints.length) return "--";
    return Math.max(...exercisePoints.map((p) => p.value));
  }, [hrHistory, exerciseSegment]);

  const record: RecordData | null = useMemo(() => {
    if (
      !user ||
      !user._id ||
      ecgHistory.length === 0 ||
      !restMetrics ||
      !exerciseMetrics ||
      !recoveryMetrics ||
      activitySegments.length === 0
    )
      return null;

    const overallStart =
      activitySegments.length > 0
        ? Math.min(...activitySegments.map((seg) => seg.start))
        : null;
    const overallEnd =
      activitySegments.length > 0
        ? Math.max(...activitySegments.map((seg) => seg.end))
        : null;
    const relevantECG =
      overallStart !== null && overallEnd !== null
        ? ecgHistory.filter(
            (d) => d.timestamp >= overallStart && d.timestamp <= overallEnd
          )
        : [];

    const relevantHR =
      overallStart !== null && overallEnd !== null
        ? hrHistory.filter(
            (d) => d.timestamp >= overallStart && d.timestamp <= overallEnd
          )
        : [];
    return {
      user_id: user._id,
      datetime: new Date().toISOString(),
      ecg: relevantECG,
      hr: relevantHR,
      rest_metrics: restMetrics,
      exercise_metrics: exerciseMetrics,
      recovery_metrics: recoveryMetrics,
      activity_segments: activitySegments,
      hrr_points: hrrPoints,
      notes: notes, // Add this line
    };
  }, [
    user,
    ecgHistory,
    hrHistory,
    activitySegments,
    restMetrics,
    exerciseMetrics,
    recoveryMetrics,
    hrrPoints,
    notes,
  ]);

  const handleUpload = () => {
    if (record) {
      uploadRecord(record);
    }
  };

  const handleAddNewRecord = () => {
    setPhaseIdx(0);
    setPhaseStart(null);
    setTimer(0);
    setActivitySegments([]);
    setIsSessionDone(false);
    setNotes("");
    setError(null);
    setSuccess(false);
  };

  const segmentStats = useMemo(
    () =>
      activitySegments.map((seg) => {
        let metrics = null;
        if (seg.type === "rest") metrics = restMetrics;
        if (seg.type === "exercise") metrics = exerciseMetrics;
        if (seg.type === "recovery") metrics = recoveryMetrics;

        // Calculate signal quality for this segment
        const segmentData = getDataForSegment(ecgHistory, seg);
        const signalQuality =
          segmentData.length > 0
            ? calculateSignalQuality(segmentData)
            : undefined;

        return {
          ...seg,
          stats: calculateStatsForSegment(hrHistory, seg),
          metrics,
          signalQuality,
        };
      }),
    [
      activitySegments,
      hrHistory,
      restMetrics,
      exerciseMetrics,
      recoveryMetrics,
      ecgHistory,
      calculateSignalQuality,
    ]
  );

  // Determine if enough time has passed to advance to next phase
  const canAdvancePhase = useMemo(() => {
    if (!phaseStart) return false;

    if (currentPhase === "rest" || currentPhase === "exercise") {
      return timer >= PHASE_MINIMUM_DURATIONS[currentPhase];
    }

    // Recovery phase can always be advanced
    return true;
  }, [currentPhase, phaseStart, timer]);

  // Timer logic
  useEffect(() => {
    if (phaseStart) {
      timerRef.current = setInterval(
        () => setTimer(Date.now() - phaseStart),
        1000
      );
    } else {
      setTimer(0);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [phaseStart]);

  // Auto-advance for rest/exercise has been removed to ensure manual progression only

  // Phase Handlers
  const handleStartPhase = () => {
    const now = Date.now();
    setPhaseStart(now);
  };
  const handleNextPhase = () => {
    if (phaseStart) {
      let segmentStart = phaseStart;
      const segmentEnd = Date.now();

      // If the current phase is "rest", remove the first 10 seconds
      if (currentPhase === "rest") {
        // Only adjust if the rest phase lasted more than 10 seconds
        if (segmentEnd - segmentStart > 10000) {
          segmentStart += 10000;
        } else {
          // If less than 10 seconds, skip saving
          return;
        }
      }

      setActivitySegments([
        ...activitySegments,
        { type: currentPhase, start: segmentStart, end: segmentEnd },
      ]);
    }

    if (phaseIdx < PHASES.length - 1) {
      setPhaseIdx(phaseIdx + 1);
      setPhaseStart(Date.now());
      setTimer(0);
    } else {
      setPhaseStart(null);
      setTimer(0);
      setIsSessionDone(true); // Mark done on finish!
    }
  };

  // Only when connected and streaming
  if (!isConnected || !isECGStreaming) return null;
  const allDone = isSessionDone;

  return (
    <Box p={2} maxWidth={800} mx="auto">
      {/* All phase control, upload, add new record handled in PhaseControlCard */}
      <PhaseControlCard
        currentPhase={currentPhase}
        phaseIdx={phaseIdx}
        phaseStart={phaseStart}
        timer={timer}
        onStartPhase={handleStartPhase}
        onNextPhase={handleNextPhase}
        isSessionDone={allDone}
        onUpload={handleUpload}
        uploading={loading}
        onAddNewRecord={handleAddNewRecord}
        uploadSuccess={success}
        canUpload={!!record}
        canAdvancePhase={canAdvancePhase}
      />

      {error && (
        <Stack spacing={2} mt={2}>
          <Alert severity="error">{error}</Alert>
        </Stack>
      )}
      {success && (
        <Stack spacing={2} mt={2}>
          <Alert severity="success">Upload successful!</Alert>
        </Stack>
      )}

      {isSessionDone && (
        <Card sx={{ mb: 2 }}>
          <CardContent>
            <Typography variant="h6" mb={2}>
              Session Notes
            </Typography>
            <TextField
              fullWidth
              multiline
              rows={3}
              variant="outlined"
              placeholder="Add notes about this session"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </CardContent>
        </Card>
      )}

      <RecordSummaryCard
        segmentStats={segmentStats}
        baseHR={baseHR}
        peakHR={peakHR}
      />
      {hrrPoints.length > 0 && <HRRChart hrrPoints={hrrPoints} />}

      <ECGChart ecgData={ecgHistory}></ECGChart>
      {record && <HRPhasesChart record={record} />}
      <Box display="flex" justifyContent="center" mt={4} mb={2}>
        <Button
          variant="outlined"
          color="secondary"
          onClick={handleAddNewRecord}
          size="large"
          sx={{ minWidth: 180 }}
        >
          Reset
        </Button>
      </Box>
    </Box>
  );
};

export default NewRecord;
