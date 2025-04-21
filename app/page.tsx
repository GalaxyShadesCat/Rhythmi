"use client";
import { useHeartRateSensor } from "@/hooks/useHeartRateSensor";
import HeartRateMonitor from "@/components/HeartRateMonitor";
import ECGChart from "@/components/ECGChart";
import UploadButton from "@/components/UploadButton";
import { ActivitySegment, RecordData } from "@/hooks/useMongoDB";
import UserPanel from "@/components/UserPanel";
import { useLocalStorage } from "@/hooks/useLocalStorage";
import { useMemo, useState, useEffect } from "react";
import ActivitySegmentEditor from "@/components/ActivitySegmentEditor";
import HRRDisplay from "@/components/HRRDisplay";

// Import the ECG analysis hook for HR and HRV calculation
import { useECGAnalysis } from "@/hooks/useECGAnalysis";

export default function Home() {
  const {
    connect,
    disconnect,
    startECGStream,
    stopECGStream,
    heartRate,
    heartRateData,
    ecgData,
    ecgHistory,
    error,
    isConnected,
    isECGStreaming,
  } = useHeartRateSensor();

  const { user, saveUser, clearUser } = useLocalStorage();
  const [activitySegments, setActivitySegments] = useState<ActivitySegment[]>(
    []
  );
  
  // Add a state to track if streaming is paused
  const [isPaused, setIsPaused] = useState<boolean>(false);
  
  // Add a state to store the last ECG data for frozen visualization when paused
  const [frozenEcgData, setFrozenEcgData] = useState<typeof ecgData>([]);
  
  // Add a state to track if test mode is active
  const [isTestMode, setIsTestMode] = useState<boolean>(false);
   
  // Add a counter for animating test data
  const [testCounter, setTestCounter] = useState(0);
  
  // Set test mode animation speed to match actual sampling rate (fixed at 500ms - slowest speed)
  const testSpeed = 500;
  
  // Set up auto-update timer for test mode
  useEffect(() => {
    if (isTestMode && !isPaused) {
      const timer = setInterval(() => {
        setTestCounter(prev => prev + 1);
      }, testSpeed); // Fixed at 500ms to match actual sampling rate
      
      return () => clearInterval(timer);
    }
  }, [isTestMode, isPaused]);
  
  // Generate sample ECG data for test mode with animation
  const sampleEcgData = useMemo(() => {
    const samples = [];
    const sampleSize = 1000;
    const now = Date.now();
    const timeOffset = testCounter * 16; // Reduced shift amount to match real ECG flow
    
    // Heart rate parameters (slight variability for realism)
    const baseHeartRate = 72; // 72 BPM
    const hrVariability = 5; // +/- 5 BPM variation
    
    // Generate consecutive heartbeats with slight variability
    let sampleIndex = 0;
    while (sampleIndex < sampleSize) {
      // Vary the RR interval slightly for each beat
      const hrVariation = (Math.random() * 2 - 1) * hrVariability;
      const currentHR = baseHeartRate + hrVariation;
      const currentRRInterval = Math.round((60 / currentHR) * 125);
      
      // Loop through each point in this particular heartbeat
      for (let beatIndex = 0; beatIndex < currentRRInterval && sampleIndex < sampleSize; beatIndex++) {
        const beatPhase = beatIndex / currentRRInterval;
        let value = 0;
        
        // Generate each component of the PQRST complex
        if (beatPhase < 0.1) {
          // P wave (atrial depolarization) - small rounded bump
          value = 25 * Math.sin(beatPhase * Math.PI / 0.1);
        } else if (beatPhase >= 0.1 && beatPhase < 0.2) {
          // PR segment - relatively flat
          value = 0;
        } else if (beatPhase >= 0.2 && beatPhase < 0.35) {
          // QRS complex (ventricular depolarization)
          if (beatPhase < 0.22) {
            // Q wave - small negative deflection
            value = -30 * (beatPhase - 0.2) / 0.02;
          } else if (beatPhase < 0.28) {
            // R wave - large positive spike
            const rPeakIntensity = 150 + (Math.random() * 20 - 10); // Add slight variation
            value = rPeakIntensity * Math.sin((beatPhase - 0.22) * Math.PI / 0.06);
          } else {
            // S wave - negative deflection after R
            value = -40 * Math.sin((beatPhase - 0.28) * Math.PI / 0.07);
          }
        } else if (beatPhase >= 0.35 && beatPhase < 0.45) {
          // ST segment - relatively flat but slightly elevated
          value = 5;
        } else if (beatPhase >= 0.45 && beatPhase < 0.7) {
          // T wave (ventricular repolarization) - rounded asymmetric bump
          const tAmplitude = 35 + (Math.random() * 10 - 5); // Add variation
          const tPhase = (beatPhase - 0.45) / 0.25;
          // Asymmetric shape with slower rise, faster fall
          if (tPhase < 0.6) {
            value = tAmplitude * Math.sin(tPhase * Math.PI / 0.6);
          } else {
            value = tAmplitude * Math.sin((1 - (tPhase - 0.6)/0.4) * Math.PI / 2);
          }
        } else {
          // TP segment (electrical diastole) - baseline
          value = 0;
        }
        
        // Add very small respiratory modulation
        value += 5 * Math.sin(2 * Math.PI * sampleIndex / (125 * 5)); // ~5 second breathing cycle
        
        // Add small random noise
        value += (Math.random() * 2 - 1) * 2;
        
        // Add timestamp and push sample
        const timestamp = now - (sampleSize - sampleIndex) * 8 + timeOffset;
        samples.push({
          timestamp,
          value
        });
        
        sampleIndex++;
      }
    }
    
    return samples;
  }, [testCounter]);

  // Function to toggle pause state
  const togglePause = () => {
    // If we're about to pause, store the current data for frozen visualization
    if (!isPaused) {
      setFrozenEcgData(isTestMode ? sampleEcgData : ecgData);
    }
    setIsPaused(!isPaused);
  };
  
  // Determine which ECG data to use based on mode
  const effectiveEcgData = useMemo(() => {
    // If paused, use the frozen data to keep visualization on screen
    if (isPaused) {
      return frozenEcgData;
    }
    
    // Otherwise, return appropriate data based on mode
    if (isTestMode) {
      return sampleEcgData;
    }
    return ecgData; // Always use actual ecgData when not in test mode
  }, [isTestMode, isPaused, sampleEcgData, ecgData, frozenEcgData]);
  
  // Toggle test mode
  const toggleTestMode = () => {
    setIsTestMode(!isTestMode);
    if (!isTestMode) {
      setIsPaused(false); // Reset pause state when entering test mode
    }
  };
  
  // Use the ECG analysis hook to get metrics and setBaseline function
  const { metrics: ecgMetrics, setBaseline } = useECGAnalysis(
    isTestMode ? sampleEcgData : ecgData
  );

  // Add debug logging for ECG data
  useEffect(() => {
    if (isECGStreaming) {
      console.log(`Real ECG data length: ${ecgData.length}`);
      console.log(`Effective ECG data length: ${effectiveEcgData.length}`);
    }
  }, [isECGStreaming, ecgData.length, effectiveEcgData.length]);

  // Format a timestamp as time string
  const formatTime = (timestamp: number | null): string => {
    if (timestamp === null) return 'Not set';
    return new Date(timestamp).toLocaleTimeString();
  };

  // Format recovery time in minutes and seconds
  const formatRecoveryTime = (ms: number | null): string => {
    if (ms === null) return 'Not completed';
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}m ${remainingSeconds}s`;
  };

  // Handler to set current ECG data as baseline
  const handleSetBaseline = () => {
    console.log("Setting baseline with current heart rate:", ecgMetrics.heartRate);
    setBaseline();
  };

  const record: RecordData | null = useMemo(() => {
    if (!user || !user._id || ecgHistory.length === 0) return null;

    return {
      user_id: user._id,
      datetime: new Date().toISOString(),
      ecg: ecgHistory,
      hr: heartRateData,
      activity_segments: activitySegments,
    };
  }, [user, ecgHistory, heartRateData, activitySegments]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-100 to-teal-100 p-8 text-black">
      <UserPanel user={user} saveUser={saveUser} clearUser={clearUser} />
      <HeartRateMonitor
        isConnected={isConnected}
        isECGStreaming={isECGStreaming}
        connect={connect}
        disconnect={disconnect}
        startECGStream={startECGStream}
        stopECGStream={stopECGStream}
        error={error}
        heartRate={heartRate}
      />

      <div className="max-w-4xl mx-auto mt-4 mb-4 flex justify-end">
        <button
          onClick={toggleTestMode}
          className={`px-4 py-2 rounded font-medium transition ${
            isTestMode 
              ? 'bg-purple-600 text-white hover:bg-purple-700' 
              : 'bg-gray-200 text-gray-800 hover:bg-gray-300'
          }`}
        >
          {isTestMode ? 'Exit Test Mode' : 'Enter Test Mode'}
        </button>
      </div>

      {isTestMode && (
        <div className="max-w-4xl mx-auto -mt-2 mb-4">
          <div className="bg-purple-100 border-l-4 border-purple-500 text-purple-700 p-3 rounded" role="alert">
            <div className="flex items-center">
              <svg className="h-5 w-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2h-1V9z" clipRule="evenodd" />
              </svg>
              <p className="font-bold">Test Mode Active</p>
            </div>
            <p className="text-sm mt-1">Using simulated ECG data to demonstrate UI functionality. No physical device required.</p>
          </div>
        </div>
      )}

      {(isECGStreaming || isTestMode) && (
        <>
          <div className="max-w-4xl mx-auto mt-8 bg-white p-4 rounded-lg shadow-inner">
            <div className="flex justify-between items-center mb-2">
              <h3 className="text-lg font-semibold">ECG Chart</h3>
              <div className="flex items-center gap-3">
                {isPaused && (
                  <span className="text-amber-600 font-medium animate-pulse bg-amber-50 px-3 py-1 rounded-full border border-amber-200">
                    Visualization Frozen
                  </span>
                )}
                <button 
                  onClick={togglePause} 
                  className={`px-4 py-2 rounded text-white transition ${
                    isPaused 
                      ? 'bg-green-600 hover:bg-green-700' 
                      : 'bg-yellow-600 hover:bg-yellow-700'
                  }`}
                >
                  {isPaused ? 'Resume' : 'Freeze'} Visualization
                </button>
              </div>
            </div>
            <ECGChart ecgData={effectiveEcgData} visibleDataPoints={1000} />
          </div>
          
          <div className="max-w-4xl mx-auto mt-4 bg-white p-4 rounded-lg shadow-inner">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <h3 className="text-lg font-semibold mb-2">ECG Analysis</h3>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span>Heart Rate:</span>
                    <span className="font-medium">{ecgMetrics.heartRate} BPM</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Heart Rate Variability:</span>
                    <span className="font-medium">{ecgMetrics.heartRateVariability.toFixed(2)} ms</span>
                  </div>
                  <div className="flex justify-between">
                    <span>R-Peaks Detected:</span>
                    <span className="font-medium">{ecgMetrics.rPeaks.length}</span>
                  </div>
                </div>
                
                <button 
                  onClick={handleSetBaseline}
                  className="mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition"
                >
                  Set as Baseline
                </button>
              </div>
              
              {ecgMetrics.baselineTime !== null && (
                <div>
                  <h3 className="text-lg font-semibold mb-2">Heart Rate Recovery Tracking</h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span>Baseline HR:</span>
                      <span className="font-medium">{ecgMetrics.baselineHeartRate} BPM</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Baseline Time:</span>
                      <span className="font-medium">{formatTime(ecgMetrics.baselineTime)}</span>
                    </div>
                    
                    {ecgMetrics.exerciseStartTime !== null && (
                      <>
                        <div className="flex justify-between">
                          <span>Exercise Start:</span>
                          <span className="font-medium">{formatTime(ecgMetrics.exerciseStartTime)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Peak HR:</span>
                          <span className="font-medium">{ecgMetrics.peakHeartRate} BPM</span>
                        </div>
                        {ecgMetrics.peakHeartRateTime && (
                          <div className="flex justify-between">
                            <span>Peak HR Time:</span>
                            <span className="font-medium">{formatTime(ecgMetrics.peakHeartRateTime)}</span>
                          </div>
                        )}
                      </>
                    )}
                    
                    {ecgMetrics.recoveryStartTime !== null && (
                      <>
                        <div className="flex justify-between">
                          <span>Recovery Start:</span>
                          <span className="font-medium">{formatTime(ecgMetrics.recoveryStartTime)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Recovery Time:</span>
                          <span className={`font-medium ${ecgMetrics.recoveryStatus === 'completed' ? 'text-green-600' : 'text-amber-600'}`}>
                            {formatRecoveryTime(ecgMetrics.recoveryTime)}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span>Status:</span>
                          <span className={`font-medium ${
                            ecgMetrics.recoveryStatus === 'completed' 
                              ? 'text-green-600' 
                              : ecgMetrics.recoveryStatus === 'in-progress' 
                                ? 'text-amber-600' 
                                : 'text-gray-600'
                          }`}>
                            {ecgMetrics.recoveryStatus === 'completed' 
                              ? 'Completed' 
                              : ecgMetrics.recoveryStatus === 'in-progress' 
                                ? 'In Progress' 
                                : 'Not Started'}
                          </span>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </>
      )}

      <div className="max-w-4xl mx-auto mt-6">
        <UploadButton record={record} />
      </div>

      <HRRDisplay
        isMonitoring={isECGStreaming}
        historicalHR={heartRateData}
        currentHR={heartRateData}
      />

      <ActivitySegmentEditor
        ecgData={ecgHistory}
        segments={activitySegments}
        setSegments={setActivitySegments}
      />
    </div>
  );
}
