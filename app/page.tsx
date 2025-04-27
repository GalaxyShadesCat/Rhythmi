"use client";
import React, { useMemo, useState, useEffect } from "react";
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
  Button,
  Card,
  CardContent,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from "@mui/material";
import FavoriteBorderIcon from "@mui/icons-material/FavoriteBorder";
import LogoutIcon from "@mui/icons-material/Logout";
import UploadIcon from "@mui/icons-material/Upload";
import ArticleIcon from "@mui/icons-material/Article";
import PersonIcon from "@mui/icons-material/Person";
import ChatIcon from "@mui/icons-material/Chat";
import DoneIcon from "@mui/icons-material/Done";
import SendIcon from "@mui/icons-material/Send";
import InfoIcon from "@mui/icons-material/Info";
import CloseIcon from "@mui/icons-material/Close";

import { useHeartRateSensor } from "@/hooks/useHeartRateSensor";
import HeartRateMonitor from "@/components/HeartRateMonitor";
import Login from "@/components/Login";
import HealthChatbot from "@/components/HealthChatbot";
import useLocalStorage from "@/hooks/useLocalStorage";
import FetchHistory from "@/components/FetchHistory";
import Profile from "@/components/Profile";
import NewRecord from "@/app/components/NewRecord";

export default function Home() {
  const { user, saveUser, clearUser } = useLocalStorage();
  const [navIndex, setNavIndex] = useState(0);

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

  const [openChat, setOpenChat] = useState(false);
  const [calibrationTime, setCalibrationTime] = useState(0);
  const [dataPoints, setDataPoints] = useState(0);
  const [isWorkoutActive, setIsWorkoutActive] = useState(false);
  const [peakHR, setPeakHR] = useState<number>(0);
  const [recoveryStartTime, setRecoveryStartTime] = useState<number | null>(null);
  const [recoveryHR, setRecoveryHR] = useState<number | null>(null);
  const [infoDialogOpen, setInfoDialogOpen] = useState(false);

  // Update calibration timer and data points when streaming
  useEffect(() => {
    let timerId: ReturnType<typeof setTimeout> | null = null;
    
    if (isECGStreaming) {
      timerId = setInterval(() => {
        setCalibrationTime(prev => prev + 1);
        // Assume approximately 5 data points per second for a realistic count
        setDataPoints(prev => prev + 5);
      }, 1000);
    } else {
      setCalibrationTime(0);
      setDataPoints(0);
    }
    
    return () => {
      if (timerId) clearInterval(timerId);
    };
  }, [isECGStreaming]);

  // Update peak HR during workout
  useEffect(() => {
    if (isWorkoutActive && currentHR) {
      setPeakHR(prev => Math.max(prev, currentHR));
    }
  }, [isWorkoutActive, currentHR]);

  // Calculate recovery HR 1 minute after workout ends
  useEffect(() => {
    if (!recoveryStartTime) return;
    
    const timer = setTimeout(() => {
      setRecoveryHR(currentHR);
    }, 60000); // 1 minute
    
    return () => clearTimeout(timer);
  }, [recoveryStartTime, currentHR]);

  // Calculate HRR
  const calculateHRR = () => {
    if (peakHR && recoveryHR) {
      return Math.max(0, peakHR - recoveryHR);
    }
    return null;
  };

  // Format calibration time as MM:SS
  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Handle workout toggle
  const toggleWorkout = () => {
    const newWorkoutState = !isWorkoutActive;
    setIsWorkoutActive(newWorkoutState);
    
    if (!newWorkoutState) { // Workout ended
      setRecoveryStartTime(Date.now());
      // Reset recovery HR
      setRecoveryHR(null);
    } else { // Workout started
      setPeakHR(currentHR || 0);
      setRecoveryStartTime(null);
      setRecoveryHR(null);
    }
  };

  // Handle data upload
  const handleSendData = async () => {
    if (user && ecgHistory.length > 0) {
      try {
        // This would trigger the upload functionality
        console.log("Sending data to MongoDB...");
        // You could implement actual MongoDB upload here
      } catch (error) {
        console.error("Error uploading data:", error);
      }
    }
  };

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
          <Box sx={{ px: 2, pt: 2 }}>
            {/* Header */}
            <Box sx={{ mb: 3 }}>
              <Typography variant="h5" fontWeight={500}>Your Records</Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                View your saved ECG and heart rate data
              </Typography>
            </Box>

            {/* FetchHistory component */}
            <FetchHistory user_name={user.user_name} />
          </Box>
        );
      // New Record tab
      case 1:
        return (
          <Box sx={{ px: 2, pt: 2 }}>
            {!isConnected ? (
              <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, mt: 4 }}>
                <Button 
                  variant="contained" 
                  fullWidth 
                  sx={{ 
                    py: 1.5, 
                    borderRadius: 28,
                    maxWidth: 400,
                    fontSize: 16,
                    bgcolor: '#4285F4',
                    '&:hover': { bgcolor: '#3367D6' },
                  }} 
                  onClick={connect}
                >
                  Connect to Polar H10
                </Button>
              </Box>
            ) : (
              <Box sx={{ mb: 8 }}>
                {/* ECG Calibration Card */}
                <Card sx={{ mb: 2, borderRadius: 2 }}>
                  <CardContent sx={{ p: 3 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center' }}>
                        <InfoIcon 
                          sx={{ color: '#4285F4', mr: 1, cursor: 'pointer' }} 
                          onClick={() => setInfoDialogOpen(true)}
                        />
                        <Typography variant="h6">ECG Calibration</Typography>
                      </Box>
                      {isECGStreaming ? (
                        <Button 
                          variant="contained" 
                          color="error"
                          size="small"
                          sx={{ borderRadius: 6 }}
                          onClick={stopECGStream}
                        >
                          Stop Calibration
                        </Button>
                      ) : (
                        <Button 
                          variant="contained" 
                          color="primary"
                          size="small"
                          sx={{ borderRadius: 6 }}
                          onClick={startECGStream}
                        >
                          Start Calibration
                        </Button>
                      )}
                    </Box>
                    
                    <Box sx={{ mb: 2 }}>
                      <Typography sx={{ 
                        color: calibrationTime >= 300 ? '#4CAF50' : 'text.primary',
                        fontWeight: calibrationTime >= 300 ? 500 : 400 
                      }}>
                        {formatTime(calibrationTime)} 
                        {calibrationTime >= 300 && (
                          <span style={{ color: '#000' }}> ✓ 5 minutes collected - ready for calibration</span>
                        )}
                      </Typography>
                    </Box>
                    
                    <Paper variant="outlined" sx={{ p: 2, bgcolor: '#F5F5F5', borderRadius: 2 }}>
                      <Typography variant="subtitle1" fontWeight={500} sx={{ mb: 2 }}>
                        Status
                      </Typography>
                      
                      <Box sx={{ display: 'flex', width: '100%' }}>
                        <Box sx={{ width: '50%' }}>
                          <Typography variant="body2" color="text.secondary">State</Typography>
                          <Typography 
                            variant="body1" 
                            color={isECGStreaming ? "#4CAF50" : "text.primary"} 
                            fontWeight={isECGStreaming ? 500 : 400}
                          >
                            {isECGStreaming ? "Active" : "Inactive"}
                          </Typography>
                        </Box>
                        <Box sx={{ width: '50%' }}>
                          <Typography variant="body2" color="text.secondary">Data Points</Typography>
                          <Typography variant="body1">{dataPoints}</Typography>
                        </Box>
                      </Box>
                    </Paper>
                  </CardContent>
                </Card>
                
                {/* Heart Rate Recovery Card */}
                <Card sx={{ mb: 2, borderRadius: 2 }}>
                  <CardContent sx={{ p: 3 }}>
                    <Typography variant="h6" sx={{ mb: 2 }}>Heart Rate Recovery</Typography>
                    
                    <Box sx={{ mb: 2 }}>
                      <Typography>
                        You are currently {isWorkoutActive ? <strong>working out</strong> : <span>at <strong>rest</strong></span>}
                      </Typography>
                      <Typography sx={{ mt: 1 }}>
                        HR - {currentHR || 0} bpm
                        {peakHR > 0 && !isWorkoutActive && (
                          <span> | Peak HR: {peakHR} bpm</span>
                        )}
                      </Typography>
                      {recoveryStartTime && !recoveryHR && (
                        <Typography sx={{ color: 'text.secondary', fontSize: '0.875rem', mt: 0.5 }}>
                          Measuring recovery heart rate in {Math.max(0, 60 - Math.floor((Date.now() - recoveryStartTime) / 1000))}s...
                        </Typography>
                      )}
                      {recoveryHR && (
                        <Typography sx={{ mt: 0.5 }}>
                          Recovery HR: {recoveryHR} bpm | <strong>HRR: {calculateHRR()} bpm</strong>
                        </Typography>
                      )}
                    </Box>
                    
                    <Box sx={{ 
                      height: 150, 
                      display: 'flex', 
                      justifyContent: 'center', 
                      alignItems: 'center',
                      bgcolor: '#F5F5F5',
                      borderRadius: 1,
                      mb: 2,
                      position: 'relative',
                      overflow: 'hidden'
                    }}>
                      {hrHistory && hrHistory.length > 0 ? (
                        <Box sx={{ 
                          position: 'absolute', 
                          bottom: 0, 
                          left: 0, 
                          width: '100%', 
                          height: '100%',
                          display: 'flex',
                          alignItems: 'flex-end'
                        }}>
                          {hrHistory.slice(-20).map((hr, index) => (
                            <Box 
                              key={index}
                              sx={{
                                height: `${(hr.value / 200) * 100}%`,
                                width: `${100 / 20}%`,
                                backgroundColor: isWorkoutActive ? '#FF5252' : '#4285F4',
                                opacity: 0.7 + (index / 40)
                              }}
                            />
                          ))}
                        </Box>
                      ) : (
                        <Typography variant="body2" color="text.secondary">
                          No heart rate data available
                        </Typography>
                      )}
                    </Box>
                    
                    <Button 
                      variant="contained" 
                      color={isWorkoutActive ? "error" : "primary"}
                      fullWidth
                      sx={{ borderRadius: 28 }}
                      onClick={toggleWorkout}
                    >
                      {isWorkoutActive ? "Stop Workout" : "Start Workout"}
                    </Button>
                  </CardContent>
                </Card>
                
                {/* Send Data Button */}
                <Button
                  variant="contained"
                  fullWidth
                  startIcon={<SendIcon />}
                  sx={{ 
                    py: 1.5, 
                    borderRadius: 28,
                    bgcolor: '#4285F4',
                    '&:hover': { bgcolor: '#3367D6' },
                    mb: 4
                  }}
                  onClick={handleSendData}
                  disabled={!isConnected || ecgHistory.length === 0}
                >
                  Send Your Data to MongoDB
                </Button>
                
                {/* NewRecord component */}
                <NewRecord
                  isConnected={isConnected}
                  isECGStreaming={isECGStreaming}
                  ecgHistory={ecgHistory}
                  hrHistory={hrHistory}
                  user={user}
                />
              </Box>
            )}
          </Box>
        );
      // Profile tab
      case 2:
        return (
          <Box sx={{ px: 2, pt: 2 }}>
            {/* Header */}
            <Box sx={{ mb: 3 }}>
              <Typography variant="h5" fontWeight={500}>Your Profile</Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                View your account and health information
              </Typography>
            </Box>
            
            {/* User Info Card */}
            <Card sx={{ mb: 3, borderRadius: 2, overflow: 'hidden' }}>
              <Box sx={{ 
                p: 3, 
                bgcolor: '#f7f9fc', 
                display: 'flex', 
                alignItems: 'center',
                gap: 2,
                borderBottom: '1px solid rgba(0,0,0,0.06)'
              }}>
                <Box sx={{ 
                  width: 64, 
                  height: 64, 
                  borderRadius: '50%', 
                  bgcolor: '#e3f2fd', 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center',
                  color: '#1976d2',
                  fontWeight: 'bold',
                  fontSize: '1.5rem'
                }}>
                  {user.user_name?.charAt(0)?.toUpperCase() || 'U'}
                </Box>
                <Box>
                  <Typography variant="h6">{user.user_name || 'User'}</Typography>
                  <Typography variant="body2" color="text.secondary">
                    Rhythmi App User
                  </Typography>
                </Box>
              </Box>
              <CardContent>
                <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2, mt: 1 }}>
                  <Box>
                    <Typography variant="body2" color="text.secondary">Birth Year</Typography>
                    <Typography variant="body1" sx={{ fontWeight: 500 }}>
                      {user.birth_year || '--'}
                    </Typography>
                  </Box>
                  <Box>
                    <Typography variant="body2" color="text.secondary">Gender</Typography>
                    <Typography variant="body1" sx={{ fontWeight: 500 }}>
                      {user.gender || '--'}
                    </Typography>
                  </Box>
                </Box>
              </CardContent>
            </Card>
            
            {/* Health Metrics Card - only showing current HR which we have */}
            <Card sx={{ mb: 3, borderRadius: 2 }}>
              <CardContent>
                <Typography variant="subtitle1" fontWeight={500} sx={{ mb: 2 }}>Current Health Data</Typography>
                
                <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
                  <Paper sx={{ p: 2, borderRadius: 2, bgcolor: '#f5f5f5' }}>
                    <Typography variant="body2" color="text.secondary">Current Heart Rate</Typography>
                    <Typography variant="h6" sx={{ mt: 0.5, color: '#1976d2' }}>
                      {currentHR || '--'} <Typography component="span" variant="caption">bpm</Typography>
                    </Typography>
                  </Paper>
                  
                  <Paper sx={{ p: 2, borderRadius: 2, bgcolor: '#f5f5f5' }}>
                    <Typography variant="body2" color="text.secondary">Device Status</Typography>
                    <Typography variant="h6" sx={{ mt: 0.5, color: isConnected ? '#4CAF50' : '#757575' }}>
                      {isConnected ? 'Connected' : 'Disconnected'}
                    </Typography>
                  </Paper>
                </Box>
              </CardContent>
            </Card>
            
            {/* Version info */}
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', textAlign: 'center', mt: 3, mb: 8 }}>
              Rhythmi v1.0.0
            </Typography>
          </Box>
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

      {/* Information Dialog */}
      <Dialog
        open={infoDialogOpen}
        onClose={() => setInfoDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="subtitle1" sx={{ fontSize: '1.25rem', fontWeight: 500 }}>ECG Calibration Instructions</Typography>
          <IconButton edge="end" color="inherit" onClick={() => setInfoDialogOpen(false)}>
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent>
          <Typography paragraph sx={{ mt: 1 }}>
            <strong>What is ECG Calibration?</strong>
          </Typography>
          <Typography paragraph>
            ECG calibration establishes your baseline heart rhythm at rest. This helps the app analyze 
            changes during activity and recovery more accurately.
          </Typography>
          <Typography paragraph>
            <strong>How to calibrate:</strong>
          </Typography>
          <Typography component="div">
            <ol>
              <li>Sit comfortably and remain still</li>
              <li>Press &quot;Start Calibration&quot; and relax for at least 5 minutes</li>
              <li>The status will show &quot;Active&quot; during calibration</li>
              <li>Once 5 minutes are completed, you&apos;re ready to proceed</li>
              <li>Press &quot;Stop Calibration&quot; when finished</li>
            </ol>
          </Typography>
          <Typography paragraph>
            <strong>Tips for accurate readings:</strong>
          </Typography>
          <Typography>
            • Ensure the heart rate sensor is properly attached<br />
            • Stay relatively still during calibration<br />
            • Breathe normally<br />
            • Avoid talking during the calibration process
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setInfoDialogOpen(false)} variant="contained">
            Got it
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
