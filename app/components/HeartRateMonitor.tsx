"use client";
import React, { useEffect } from "react";
import {
  Typography,
  Button,
  Stack,
  Alert,
  Box,
  Card,
  CardContent,
} from "@mui/material";

interface MonitorControlsProps {
  isConnected: boolean;
  isECGStreaming: boolean;
  connect: () => Promise<void>;
  disconnect: () => void;
  startECGStream: () => Promise<void>;
  stopECGStream: () => void;
  error: string | null;
  heartRate: number | null;
}

const HeartRateMonitor: React.FC<MonitorControlsProps> = ({
  isConnected,
  isECGStreaming,
  connect,
  disconnect,
  startECGStream,
  stopECGStream,
  error,
  heartRate,
}) => {
  // Auto-start ECG stream when connected
  useEffect(() => {
    let timer: NodeJS.Timeout | null = null;
    if (isConnected && !isECGStreaming) {
      timer = setTimeout(() => {
        startECGStream();
      }, 2000); // 2 second = 2000 ms
    }
    return () => {
      if (timer) clearTimeout(timer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isConnected]);

  // Not connected: Show Connect button
  if (!isConnected) {
    return (
      <Box display="flex" justifyContent="center" width="100%">
        <Button
          onClick={connect}
          variant="contained"
          color="primary"
          fullWidth
          size="large"
          sx={{
            borderRadius: "999px",
            fontWeight: 600,
            fontSize: "1rem",
            backgroundColor: "#0080FF",
            color: "#fff",
            boxShadow: "none",
            mx: "auto",
            my: 2,
            width: "100%",
            maxWidth: 400,
            "&:hover": {
              backgroundColor: "#0070e0",
              boxShadow: "none",
            },
          }}
        >
          Connect to Polar H10
        </Button>
      </Box>
    );
  }

  // Connected: Show heart rate, disconnect, stop stream
  return (
    <Box maxWidth={480} mx="auto" mt={2}>
      <Card>
        <CardContent>
          <Stack spacing={3}>
            {error && (
              <Alert severity="error" variant="outlined">
                <Typography fontWeight="bold">Error</Typography>
                <Typography variant="body2">{error}</Typography>
              </Alert>
            )}
            <Box
              bgcolor="grey.100"
              borderRadius={2}
              p={2}
              display="flex"
              alignItems="center"
              justifyContent="space-between"
            >
              <Typography variant="subtitle1" fontWeight={600}>
                Heart Rate:
              </Typography>
              <Typography variant="h4" color="primary" fontWeight="bold">
                {heartRate ? `${heartRate} BPM` : "Waiting..."}
              </Typography>
            </Box>
            <Stack direction="row" spacing={2}>
              <Button
                onClick={disconnect}
                variant="contained"
                color="error"
                fullWidth
                sx={{
                  borderRadius: "999px",
                  fontWeight: 600,
                  boxShadow: "none",
                }}
              >
                Disconnect
              </Button>
              {/* <Button
                onClick={stopECGStream}
                variant="contained"
                color="warning"
                fullWidth
                disabled={!isECGStreaming}
                sx={{
                  borderRadius: "999px",
                  fontWeight: 600,
                  boxShadow: "none",
                }}
              >
                Stop ECG Stream
              </Button> */}
            </Stack>
          </Stack>
        </CardContent>
      </Card>
    </Box>
  );
};

export default HeartRateMonitor;
