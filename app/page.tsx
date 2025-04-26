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
  Fab,
  Slide,
} from "@mui/material";
import FavoriteBorderIcon from "@mui/icons-material/FavoriteBorder";
import LogoutIcon from "@mui/icons-material/Logout";
import UploadIcon from "@mui/icons-material/Upload";
import ArticleIcon from "@mui/icons-material/Article";
import PersonIcon from "@mui/icons-material/Person";
import ChatIcon from "@mui/icons-material/Chat";

import { useHeartRateSensor } from "@/hooks/useHeartRateSensor";
import {
  ActivitySegment,
  ECGDataPoint,
  HRDataPoint,
  RecordData,
} from "@/types/types";
import HeartRateMonitor from "@/components/HeartRateMonitor";
import UploadButton from "@/components/UploadButton";
import ActivitySegmentEditor from "@/components/ActivitySegmentEditor";
import HeartRateRecovery from "@/components/HeartRateRecovery";
import ECGCalibration from "@/components/ECGCalibration";
import ECGAnalysis from "@/components/ECGAnalysis";
import ECGChartPanel from "@/components/ECGChartPanel";
import TestModePanel from "@/components/TestModePanel";
import Login from "@/components/Login";
import HealthChatbot from "@/components/HealthChatbot";
import useTestMode from "@/hooks/useTestMode";
import useLocalStorage from "@/hooks/useLocalStorage";
import FetchHistory from "@/components/FetchHistory";
import Profile from "@/components/Profile";

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
    return null;
    // return {
    //   user_id: user._id,
    //   datetime: new Date().toISOString(),
    //   ecg: ecgHistory,
    //   hr: hrHistory,
    //   rest_metrics: undefined,
    //   exercise_metrics: undefined,
    //   recovery_metrics: undefined,
    //   activity_segments: activitySegments,
    // };
  }, [user, ecgHistory, hrHistory, activitySegments, restECG, restHR]);

  const [openChat, setOpenChat] = useState(false);

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
          <Box>
            <Typography variant="h6" mt={3}></Typography>
            <FetchHistory user_name={user.user_name} />
          </Box>
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
            <Profile />;
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

      {/* Floating Chat Button */}
      <Fab
        color="primary"
        onClick={() => setOpenChat((prev) => !prev)}
        sx={{
          position: "fixed",
          bottom: 80,
          right: 16,
          bgcolor: "#7B61FF",
          "&:hover": { bgcolor: "#6249db" },
        }}
      >
        <ChatIcon />
      </Fab>

      <Slide direction="up" in={openChat} mountOnEnter>
        <Box
          sx={{
            position: "fixed",
            zIndex: 1300,
            bgcolor: "#fff",
            display: "flex",
            flexDirection: "column",
            boxShadow: 6,
            borderRadius: { xs: 0, sm: 2 },
            overflow: "hidden",
            top: { xs: 0, sm: "auto" },
            left: { xs: 0, sm: "auto" },
            right: { xs: 0, sm: 24 },
            bottom: { xs: 0, sm: 150 },
            width: { xs: "100%", sm: 400 },
            height: { xs: "100%", sm: 550 },
          }}
        >
          <HealthChatbot user={user} setOpenChat={setOpenChat} />
        </Box>
      </Slide>
    </Box>
  );
}
