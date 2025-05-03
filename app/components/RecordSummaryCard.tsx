import React from "react";
import { Card, CardContent, Typography, Box, Stack, Chip } from "@mui/material";
import { ActivitySegment, ECGMetrics, PHASE_COLORS } from "@/types/types";
import { calculateStatsForSegment, PHASE_LABELS } from "@/components/NewRecord";

// Simple validation function
const formatValue = (value: number): string => {
  if (isNaN(value) || !isFinite(value) || value < 0) return "--";
  return Math.round(value).toString();
};

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
      {/* HR Stats */}
      <Box display="flex" gap={4} mb={2} flexWrap="wrap">
        <Typography variant="subtitle1">
          <b>Base HR:</b> {typeof baseHR === 'number' ? formatValue(baseHR) + " bpm" : baseHR}
        </Typography>
        <Typography variant="subtitle1">
          <b>Peak HR:</b> {typeof peakHR === 'number' ? formatValue(peakHR) + " bpm" : peakHR}
        </Typography>
      </Box>
      <Stack spacing={2}>
        {segmentStats.map((seg, i) =>
          seg.metrics ? (
            <Box
              key={i}
              sx={{
                bgcolor: `${PHASE_COLORS[seg.type]}55`,
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
                {/* Signal Quality */}
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
              <Box
                display="grid"
                gridTemplateColumns={{ xs: "1fr", sm: "1fr 1fr" }}
                gap={2}
                fontSize="0.96rem"
              >
                {/* Phase Metrics */}
                <Box>
                  <span style={{ color: "#6b7280" }}>Avg HR:</span>{" "}
                  <span style={{ fontWeight: 500 }}>
                    {formatValue(seg.metrics.avgHeartRate)} bpm
                  </span>
                </Box>
                <Box>
                  <span style={{ color: "#6b7280" }}>Min HR:</span>{" "}
                  <span style={{ fontWeight: 500 }}>
                    {formatValue(seg.metrics.minHeartRate)} bpm
                  </span>
                </Box>
                <Box>
                  <span style={{ color: "#6b7280" }}>Max HR:</span>{" "}
                  <span style={{ fontWeight: 500 }}>
                    {formatValue(seg.metrics.maxHeartRate)} bpm
                  </span>
                </Box>
                <Box>
                  <span style={{ color: "#6b7280" }}>HRV:</span>{" "}
                  <span style={{ fontWeight: 500 }}>
                    {formatValue(seg.metrics.heartRateVariability)} ms
                  </span>
                </Box>
                <Box>
                  <span style={{ color: "#6b7280" }}>Total Beats:</span>{" "}
                  <span style={{ fontWeight: 500 }}>
                    {formatValue(seg.metrics.totalBeats)}
                  </span>
                </Box>
                <Box>
                  <span style={{ color: "#6b7280" }}>Duration:</span>{" "}
                  <span style={{ fontWeight: 500 }}>
                    {formatValue(seg.metrics.duration / 1000)} s
                  </span>
                </Box>
              </Box>
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

export default RecordSummaryCard;
