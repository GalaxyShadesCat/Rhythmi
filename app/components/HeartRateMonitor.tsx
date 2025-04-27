"use client";
import React, { useEffect, useState } from "react";
import {
  Typography,
  Button,
  Stack,
  Alert,
  Box,
  Card,
  CardContent,
  CircularProgress,
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
  const [isConnecting, setIsConnecting] = useState(false);
  const [isStartingStream, setIsStartingStream] = useState(false);
  
  // Safe connect function with error handling
  const handleConnect = async () => {
    try {
      setIsConnecting(true);
      await connect();
    } catch (err) {
      console.error("Connection error in HeartRateMonitor:", err);
    } finally {
      setIsConnecting(false);
    }
  };
  
  // Safe start ECG function with error handling
  const handleStartECG = async () => {
    try {
      setIsStartingStream(true);
      await startECGStream();
    } catch (err) {
      console.error("ECG Stream error in HeartRateMonitor:", err);
    } finally {
      setIsStartingStream(false);
    }
  };

  // Auto-start ECG stream when connected
  useEffect(() => {
    let timer: NodeJS.Timeout | null = null;
    if (isConnected && !isECGStreaming && !isStartingStream) {
      timer = setTimeout(() => {
        handleStartECG();
      }, 1000); // Reduced to 1 second delay
    }
    return () => {
      if (timer) clearTimeout(timer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isConnected, isECGStreaming]);

  // Not connected: Show Connect button
  if (!isConnected) {
    return (
      <Box display="flex" flexDirection="column" alignItems="center" width="100%">
        <Button
          onClick={handleConnect}
          variant="contained"
          color="primary"
          fullWidth
          size="large"
          disabled={isConnecting}
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
          {isConnecting ? (
            <>
              <CircularProgress size={20} color="inherit" sx={{ mr: 1 }} />
              Connecting...
            </>
          ) : (
            "Connect to Polar H10"
          )}
        </Button>
        {error && (
          <Alert severity="error" variant="outlined" sx={{ mb: 2, width: "100%", maxWidth: 400 }}>
            <Typography fontWeight="bold">Connection Error</Typography>
            <Typography variant="body2">{error}</Typography>
          </Alert>
        )}
      </Box>
    );
  }

  // Connected: Show heart rate and disconnect button
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
                {heartRate ? `${heartRate} BPM` : isStartingStream ? "Starting..." : "Waiting..."}
              </Typography>
            </Box>
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
          </Stack>
        </CardContent>
      </Card>
    </Box>
  );
};

export default HeartRateMonitor;
