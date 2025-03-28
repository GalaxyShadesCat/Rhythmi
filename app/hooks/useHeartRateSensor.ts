import { useState, useCallback, useEffect } from 'react';

const PMD_SERVICE_UUID = "fb005c80-02e7-f387-1cad-8acd2d8df0c8";
const PMD_CONTROL_CHARACTERISTIC_UUID = "fb005c81-02e7-f387-1cad-8acd2d8df0c8";
const PMD_DATA_CHARACTERISTIC_UUID = "fb005c82-02e7-f387-1cad-8acd2d8df0c8";
const POLAR_HR_SERVICE_UUID = 0x180d;
const POLAR_HR_CHARACTERISTIC_UUID = 0x2a37;

interface ECGDataPoint {
  timestamp: number;
  value: number;
}


interface HeartRateSensorHook {
  connect: () => Promise<void>;
  disconnect: () => void;
  startECGStream: () => Promise<void>;
  stopECGStream: () => void;
  heartRate: number | null;
  ecgData: ECGDataPoint[];
  error: string | null;
  isConnected: boolean;
  isECGStreaming: boolean;
}

export function useHeartRateSensor(): HeartRateSensorHook {
  // State Management Section
  const [device, setDevice] = useState<BluetoothDevice | null>(null);
  const [heartRate, setHeartRate] = useState<number | null>(null);
  const [ecgData, setECGData] = useState<ECGDataPoint[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [isECGStreaming, setIsECGStreaming] = useState<boolean>(false);
  const [pmdControlCharacteristic, setPmdControlCharacteristic] = useState<BluetoothRemoteGATTCharacteristic | null>(null);
  const [pmdDataCharacteristic, setPmdDataCharacteristic] = useState<BluetoothRemoteGATTCharacteristic | null>(null);

  // Connection Management
  const connect = useCallback(async () => {
    try {
      if (!navigator.bluetooth) {
        throw new Error('Web Bluetooth API is not supported in this browser.');
      }

      const device = await navigator.bluetooth.requestDevice({
        filters: [{ services: [POLAR_HR_SERVICE_UUID] }],
        optionalServices: [PMD_SERVICE_UUID]
      });

      setDevice(device);

      device.addEventListener('gattserverdisconnected', () => {
        setIsConnected(false);
        setHeartRate(null);
        setIsECGStreaming(false);
      });

      const server = await device.gatt?.connect();
      const hrService = await server?.getPrimaryService(POLAR_HR_SERVICE_UUID);
      const hrCharacteristic = await hrService?.getCharacteristic(POLAR_HR_CHARACTERISTIC_UUID);

      await hrCharacteristic?.startNotifications();
      hrCharacteristic?.addEventListener('characteristicvaluechanged', (event) => {
        const value = (event.target as BluetoothRemoteGATTCharacteristic).value;
        if (value) {
          setHeartRate(parseHeartRate(value));
        }
      });

      const pmdService = await server?.getPrimaryService(PMD_SERVICE_UUID);
      const pmdControl = await pmdService?.getCharacteristic(PMD_CONTROL_CHARACTERISTIC_UUID);
      const pmdData = await pmdService?.getCharacteristic(PMD_DATA_CHARACTERISTIC_UUID);

      setPmdControlCharacteristic(pmdControl as BluetoothRemoteGATTCharacteristic);
      setPmdDataCharacteristic(pmdData as BluetoothRemoteGATTCharacteristic);

      setIsConnected(true);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unknown error occurred');
    }
  }, []);

  const disconnect = useCallback(() => {
    if (device && device.gatt?.connected) {
      device.gatt.disconnect();
    }
    setDevice(null);
    setHeartRate(null);
    setIsConnected(false);
    setIsECGStreaming(false);
    setPmdControlCharacteristic(null);
    setPmdDataCharacteristic(null);
    setECGData([]);
  }, [device]);

  // ECG Stream Control
  const startECGStream = useCallback(async () => {
    if (!pmdControlCharacteristic || !pmdDataCharacteristic) {
      throw new Error('PMD characteristics not available');
    }

    try {
      // Request Stream Setting
      await pmdControlCharacteristic.writeValue(new Uint8Array([0x01, 0x02]));
      await pmdControlCharacteristic.writeValue(new Uint8Array([0x01, 0x00]));

      // Start Stream
      await pmdControlCharacteristic.writeValue(new Uint8Array([0x02, 0x00, 0x00, 0x01, 0x82, 0x00, 0x01, 0x01, 0x0E, 0x00]));

      await pmdDataCharacteristic.startNotifications();
      pmdDataCharacteristic.addEventListener('characteristicvaluechanged', (event) => {
        const value = (event.target as BluetoothRemoteGATTCharacteristic).value;
        if (value) {
          const { samples } = parseECGData(value);
          const currentTime = Date.now();
          const sampleInterval = 1000 / 130; // 130 Hz sampling rate

          const newEcgData = samples.map((sample, index) => ({
            timestamp: currentTime + index * sampleInterval,
            value: sample
          }));

          setECGData(prev => [...prev, ...newEcgData].slice(-1000)); // Keep last 1000 points
        }
      });

      setIsECGStreaming(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unknown error occurred while starting ECG stream');
    }
  }, [pmdControlCharacteristic, pmdDataCharacteristic]);
  

  const stopECGStream = useCallback(async () => {
    if (pmdDataCharacteristic) {
      await pmdDataCharacteristic.stopNotifications();
    }
    setIsECGStreaming(false);
    setECGData([]);
  }, [pmdDataCharacteristic]);

  // Remove unused handlers:
  // - handleHeartRateUpdate
  // - handleECGData

  // Effects & Cleanup
  useEffect(() => {
    return () => {
      disconnect();
    };
  }, [disconnect]);

  return {
    connect,
    disconnect,
    startECGStream,
    stopECGStream,
    heartRate,
    ecgData,
    error,
    isConnected,
    isECGStreaming
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
    let sample = value.getUint8(startByte) | (value.getUint8(startByte + 1) << 8) | (value.getUint8(startByte + 2) << 16);
    
    // Convert to signed integer (two's complement)
    if (sample & 0x800000) {
      sample = sample - 0x1000000;
    }
    
    samples.push(sample);
  }

  return { samples };
}
