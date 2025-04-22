"use client";
import React, { useMemo, useState } from "react";
import {
  AppBar,
  Toolbar,
  IconButton,
  BottomNavigation,
  BottomNavigationAction,
  Box,
  Paper,
  Typography,
} from "@mui/material";
import FavoriteBorderIcon from "@mui/icons-material/FavoriteBorder";
import LogoutIcon from "@mui/icons-material/Logout";
import UploadIcon from "@mui/icons-material/Upload";
import ArticleIcon from "@mui/icons-material/Article";
import PersonIcon from "@mui/icons-material/Person";

import {
  ECGDataPoint,
  HRDataPoint,
  useHeartRateSensor,
} from "@/hooks/useHeartRateSensor";
import { ActivitySegment, RecordData } from "@/hooks/useMongoDB";
import HeartRateMonitor from "@/components/HeartRateMonitor";
import UploadButton from "@/components/UploadButton";
import ActivitySegmentEditor from "@/components/ActivitySegmentEditor";
import HeartRateRecovery from "@/components/HeartRateRecovery";
import ECGCalibration from "@/components/ECGCalibration";
import ECGAnalysis from "@/components/ECGAnalysis";
import ECGChartPanel from "@/components/ECGChartPanel";
import TestModePanel from "@/components/TestModePanel";
import Login from "@/components/Login";
import useTestMode from "@/hooks/useTestMode";
import useLocalStorage from "@/hooks/useLocalStorage";

export default function Home() {
  const { user, saveUser, clearUser } = useLocalStorage();
  const [navIndex, setNavIndex] = useState(0);
  const [activitySegments, setActivitySegments] = useState<ActivitySegment[]>(
    []
  );
  const [restECG, setRestECG] = useState<ECGDataPoint[]>([]);
  const [restHR, setRestHR] = useState<HRDataPoint[]>([]);

  const {
    connect,
    disconnect,
    startECGStream,
    stopECGStream,
    currentHR,
    hrHistory,
    currentECG,
    ecgHistory,
    error,
    isConnected,
    isECGStreaming,
  } = useHeartRateSensor();

  const {
    isTestMode,
    isChartPaused,
    toggleTestMode,
    togglePauseChart,
    displayEcgData,
  } = useTestMode(currentECG);

  const record: RecordData | null = useMemo(() => {
    if (!user || !user._id || ecgHistory.length === 0) return null;
    return {
      user_id: user._id,
      datetime: new Date().toISOString(),
      ecg: ecgHistory,
      hr: hrHistory,
      activity_segments: activitySegments,
      rest_ecg: restECG,
      rest_hr: restHR,
    };
  }, [user, ecgHistory, hrHistory, activitySegments, restECG, restHR]);

  // Show login if not logged in
  if (!user) {
    return <Login user={user} saveUser={saveUser} clearUser={clearUser} />;
  }

  // Content based on selected tab
  const renderContent = () => {
    switch (navIndex) {
      // Records tab
      case 0:
        return (
          <Typography variant="h6" mt={3}>
            Records Placeholder
          </Typography>
        );
      // New Record tab
      case 1:
        return (
          <Box>
            <HeartRateMonitor
              isConnected={isConnected}
              isECGStreaming={isECGStreaming}
              connect={connect}
              disconnect={disconnect}
              startECGStream={startECGStream}
              stopECGStream={stopECGStream}
              error={error}
              heartRate={currentHR}
            />

            <TestModePanel
              isTestMode={isTestMode}
              onToggleTestMode={toggleTestMode}
            />

            {(isECGStreaming || isTestMode) && (
              <>
                <ECGChartPanel
                  ecgData={displayEcgData}
                  isPaused={isChartPaused}
                  onTogglePause={togglePauseChart}
                />
                <ECGAnalysis
                  ecgData={currentECG}
                  currentHR={currentHR}
                  restHR={restHR}
                />
              </>
            )}

            <Box className="max-w-4xl mx-auto mt-6">
              <UploadButton record={record} />
            </Box>

            <HeartRateRecovery
              isConnected={isConnected}
              hrHistory={hrHistory}
            />

            <ECGCalibration
              isECGStreaming={isECGStreaming}
              ecgData={ecgHistory}
              heartRateData={hrHistory}
              onRestECGUpdate={setRestECG}
              onRestHeartRateUpdate={setRestHR}
            />

            <ActivitySegmentEditor
              ecgData={ecgHistory}
              segments={activitySegments}
              setSegments={setActivitySegments}
            />
          </Box>
        );
      // Profile tab
      case 2:
        return (
          <Typography variant="h6" mt={3}>
            Profile Placeholder
          </Typography>
        );
      default:
        return null;
    }
  };

  return (
    <Box sx={{ pb: 9 }}>
      {/* App Bar */}
      <AppBar position="static" color="transparent" elevation={0}>
        <Toolbar sx={{ justifyContent: "space-between" }}>
          <IconButton edge="start" color="inherit">
            <FavoriteBorderIcon />
          </IconButton>
          <IconButton edge="end" color="inherit" onClick={clearUser}>
            <LogoutIcon />
          </IconButton>
        </Toolbar>
      </AppBar>

      {/* Main Content */}
      <Box sx={{ px: 2, pt: 1 }}>{renderContent()}</Box>

      {/* Bottom Navigation */}
      <Paper
        sx={{
          position: "fixed",
          bottom: 0,
          left: 0,
          right: 0,
          borderTop: "1px solid #ccc",
        }}
        elevation={3}
      >
        <BottomNavigation
          showLabels
          value={navIndex}
          onChange={(e, newValue) => setNavIndex(newValue)}
        >
          <BottomNavigationAction label="Records" icon={<ArticleIcon />} />
          <BottomNavigationAction label="New Record" icon={<UploadIcon />} />
          <BottomNavigationAction label="Profile" icon={<PersonIcon />} />
        </BottomNavigation>
      </Paper>
    </Box>
  );
}
