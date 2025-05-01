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
} from "@mui/material";
import FavoriteBorderIcon from "@mui/icons-material/FavoriteBorder";
import LogoutIcon from "@mui/icons-material/Logout";
import UploadIcon from "@mui/icons-material/Upload";
import ArticleIcon from "@mui/icons-material/Article";
import PersonIcon from "@mui/icons-material/Person";

import { useHeartRateSensor } from "@/hooks/useHeartRateSensor";
import HeartRateMonitor from "@/components/HeartRateMonitor";
import Login from "@/components/Login";
import HealthChatbot from "@/components/HealthChatbot";
import useLocalStorage from "@/hooks/useLocalStorage";
import FetchHistory from "@/components/FetchHistory";
import Profile from "@/components/Profile";
import NewRecord from "@/app/components/NewRecord";
import { RecordData } from "@/types/types";

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
    ecgHistory,
    error,
    isConnected,
    isECGStreaming,
  } = useHeartRateSensor(simulationMode);

  // Show login if not logged in
  if (!user) {
    return <Login user={user} saveUser={saveUser} clearUser={clearUser} />;
  }

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
      <Box sx={{ px: 2, pt: 1 }}>
        {/* Records Tab */}
        <div style={{ display: navIndex === 0 ? "block" : "none" }}>
          <Typography variant="h6" mt={3}></Typography>
          <FetchHistory
            user_name={user.user_name}
            records={records}
            setRecords={setRecords}
            setChatRecord={setChatRecord}
            setOpenChat={setOpenChat}
          />
        </div>

        {/* New Record Tab */}
        <div style={{ display: navIndex === 1 ? "block" : "none" }}>
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
        </div>

        {/* Profile Tab */}
        <div style={{ display: navIndex === 2 ? "block" : "none" }}>
          <Profile />
        </div>
      </Box>

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

      {/* Floating Action Button for Chatbot */}
      <HealthChatbot
        user={user}
        openChat={openChat}
        setOpenChat={setOpenChat}
        chatRecord={chatRecord}
        records={records}
      />
    </Box>
  );
}
