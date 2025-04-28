"use client";
import React, { useState } from "react";
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
import HeartRateMonitor from "@/components/HeartRateMonitor";
import Login from "@/components/Login";
import HealthChatbot from "@/components/HealthChatbot";
import useLocalStorage from "@/hooks/useLocalStorage";
import FetchHistory from "@/components/FetchHistory";
import Profile from "@/components/Profile";
import NewRecord from "@/app/components/NewRecord";
import { RecordData } from "@/types/types";

// App theme colors
const PRIMARY_BLUE = "#0080FF";
const HOVER_BLUE = "#0070e0";

export default function Home() {
  const { user, saveUser, clearUser } = useLocalStorage();
  const [navIndex, setNavIndex] = useState(0);
  const [openChat, setOpenChat] = useState(false);
  const [records, setRecords] = useState<RecordData[]>([]);
  const [chatRecord, setChatRecord] = useState<RecordData | null>(null);

  // --------------------------------------------------------
  // SIMULATION MODE - Comment out this block before deployment
  // --------------------------------------------------------
  /*
  const [simulationMode, setSimulationMode] = useState(false);
  const handleSimulationToggle = (event: React.ChangeEvent<HTMLInputElement>) => {
    const enabled = event.target.checked;
    setSimulationMode(enabled);
    toggleSimulation(enabled);
  };
  
  const simulationUI = (
    <Box sx={{ display: 'flex', justifyContent: 'center', mt: 2, mb: 2 }}>
      <FormControlLabel
        control={
          <Switch
            checked={simulationMode}
            onChange={handleSimulationToggle}
            color="primary"
          />
        }
        label={
          <Typography variant="body2">
            {simulationMode ? "Simulation Mode (ON)" : "Simulation Mode (OFF)"}
          </Typography>
        }
      />
    </Box>
  );
  */
  // Set to false for production
  const simulationMode = false;
  const simulationUI = null;
  // --------------------------------------------------------
  // END SIMULATION MODE
  // --------------------------------------------------------

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
    isSimulated,
    setSimulationMode: toggleSimulation,
  } = useHeartRateSensor(simulationMode);

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
            <FetchHistory
              user_name={user.user_name}
              records={records}
              setRecords={setRecords}
              chatRecord={chatRecord}
              setChatRecord={setChatRecord}
              setOpenChat={setOpenChat}
            />
          </Box>
        );
      // New Record tab
      case 1:
        return (
          <Box>
            {/* Simulation mode toggle - enabled for development */}
            {simulationUI}

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

            {isConnected && (
              <NewRecord
                isConnected={isConnected}
                isECGStreaming={isECGStreaming}
                ecgHistory={ecgHistory}
                hrHistory={hrHistory}
                user={user}
              />
            )}

            {/* {isECGStreaming && (
              <>
                <ECGChart ecgData={displayEcgData} />
                <ECGAnalysis
                  ecgData={currentECG}
                  currentHR={currentHR}
                  restHR={restHR}
                />
              </>
            )} */}

            {/* <TestModePanel
              isTestMode={isTestMode}
              onToggleTestMode={toggleTestMode}
            />

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
            /> */}
          </Box>
        );
      // Profile tab
      case 2:
        return <Profile />;
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
          bgcolor: PRIMARY_BLUE,
          "&:hover": { bgcolor: HOVER_BLUE },
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
          <HealthChatbot
            user={user}
            setOpenChat={setOpenChat}
            selectedRecord={chatRecord}
            records={records}
          />
        </Box>
      </Slide>
    </Box>
  );
}
