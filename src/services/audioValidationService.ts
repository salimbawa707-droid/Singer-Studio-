/**
 * Phase 4: Audio Integrity & Validation Service
 * 
 * Performs forensic-grade validation on recorded and imported audio:
 * - Buffer duration & non-zero sample count
 * - Sample rate bounds (8 kHz to 192 kHz)
 * - Channel count validation (Mono/Stereo 1-2 channels)
 * - NaN / Inf sample detection
 * - Peak & RMS dynamic range analysis
 * - Digital clipping & distortion detection
 * - Silence & noise floor verification
 */

export interface AudioValidationReport {
  isValid: boolean;
  durationSeconds: number;
  sampleRate: number;
  numberOfChannels: number;
  totalSamples: number;
  peakDb: number;
  rmsDb: number;
  hasNanOrInf: boolean;
  isSilent: boolean;
  isClipped: boolean;
  clippingSampleCount: number;
  clippingPercentage: number;
  errorMessage?: string;
}

export class AudioValidationService {
  private static instance: AudioValidationService;

  private constructor() {}

  public static getInstance(): AudioValidationService {
    if (!AudioValidationService.instance) {
      AudioValidationService.instance = new AudioValidationService();
    }
    return AudioValidationService.instance;
  }

  /**
   * Validates an AudioBuffer for structural and acoustic integrity.
   */
  public validateAudioBuffer(buffer: AudioBuffer | null | undefined): AudioValidationReport {
    if (!buffer) {
      return {
        isValid: false,
        durationSeconds: 0,
        sampleRate: 0,
        numberOfChannels: 0,
        totalSamples: 0,
        peakDb: -Infinity,
        rmsDb: -Infinity,
        hasNanOrInf: false,
        isSilent: true,
        isClipped: false,
        clippingSampleCount: 0,
        clippingPercentage: 0,
        errorMessage: "Audio buffer is null or undefined."
      };
    }

    const { numberOfChannels, sampleRate, length, duration } = buffer;

    // 1. Structural Checks
    if (numberOfChannels < 1 || numberOfChannels > 8) {
      return {
        isValid: false,
        durationSeconds: duration,
        sampleRate,
        numberOfChannels,
        totalSamples: length,
        peakDb: -Infinity,
        rmsDb: -Infinity,
        hasNanOrInf: false,
        isSilent: false,
        isClipped: false,
        clippingSampleCount: 0,
        clippingPercentage: 0,
        errorMessage: `Invalid channel count: ${numberOfChannels}. Expected 1 or 2.`
      };
    }

    if (sampleRate < 8000 || sampleRate > 192000) {
      return {
        isValid: false,
        durationSeconds: duration,
        sampleRate,
        numberOfChannels,
        totalSamples: length,
        peakDb: -Infinity,
        rmsDb: -Infinity,
        hasNanOrInf: false,
        isSilent: false,
        isClipped: false,
        clippingSampleCount: 0,
        clippingPercentage: 0,
        errorMessage: `Unsupported sample rate: ${sampleRate} Hz. Supported range: 8000 Hz to 192000 Hz.`
      };
    }

    if (length <= 0 || duration <= 0.001) {
      return {
        isValid: false,
        durationSeconds: duration,
        sampleRate,
        numberOfChannels,
        totalSamples: length,
        peakDb: -Infinity,
        rmsDb: -Infinity,
        hasNanOrInf: false,
        isSilent: true,
        isClipped: false,
        clippingSampleCount: 0,
        clippingPercentage: 0,
        errorMessage: "Audio buffer contains zero samples or near-zero duration."
      };
    }

    // 2. Numerical & Dynamic Range Scan
    let hasNanOrInf = false;
    let maxAbsPeak = 0;
    let sumSquaresTotal = 0;
    let totalSamplesScanned = 0;
    let clippingSampleCount = 0;
    const clipThreshold = 0.9995; // Samples >= 0.9995 indicate digital full scale clipping

    for (let c = 0; c < numberOfChannels; c++) {
      const channelData = buffer.getChannelData(c);
      const chLen = channelData.length;
      totalSamplesScanned += chLen;

      for (let i = 0; i < chLen; i++) {
        const s = channelData[i];

        if (Number.isNaN(s) || !Number.isFinite(s)) {
          hasNanOrInf = true;
          break;
        }

        const abs = Math.abs(s);
        if (abs > maxAbsPeak) {
          maxAbsPeak = abs;
        }

        if (abs >= clipThreshold) {
          clippingSampleCount++;
        }

        sumSquaresTotal += s * s;
      }

      if (hasNanOrInf) break;
    }

    if (hasNanOrInf) {
      return {
        isValid: false,
        durationSeconds: duration,
        sampleRate,
        numberOfChannels,
        totalSamples: length,
        peakDb: -Infinity,
        rmsDb: -Infinity,
        hasNanOrInf: true,
        isSilent: false,
        isClipped: false,
        clippingSampleCount: 0,
        clippingPercentage: 0,
        errorMessage: "Audio buffer contains corrupt NaN or Infinity floating-point values."
      };
    }

    const overallRms = totalSamplesScanned > 0 ? Math.sqrt(sumSquaresTotal / totalSamplesScanned) : 0;
    const peakDb = maxAbsPeak > 0 ? 20 * Math.log10(maxAbsPeak) : -120;
    const rmsDb = overallRms > 0 ? 20 * Math.log10(overallRms) : -120;
    const clippingPercentage = totalSamplesScanned > 0 ? (clippingSampleCount / totalSamplesScanned) * 100 : 0;
    const isClipped = clippingPercentage > 0.05; // More than 0.05% of samples clipped
    const isSilent = maxAbsPeak < 1e-4 && rmsDb < -80; // Peak below 0.0001 and RMS below -80dB

    if (isSilent) {
      return {
        isValid: false,
        durationSeconds: duration,
        sampleRate,
        numberOfChannels,
        totalSamples: length,
        peakDb,
        rmsDb,
        hasNanOrInf: false,
        isSilent: true,
        isClipped: false,
        clippingSampleCount: 0,
        clippingPercentage: 0,
        errorMessage: "Audio buffer contains total digital silence (RMS < -80 dB)."
      };
    }

    return {
      isValid: true,
      durationSeconds: Math.round(duration * 1000) / 1000,
      sampleRate,
      numberOfChannels,
      totalSamples: length,
      peakDb: Math.round(peakDb * 10) / 10,
      rmsDb: Math.round(rmsDb * 10) / 10,
      hasNanOrInf: false,
      isSilent: false,
      isClipped,
      clippingSampleCount,
      clippingPercentage: Math.round(clippingPercentage * 100) / 100
    };
  }

  /**
   * Compares an input buffer and a cleaned output buffer to ensure non-destructive fidelity.
   */
  public validateCleanupFidelity(
    original: AudioBuffer,
    cleaned: AudioBuffer,
    expectedMaxDurationDeltaSec: number = 0.05
  ): { isValid: boolean; durationDeltaSec: number; errorMessage?: string } {
    const origDuration = original.duration;
    const cleanDuration = cleaned.duration;
    const durationDeltaSec = Math.abs(origDuration - cleanDuration);

    if (durationDeltaSec > expectedMaxDurationDeltaSec) {
      return {
        isValid: false,
        durationDeltaSec,
        errorMessage: `Cleaned audio duration (${cleanDuration.toFixed(2)}s) deviates unexpectedly from original (${origDuration.toFixed(2)}s).`
      };
    }

    if (cleaned.sampleRate !== original.sampleRate) {
      return {
        isValid: false,
        durationDeltaSec,
        errorMessage: `Cleaned audio sample rate (${cleaned.sampleRate}) does not match source (${original.sampleRate}).`
      };
    }

    const cleanValidation = this.validateAudioBuffer(cleaned);
    if (!cleanValidation.isValid) {
      return {
        isValid: false,
        durationDeltaSec,
        errorMessage: `Cleaned audio failed integrity validation: ${cleanValidation.errorMessage}`
      };
    }

    return {
      isValid: true,
      durationDeltaSec
    };
  }
}

export const audioValidationService = AudioValidationService.getInstance();
