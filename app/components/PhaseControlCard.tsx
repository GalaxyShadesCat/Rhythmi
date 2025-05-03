import React from "react";
import {
  Box,
  Button,
  Card,
  CardContent,
  Typography,
  LinearProgress,
  Stack,
} from "@mui/material";
import UploadIcon from "@mui/icons-material/Upload";
import PlayArrowIcon from "@mui/icons-material/PlayArrow";
import {
  PHASE_LABELS,
  PHASE_ICONS,
  PHASES,
  PHASE_MINIMUM_DURATIONS,
} from "@/components/NewRecord";
import { ActivityType } from "@/types/types";

// Function to determine color based on phase
const getPhaseColor = (phase: ActivityType) => {
  if (phase === "rest") return "primary";
  if (phase === "exercise") return "success";
  return "error";
};

// Function to reformat time
const formatMs = (ms: number) => {
  const min = Math.floor(ms / 60000);
  const sec = Math.floor((ms % 60000) / 1000);
  return `${min}:${sec.toString().padStart(2, "0")}`;
};

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
          </Box>
          <Typography variant="body2" color="text.secondary" mb={2}>
            Upload your data to MongoDB.
          </Typography>
          {/* Upload Button */}
          <Button
            variant="contained"
            color="primary"
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
        {/* Current Phase Display */}
        <Box display="flex" alignItems="center" mb={1}>
          {PHASE_ICONS[currentPhase]}
          <Typography variant="h6" ml={1}>
            {PHASE_LABELS[currentPhase]} Phase
          </Typography>
        </Box>
        {/* Instructions */}
        <Typography variant="body2" color="text.secondary">
          {currentPhase === "rest" &&
            "Sit and relax for at least 3 minutes. Press next to start 'exercise' phase when ready."}
          {currentPhase === "exercise" &&
            "Please exercise (e.g. brisk walk) for at least 6 minutes. Press next to start 'recovery' phase when ready."}
          {currentPhase === "recovery" &&
            "Rest until your heart rate returns to your resting value, then finish."}
        </Typography>
        {/* Timer */}
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
          {/* Switch Phase Button */}
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
      </CardContent>
    </Card>
  );
};

export default PhaseControlCard;
