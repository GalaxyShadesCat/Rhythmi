import React, { useState, useRef, useEffect, useMemo } from "react";
import {
  Box,
  Button,
  Card,
  CardContent,
  Typography,
  LinearProgress,
  Stack,
  Alert,
  Table,
  TableHead,
  TableBody,
  TableCell,
  TableRow,
  Chip,
} from "@mui/material";
import UploadIcon from "@mui/icons-material/Upload";
import PlayArrowIcon from "@mui/icons-material/PlayArrow";
import DirectionsRunIcon from "@mui/icons-material/DirectionsRun";
import RestoreIcon from "@mui/icons-material/Restore";
import {
  ActivitySegment,
  ECGDataPoint,
  HRDataPoint,
  ActivityType,
  RecordData,
  User,
  ECGMetrics,
  PHASE_COLORS,
} from "@/types/types";
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
import { useECGMetrics } from "@/hooks/useECGMetrics";
import { getDataForSegment } from "../utils/phaseData";
import { useMongoDB } from "../hooks/useMongoDB";
import ECGChart from "./ECGChart";
import useSignalQuality from "@/hooks/useSignalQuality";
import { TextField } from "@mui/material";
import HRPhaseChart from "./HRPhaseChart";

// --- Constants and Helpers ---

const PHASES: ActivityType[] = ["rest", "exercise", "recovery"];
const PHASE_LABELS: Record<ActivityType, string> = {
  rest: "Rest",
  exercise: "Exercise",
  recovery: "Recovery",
};
const PHASE_ICONS: Record<ActivityType, JSX.Element> = {
  rest: <RestoreIcon />,
  exercise: <DirectionsRunIcon />,
  recovery: <RestoreIcon />,
};
const PHASE_MINIMUM_DURATIONS = {
  rest: 10 * 1000, // 10 seconds for testing (was 3 minutes)
  exercise: 15 * 1000, // 15 seconds for testing (was 6 minutes)
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

const getPhaseColor = (phase: ActivityType) => {
  if (phase === "rest") return "primary";
  if (phase === "exercise") return "success";
  return "error";
};

function calculateStatsForSegment(
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

const formatMs = (ms: number) => {
  const min = Math.floor(ms / 60000);
  const sec = Math.floor((ms % 60000) / 1000);
  return `${min}:${sec.toString().padStart(2, "0")}`;
};

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

const HRRTable: React.FC<{
  hrrPoints: { time: number; hr: number | null; hrr: number | null }[];
}> = ({ hrrPoints }) => (
  <div style={{ margin: "16px 0" }}>
    <Typography variant="subtitle1" gutterBottom>
      Heart Rate Recovery Table
    </Typography>
    <Table size="small">
      <TableHead>
        <TableRow>
          <TableCell>Time (s)</TableCell>
          <TableCell>HR (bpm)</TableCell>
          <TableCell>HRR (Δ bpm)</TableCell>
        </TableRow>
      </TableHead>
      <TableBody>
        {hrrPoints.map(({ time, hr, hrr }, i) => (
          <TableRow key={i}>
            <TableCell>{time}</TableCell>
            <TableCell>{hr ?? "--"}</TableCell>
            <TableCell>{hrr ?? "--"}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  </div>
);

// --- RecordSummaryCard ---
interface RecordSummaryCardProps {
  segmentStats: (ActivitySegment & {
    stats: ReturnType<typeof calculateStatsForSegment>;
    metrics?: ECGMetrics | null;
    signalQuality?: string;
  })[];
  baseHR: number | string;
  peakHR: number | string;
}
const RecordSummaryCard: React.FC<RecordSummaryCardProps> = ({
  segmentStats,
  baseHR,
  peakHR,
}) => (
  <Card sx={{ mt: 2, mb: 2 }}>
    <CardContent>
      <Typography variant="h6" mb={2}>
        Session Summary
      </Typography>
      <Box display="flex" gap={4} mb={2} flexWrap="wrap">
        <Typography variant="subtitle1">
          <b>Base HR:</b> {baseHR} bpm
        </Typography>
        <Typography variant="subtitle1">
          <b>Peak HR:</b> {peakHR} bpm
        </Typography>
      </Box>
      <Stack spacing={2}>
        {segmentStats.map((seg, i) =>
          seg.metrics ? (
            <Box
              key={i}
              sx={{
                bgcolor: PHASE_COLORS[seg.type] + "55",
                borderRadius: 2,
                p: 2,
                mb: 1,
              }}
            >
              <Box
                display="flex"
                alignItems="center"
                justifyContent="space-between"
                mb={1}
              >
                <Typography variant="subtitle2" fontWeight={600}>
                  {PHASE_LABELS[seg.type] || seg.type}
                </Typography>
                {seg.signalQuality && (
                  <Chip
                    label={`Signal Quality: ${seg.signalQuality}`}
                    color={
                      seg.signalQuality === "excellent"
                        ? "success"
                        : seg.signalQuality === "good"
                        ? "info"
                        : seg.signalQuality === "fair"
                        ? "warning"
                        : "error"
                    }
                    size="small"
                  />
                )}
              </Box>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div>
                  <span className="text-gray-500">Avg HR:</span>{" "}
                  <span className="font-medium">
                    {Math.round(seg.metrics.avgHeartRate)} bpm
                  </span>
                </div>
                <div>
                  <span className="text-gray-500">Min HR:</span>{" "}
                  <span className="font-medium">
                    {Math.round(seg.metrics.minHeartRate)} bpm
                  </span>
                </div>
                <div>
                  <span className="text-gray-500">Max HR:</span>{" "}
                  <span className="font-medium">
                    {Math.round(seg.metrics.maxHeartRate)} bpm
                  </span>
                </div>
                <div>
                  <span className="text-gray-500">HRV:</span>{" "}
                  <span className="font-medium">
                    {Math.round(seg.metrics.heartRateVariability)} ms
                  </span>
                </div>
                <div>
                  <span className="text-gray-500">Total Beats:</span>{" "}
                  <span className="font-medium">{seg.metrics.totalBeats}</span>
                </div>
                <div>
                  <span className="text-gray-500">Duration:</span>{" "}
                  <span className="font-medium">
                    {Math.round(seg.metrics.duration / 1000)} s
                  </span>
                </div>
              </div>
            </Box>
          ) : (
            <Typography
              key={i}
              variant="body2"
              color="textSecondary"
              sx={{ mb: 1 }}
            >
              No data for {PHASE_LABELS[seg.type] || seg.type}
            </Typography>
          )
        )}
      </Stack>
    </CardContent>
  </Card>
);

// --- PhaseControlCard ---
interface PhaseControlCardProps {
  currentPhase: ActivityType;
  phaseIdx: number;
  phaseStart: number | null;
  timer: number;
  onStartPhase: () => void;
  onNextPhase: () => void;
  isSessionDone: boolean;
  onUpload?: () => void;
  uploading: boolean;
  onAddNewRecord?: () => void;
  uploadSuccess?: boolean;
  canUpload: boolean;
  signalQuality?: string;
  canAdvancePhase: boolean;
}
const PhaseControlCard: React.FC<PhaseControlCardProps> = ({
  currentPhase,
  phaseIdx,
  phaseStart,
  timer,
  onStartPhase,
  onNextPhase,
  isSessionDone,
  onUpload,
  uploading,
  onAddNewRecord,
  uploadSuccess,
  canUpload,
  signalQuality,
  canAdvancePhase,
}) => {
  if (isSessionDone) {
    // After recovery finished, show Upload or Add New Record
    return (
      <Card sx={{ mb: 2 }}>
        <CardContent>
          <Box display="flex" alignItems="center" mb={1}>
            <UploadIcon />
            <Typography variant="h6" ml={1}>
              Ready to Upload
            </Typography>
            {/* {signalQuality && (
              <Chip
                label={`Signal Quality: ${signalQuality}`}
                color={
                  signalQuality === "excellent"
                    ? "success"
                    : signalQuality === "good"
                    ? "info"
                    : signalQuality === "fair"
                    ? "warning"
                    : "error"
                }
                sx={{ ml: 2 }}
              />
            )} */}
          </Box>
          <Typography variant="body2" color="text.secondary" mb={2}>
            Upload your data to MongoDB.
          </Typography>
          <Button
            variant="contained"
            color="primary"
            // startIcon={<UploadIcon />}
            onClick={uploadSuccess ? onAddNewRecord : onUpload}
            size="large"
            disabled={uploading || (!uploadSuccess && !canUpload)}
            sx={{ minWidth: 180 }}
          >
            {uploadSuccess
              ? "Add New Record"
              : uploading
              ? "Uploading..."
              : "Send Your Data to MongoDB"}
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card sx={{ mb: 2 }}>
      <CardContent>
        <Box display="flex" alignItems="center" mb={1}>
          {PHASE_ICONS[currentPhase]}
          <Typography variant="h6" ml={1}>
            {PHASE_LABELS[currentPhase]} Phase
          </Typography>
        </Box>
        <Typography variant="body2" color="text.secondary">
          {currentPhase === "rest" &&
            "Sit and relax for at least 3 minutes. Press next to continue to exercise when ready."}
          {currentPhase === "exercise" &&
            "Please exercise (e.g. brisk walk) for at least 6 minutes. Press next to continue to recovery when ready."}
          {currentPhase === "recovery" &&
            "Rest until your heart rate returns to your resting value, then finish."}
        </Typography>
        <Stack direction="row" alignItems="center" spacing={2} mt={2}>
          <Typography variant="h4" color={getPhaseColor(currentPhase)}>
            {formatMs(timer)}
          </Typography>
          {PHASE_MINIMUM_DURATIONS[currentPhase] > 0 && (
            <Box width="100px">
              <LinearProgress
                variant="determinate"
                value={Math.min(
                  (timer / PHASE_MINIMUM_DURATIONS[currentPhase]) * 100,
                  100
                )}
              />
            </Box>
          )}
          {!phaseStart ? (
            <Button
              variant="contained"
              color={getPhaseColor(currentPhase)}
              startIcon={<PlayArrowIcon />}
              onClick={onStartPhase}
              size="large"
              sx={{ minWidth: 120 }}
            >
              {`Start ${PHASE_LABELS[currentPhase]}`}
            </Button>
          ) : (
            <Button
              variant="contained"
              color={getPhaseColor(currentPhase)}
              onClick={onNextPhase}
              disabled={!canAdvancePhase}
              sx={{ minWidth: 120 }}
            >
              {phaseIdx < PHASES.length - 1
                ? `Next: ${PHASE_LABELS[PHASES[phaseIdx + 1]]}`
                : "Finish Recovery"}
            </Button>
          )}
        </Stack>
        {phaseStart &&
          !canAdvancePhase &&
          (currentPhase === "rest" || currentPhase === "exercise") && (
            <Typography
              variant="caption"
              color="text.secondary"
              sx={{ display: "block", mt: 1 }}
            >
              {/* Minimum {currentPhase === "rest" ? "3" : "6"} minutes required
              before advancing */}
            </Typography>
          )}
      </CardContent>
    </Card>
  );
};

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
  const [exerciseEnd, setExerciseEnd] = useState<number | null>(null);
  const [recoveryEnd, setRecoveryEnd] = useState<number | null>(null);
  const [activitySegments, setActivitySegments] = useState<ActivitySegment[]>(
    []
  );
  const [timer, setTimer] = useState(0);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const [isSessionDone, setIsSessionDone] = useState(false);
  const [phaseStartHistory, setPhaseStartHistory] = useState<number[]>([]);
  const { uploadRecord, loading, error, success } = useMongoDB();
  const [hasUploaded, setHasUploaded] = useState(false);
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

  const restMetrics = useECGMetrics(restECG);
  const exerciseMetrics = useECGMetrics(exerciseECG);
  const recoveryMetrics = useECGMetrics(recoveryECG);
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
      setHasUploaded(true);
    }
  };

  const handleAddNewRecord = () => {
    setPhaseIdx(0);
    setPhaseStart(null);
    setExerciseEnd(null);
    setTimer(0);
    setActivitySegments([]);
    setIsSessionDone(false);
    setPhaseStartHistory([]);
    setHasUploaded(false);
    setRecoveryEnd(null);
    setNotes("");
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
    setPhaseStartHistory((prev) => (prev.length === 0 ? [now] : prev));
    if (currentPhase === "recovery") setExerciseEnd(null);
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
    if (currentPhase === "exercise") setExerciseEnd(Date.now());

    if (phaseIdx < PHASES.length - 1) {
      setPhaseIdx(phaseIdx + 1);
      setPhaseStart(Date.now());
      setTimer(0);
    } else {
      setPhaseStart(null);
      setTimer(0);
      setIsSessionDone(true); // Mark done on finish!
      setRecoveryEnd(Date.now());
    }
  };

  // Calculate signal quality based on all ECG data from the entire session
  const signalQuality = useMemo(() => {
    if (!isSessionDone || activitySegments.length === 0) return undefined;

    // Get all ECG data from all segments
    const allECG = activitySegments.reduce((acc, segment) => {
      const segmentData = getDataForSegment(ecgHistory, segment);
      return [...acc, ...segmentData];
    }, [] as ECGDataPoint[]);

    // Calculate overall signal quality
    return calculateSignalQuality(allECG);
  }, [isSessionDone, activitySegments, ecgHistory, calculateSignalQuality]);

  // Only when connected and streaming
  if (!isConnected || !isECGStreaming) return null;

  const firstPhaseStart = phaseStartHistory[0] || null;
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
        signalQuality={signalQuality}
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
              placeholder="Enter any notes about this session (e.g. 'Jogging at 6km/h', 'Drank coffee 30 mins before', 'Felt tired')"
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
      {hrrPoints.length > 0 && <HRRTable hrrPoints={hrrPoints} />}

      <ECGChart ecgData={ecgHistory}></ECGChart>
      {record && <HRPhaseChart record={record} />}
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
