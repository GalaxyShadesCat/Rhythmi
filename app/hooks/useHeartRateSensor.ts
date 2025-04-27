import { useState, useCallback, useEffect, useRef } from "react";
import { ECGDataPoint, HRDataPoint } from "@/types/types";

const PMD_SERVICE_UUID = "fb005c80-02e7-f387-1cad-8acd2d8df0c8";
const PMD_CONTROL_CHARACTERISTIC_UUID = "fb005c81-02e7-f387-1cad-8acd2d8df0c8";
const PMD_DATA_CHARACTERISTIC_UUID = "fb005c82-02e7-f387-1cad-8acd2d8df0c8";
const POLAR_HR_SERVICE_UUID = 0x180d;
const POLAR_HR_CHARACTERISTIC_UUID = 0x2a37;

// Enable simulation for development environments
// Set this to false before production deployment
const DEFAULT_SIMULATION = process.env.NODE_ENV === 'development';

interface HeartRateSensorHook {
  connect: () => Promise<void>;
  disconnect: () => void;
  startECGStream: () => Promise<void>;
  stopECGStream: () => void;
  currentECG: ECGDataPoint[]; // Current ECG data (last 1000 points)
  ecgHistory: ECGDataPoint[]; // Complete ECG data
  currentHR: number | null;
  hrHistory: HRDataPoint[]; // Complete heart rate data
  error: string | null;
  isConnected: boolean;
  isECGStreaming: boolean;
  isSimulated: boolean;
  setSimulationMode: (enabled: boolean) => void;
}

// Generate simulated ECG data (approximate sine wave with noise)
function generateSimulatedECGData(
  baseTimestamp: number,
  count: number,
  hrValue: number
): ECGDataPoint[] {
  const result: ECGDataPoint[] = [];
  const sampleRate = 130; // 130Hz
  const interval = 1000 / sampleRate;
  
  // Calculate appropriate sine wave frequency based on heart rate
  // (heart rate in bpm / 60) gives frequency in Hz
  const frequency = hrValue / 60;
  
  for (let i = 0; i < count; i++) {
    const timestamp = baseTimestamp + i * interval;
    const timeInSec = i / sampleRate;
    
    // Basic ECG-like pattern (simplified QRS complex)
    const sinValue = Math.sin(2 * Math.PI * frequency * timeInSec);
    
    // Create more ECG-like morphology with peaked R wave
    let value = 0;
    if (sinValue > 0.8) {
      // R wave peak (higher amplitude when close to 1)
      value = 800 + (sinValue - 0.8) * 5000;
    } else if (sinValue < -0.8) {
      // S wave (negative deflection)
      value = -200 + (sinValue + 0.8) * 500;
    } else {
      // Baseline with some variation
      value = sinValue * 100;
    }
    
    // Add some noise
    value += (Math.random() - 0.5) * 50;
    
    result.push({
      timestamp,
      value,
    });
  }
  
  return result;
}

export function useHeartRateSensor(
  forceSimulation?: boolean
): HeartRateSensorHook {
  // State Management Section
  const [device, setDevice] = useState<BluetoothDevice | null>(null);
  const [currentECG, setCurrentECG] = useState<ECGDataPoint[]>([]);
  const [ecgHistory, setEcgHistory] = useState<ECGDataPoint[]>([]);
  const [currentHR, setCurrentHR] = useState<number | null>(null);
  const [hrHistory, setHRHistory] = useState<HRDataPoint[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [isECGStreaming, setIsECGStreaming] = useState<boolean>(false);
  const [isSimulated, setIsSimulated] = useState<boolean>(
    forceSimulation !== undefined ? forceSimulation : DEFAULT_SIMULATION
  );
  const [pmdControlCharacteristic, setPmdControlCharacteristic] =
    useState<BluetoothRemoteGATTCharacteristic | null>(null);
  const [pmdDataCharacteristic, setPmdDataCharacteristic] =
    useState<BluetoothRemoteGATTCharacteristic | null>(null);
  const simulationIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const hrUpdateIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Function to set simulation mode
  const setSimulationMode = useCallback((enabled: boolean) => {
    if (isConnected) {
      disconnect();
    }
    setIsSimulated(enabled);
  }, [isConnected]);

  // Cleanup function for intervals
  const clearSimulationIntervals = useCallback(() => {
    if (simulationIntervalRef.current) {
      clearInterval(simulationIntervalRef.current);
      simulationIntervalRef.current = null;
    }
    if (hrUpdateIntervalRef.current) {
      clearInterval(hrUpdateIntervalRef.current);
      hrUpdateIntervalRef.current = null;
    }
  }, []);

  // Define disconnect function first to avoid circular reference
  const disconnect = useCallback(() => {
    // Clear any simulation intervals
    clearSimulationIntervals();
    
    // If using a real device, disconnect it
    if (device && device.gatt?.connected) {
      device.gatt.disconnect();
    }
    
    setDevice(null);
    setCurrentHR(null);
    setIsConnected(false);
    setIsECGStreaming(false);
    setPmdControlCharacteristic(null);
    setPmdDataCharacteristic(null);
    setCurrentECG([]);
  }, [device, clearSimulationIntervals]);

  // Connection Management
  const connect = useCallback(async () => {
    try {
      // Clear any existing error
      setError(null);
      
      // Clean up any existing connections or simulations
      if (isConnected) {
        disconnect();
      }
      
      // If in simulation mode and enabled, simulate a connection
      if (isSimulated) {
        // Start simulation for heart rate immediately
        setIsConnected(true);
        setCurrentHR(70); // Start with a resting heart rate
        
        // Add initial HR point
        const hrPoint = {
          timestamp: Date.now(),
          value: 70,
        };
        setHRHistory([hrPoint]);
        
        // Setup a recurring heart rate update (separate from ECG)
        const hrInterval = setInterval(() => {
          const now = Date.now();
          const baseHR = currentHR || 70;
          const newHR = Math.max(50, Math.min(180, baseHR + (Math.random() - 0.5) * 3));
          const roundedHR = Math.round(newHR);
          
          setCurrentHR(roundedHR);
          setHRHistory(prev => [...prev, {
            timestamp: now,
            value: roundedHR,
          }]);
        }, 1000); // Update heart rate every second
        
        hrUpdateIntervalRef.current = hrInterval;
        
        setError(null);
        return;
      }
      
      // Real device connection
      if (!navigator.bluetooth) {
        throw new Error("Web Bluetooth API is not supported in this browser.");
      }

      const device = await navigator.bluetooth.requestDevice({
        filters: [{ services: [POLAR_HR_SERVICE_UUID] }],
        optionalServices: [PMD_SERVICE_UUID],
      });

      setDevice(device);

      device.addEventListener("gattserverdisconnected", () => {
        setIsConnected(false);
        setCurrentHR(null);
        setIsECGStreaming(false);
      });

      const server = await device.gatt?.connect();
      const hrService = await server?.getPrimaryService(POLAR_HR_SERVICE_UUID);
      const hrCharacteristic = await hrService?.getCharacteristic(
        POLAR_HR_CHARACTERISTIC_UUID
      );

      await hrCharacteristic?.startNotifications();
      hrCharacteristic?.addEventListener(
        "characteristicvaluechanged",
        (event) => {
          const value = (event.target as BluetoothRemoteGATTCharacteristic)
            .value;
          if (value) {
            const hr = parseHeartRate(value);
            setCurrentHR(hr);

            const hrPoint = {
              timestamp: Date.now(),
              value: hr,
            };

            setHRHistory((prev) => [...prev, hrPoint]);
          }
        }
      );

      const pmdService = await server?.getPrimaryService(PMD_SERVICE_UUID);
      const pmdControl = await pmdService?.getCharacteristic(
        PMD_CONTROL_CHARACTERISTIC_UUID
      );
      const pmdData = await pmdService?.getCharacteristic(
        PMD_DATA_CHARACTERISTIC_UUID
      );

      setPmdControlCharacteristic(
        pmdControl as BluetoothRemoteGATTCharacteristic
      );
      setPmdDataCharacteristic(
        pmdData as BluetoothRemoteGATTCharacteristic
      );

      setIsConnected(true);
      setError(null);
    } catch (err) {
      setIsConnected(false);
      setError(
        err instanceof Error ? err.message : "An unknown error occurred"
      );
      throw err; // Rethrow to allow component to handle
    }
  }, [currentHR, isConnected, isSimulated, disconnect]);

  // ECG Stream Control
  const startECGStream = useCallback(async () => {
    try {
      if (isSimulated) {
        // First stop any existing simulation
        if (simulationIntervalRef.current) {
          clearInterval(simulationIntervalRef.current);
          simulationIntervalRef.current = null;
        }
        
        // Clear ECG history
        setEcgHistory([]);
        setIsECGStreaming(true);
        
        // Start simulation interval for ECG data
        const interval = setInterval(() => {
          const now = Date.now();
          
          // Generate ECG data (approximately 13 samples per interval at 130Hz)
          const newEcgData = generateSimulatedECGData(now, 13, currentHR || 70);
          
          setCurrentECG(prev => [...prev, ...newEcgData].slice(-1000)); // Keep last 1000 points
          setEcgHistory(prev => [...prev, ...newEcgData]);
        }, 100); // Update every 100ms
        
        simulationIntervalRef.current = interval;
        return;
      }
      
      // Real device ECG streaming
      if (!pmdControlCharacteristic || !pmdDataCharacteristic) {
        throw new Error("PMD characteristics not available");
      }

      try {
        // Clear ECG history
        setEcgHistory([]);

        // Request Stream Setting
        await pmdControlCharacteristic.writeValue(new Uint8Array([0x01, 0x02]));
        await pmdControlCharacteristic.writeValue(new Uint8Array([0x01, 0x00]));

        // Start Stream
        await pmdControlCharacteristic.writeValue(
          new Uint8Array([
            0x02, 0x00, 0x00, 0x01, 0x82, 0x00, 0x01, 0x01, 0x0e, 0x00,
          ])
        );

        await pmdDataCharacteristic.startNotifications();
        pmdDataCharacteristic.addEventListener(
          "characteristicvaluechanged",
          (event) => {
            const value = (event.target as BluetoothRemoteGATTCharacteristic)
              .value;
            if (value) {
              const { samples } = parseECGData(value);
              const currentTime = Date.now();
              const sampleInterval = 1000 / 130; // 130 Hz sampling rate

              const newEcgData = samples.map((sample, index) => ({
                timestamp: currentTime + index * sampleInterval,
                value: sample,
              }));

              setCurrentECG((prev) => [...prev, ...newEcgData].slice(-1000)); // Keep last 1000 points
              setEcgHistory((prev) => [...prev, ...newEcgData]);
            }
          }
        );

        setIsECGStreaming(true);
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : "An unknown error occurred while starting ECG stream"
        );
        throw err;
      }
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "An unknown error occurred while starting ECG stream"
      );
      throw err;
    }
  }, [pmdControlCharacteristic, pmdDataCharacteristic, currentHR, isSimulated]);

  const stopECGStream = useCallback(async () => {
    // Stop simulation interval if active
    if (simulationIntervalRef.current) {
      clearInterval(simulationIntervalRef.current);
      simulationIntervalRef.current = null;
    }
    
    // Stop real device streaming if active
    if (pmdDataCharacteristic) {
      try {
        await pmdDataCharacteristic.stopNotifications();
      } catch (err) {
        console.error("Error stopping notifications:", err);
      }
    }
    
    setIsECGStreaming(false);
    setCurrentECG([]);
  }, [pmdDataCharacteristic]);

  // Effects & Cleanup
  useEffect(() => {
    return () => {
      clearSimulationIntervals();
      disconnect();
    };
  }, [disconnect, clearSimulationIntervals]);

  return {
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
    setSimulationMode,
  };
}

function parseHeartRate(value: DataView): number {
  const flags = value.getUint8(0);
  const rate16Bits = flags & 0x1;
  if (rate16Bits) {
    return value.getUint16(1, true);
  } else {
    return value.getUint8(1);
  }
}

function parseECGData(value: DataView): { samples: number[] } {
  const samples: number[] = [];
  for (let i = 0; i < 73; i++) {
    const startByte = 10 + i * 3;
    let sample =
      value.getUint8(startByte) |
      (value.getUint8(startByte + 1) << 8) |
      (value.getUint8(startByte + 2) << 16);

    // Convert to signed integer (two's complement)
    if (sample & 0x800000) {
      sample = sample - 0x1000000;
    }

    samples.push(sample);
  }

  return { samples };
}
