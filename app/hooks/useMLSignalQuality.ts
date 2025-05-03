import { ECGDataPoint } from "@/types/types";
import { useState, useEffect } from 'react';

export type QualityRating = "excellent" | "good" | "poor";

// Fallback to basic signal quality calculation if ML features fail
function calculateBasicSignalQuality(data: ECGDataPoint[]): QualityRating {
  if (data.length === 0) return "poor";

  const values = data.map(point => point.value);
  const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
  const squaredDiffs = values.map((val) => Math.pow(val - mean, 2));
  const variance = squaredDiffs.reduce((sum, val) => sum + val, 0) / values.length;
  const standardDeviation = Math.sqrt(variance);

  if (standardDeviation < 300) return "excellent";
  if (standardDeviation < 400) return "good";
  return "poor";
}

// Helper function to calculate FFT using Web Audio API
function calculateFFT(signal: number[]): { magnitudes: Float32Array, frequencies: Float32Array } | null {
  try {
    // Check if we're in a browser environment
    if (typeof window === 'undefined') {
      return null;
    }

    // Create audio context and analyzer
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    const analyser = audioContext.createAnalyser();
    analyser.fftSize = 2048;

    // Create buffer and fill with signal data
    const buffer = audioContext.createBuffer(1, signal.length, 130);
    const channelData = buffer.getChannelData(0);
    signal.forEach((value, index) => {
      channelData[index] = value;
    });

    // Create source and connect to analyzer
    const source = audioContext.createBufferSource();
    source.buffer = buffer;
    source.connect(analyser);
    source.connect(audioContext.destination);

    // Get frequency data
    const magnitudes = new Float32Array(analyser.frequencyBinCount);
    analyser.getFloatFrequencyData(magnitudes);

    // Calculate frequencies
    const frequencies = new Float32Array(analyser.frequencyBinCount);
    for (let i = 0; i < analyser.frequencyBinCount; i++) {
      frequencies[i] = i * audioContext.sampleRate / analyser.fftSize;
    }

    // Clean up
    source.disconnect();
    audioContext.close();

    return { magnitudes, frequencies };
  } catch (error) {
    console.warn('FFT calculation failed:', error);
    return null;
  }
}

// Helper function to calculate spectral entropy
function calculateSpectralEntropy(magnitudes: Float32Array): number {
  try {
    const powerSpectrum = magnitudes.map(mag => Math.pow(10, mag/10));
    const totalPower = powerSpectrum.reduce((sum, power) => sum + power, 0);
    const normalizedPower = powerSpectrum.map(power => power / totalPower);
    return -normalizedPower.reduce((entropy, power) => {
      return entropy + (power > 0 ? power * Math.log2(power) : 0);
    }, 0);
  } catch (error) {
    console.warn('Spectral entropy calculation failed:', error);
    return 0;
  }
}

// Helper function to calculate SQIp
function calculateSQIp(magnitudes: Float32Array, frequencies: Float32Array): number {
  try {
    const power5to15 = magnitudes.reduce((sum, mag, i) => {
      const freq = frequencies[i];
      return sum + (freq >= 5 && freq <= 15 ? Math.pow(10, mag/10) : 0);
    }, 0);

    const power0to45 = magnitudes.reduce((sum, mag, i) => {
      const freq = frequencies[i];
      return sum + (freq >= 0 && freq <= 45 ? Math.pow(10, mag/10) : 0);
    }, 0);

    return power5to15 / (power0to45 + 1e-7);
  } catch (error) {
    console.warn('SQIp calculation failed:', error);
    return 0;
  }
}

// Helper function to extract features from ECG signal
function extractECGFeatures(signal: number[]): number[] | null {
  try {
    if (!signal || signal.length === 0) {
      throw new Error("Empty signal");
    }

    // Basic Statistical Features
    const mean = signal.reduce((a, b) => a + b, 0) / signal.length;
    const std = Math.sqrt(
      signal.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / signal.length
    );
    const diff = signal.map(x => x - mean);
    const skewness = diff.reduce((a, b) => a + Math.pow(b, 3), 0) / (Math.pow(std, 3) * signal.length);
    const kurtosis = diff.reduce((a, b) => a + Math.pow(b, 4), 0) / (Math.pow(std, 4) * signal.length);
    const signalRange = Math.max(...signal) - Math.min(...signal);
    const zeroCrossings = signal.slice(1).reduce((count, val, i) => 
      count + (Math.sign(val) !== Math.sign(signal[i]) ? 1 : 0), 0);
    const rms = Math.sqrt(signal.reduce((a, b) => a + b * b, 0) / signal.length);
    const peakToPeak = signalRange;

    // Signal-to-Noise Ratio
    const noise = std;
    const snr = mean / (noise + 1e-7);

    // Peak Detection
    const peaks = signal.reduce((peaks, val, i) => {
      if (i > 0 && i < signal.length - 1 && 
          val > signal[i-1] && val > signal[i+1] && 
          val > mean) {
        peaks.push(i);
      }
      return peaks;
    }, [] as number[]);

    const numPeaks = peaks.length;
    const peakHeights = peaks.map(i => signal[i]);
    const avgPeakHeight = peakHeights.reduce((a, b) => a + b, 0) / (numPeaks || 1);
    const peakVariability = Math.sqrt(
      peakHeights.reduce((a, b) => a + Math.pow(b - avgPeakHeight, 2), 0) / (numPeaks || 1)
    );

    // Interpeak intervals
    const interPeakIntervals = peaks.slice(1).map((peak, i) => peak - peaks[i]);
    const avgInterPeakInterval = interPeakIntervals.reduce((a, b) => a + b, 0) / (interPeakIntervals.length || 1);
    const stdInterPeakInterval = Math.sqrt(
      interPeakIntervals.reduce((a, b) => a + Math.pow(b - avgInterPeakInterval, 2), 0) / (interPeakIntervals.length || 1)
    );

    // Frequency Domain Features
    const fftResult = calculateFFT(signal);
    let dominantFreq = 0;
    let spectralEntropy = 0;
    let SQIp = 0;

    if (fftResult) {
      const { magnitudes, frequencies } = fftResult;
      dominantFreq = frequencies[magnitudes.indexOf(Math.max(...magnitudes))];
      spectralEntropy = calculateSpectralEntropy(magnitudes);
      SQIp = calculateSQIp(magnitudes, frequencies);
    }

    // Higher-order Statistics
    const SQIskew = skewness;
    const SQIkur = kurtosis;
    const SQIhos = Math.abs(SQIskew * SQIkur) / 5;

    return [
      mean, std, skewness, kurtosis,
      signalRange, zeroCrossings, rms, peakToPeak,
      snr,
      numPeaks, avgPeakHeight, peakVariability,
      avgInterPeakInterval, stdInterPeakInterval,
      dominantFreq, spectralEntropy, SQIhos, SQIp
    ];
  } catch (error) {
    console.warn('Feature extraction failed:', error);
    return null;
  }
}

export default function useMLSignalQuality() {
  const [model, setModel] = useState<any>(null);
  const [scaler, setScaler] = useState<any>(null);
  const [isModelLoaded, setIsModelLoaded] = useState(false);

  // Load the model and scaler on component mount
  useEffect(() => {
    const loadModel = async () => {
      try {
        // Dynamically import TensorFlow.js
        const tf = await import('@tensorflow/tfjs');
        const loadedModel = await tf.loadLayersModel('/tfjs_model/model.json');
        setModel(loadedModel);
        
        // Load scaler
        const response = await fetch('/scaler.json');
        const scalerData = await response.json();
        setScaler(scalerData);
        setIsModelLoaded(true);
      } catch (error) {
        console.error('Error loading model:', error);
        setIsModelLoaded(false);
      }
    };

    loadModel();
  }, []);

  const calculateSignalQuality = (data: ECGDataPoint[]): QualityRating => {
    // If model isn't loaded or data is empty, use basic calculation
    if (!isModelLoaded || !model || !scaler || data.length === 0) {
      return calculateBasicSignalQuality(data);
    }

    try {
      // Extract features from the ECG data
      const signal = data.map(point => point.value);
      const features = extractECGFeatures(signal);

      // If feature extraction fails, fall back to basic calculation
      if (!features) {
        return calculateBasicSignalQuality(data);
      }

      // Normalize features using the scaler
      const normalizedFeatures = features.map((feature, i) => 
        (feature - scaler.mean[i]) / scaler.scale[i]
      );

      // Convert to tensor and make prediction
      const inputTensor = model.tf.tensor2d([normalizedFeatures]);
      const prediction = model.predict(inputTensor);
      const classIndex = prediction.argMax(1).dataSync()[0]; // Get the predicted class index

      // Map the class index to quality rating
      switch (classIndex) {
        case 0: return "poor";
        case 1: return "good";
        case 2: return "excellent";
        default: return "poor"; // Fallback
      }

    } catch (error) {
      console.error('Error in ML signal quality calculation:', error);
      // Fall back to basic calculation if ML prediction fails
      return calculateBasicSignalQuality(data);
    }
  };

  return {
    calculateSignalQuality,
  };
} 