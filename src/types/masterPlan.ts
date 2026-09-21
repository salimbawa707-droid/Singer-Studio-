/**
 * SURGE STUDIO / MUSICBASE — CANONICAL MASTERPLAN MODEL (PHASE 7)
 * 
 * MasterPlan defines the non-destructive mastering configuration,
 * parameter constraints, EQ curve, dynamics compressor, harmonic saturation,
 * stereo image width, true-peak limiter, and loudness targets.
 */

export interface MasterEqConfig {
  bypass: boolean;
  lowGainDb: number;     // -12.0 to +12.0 dB (Low Shelf / Sub 100Hz)
  lowFreqHz: number;     // 40 to 200 Hz
  midGainDb: number;     // -12.0 to +12.0 dB (Peaking Mid)
  midFreqHz: number;     // 250 to 4000 Hz
  midQ: number;          // 0.5 to 4.0
  highGainDb: number;    // -12.0 to +12.0 dB (High Shelf / Silk Air)
  highFreqHz: number;    // 5000 to 16000 Hz
}

export interface MasterCompressorConfig {
  bypass: boolean;
  thresholdDb: number;   // -36.0 to 0.0 dBFS
  ratio: number;         // 1.1:1 to 10:1
  attackMs: number;      // 0.1 to 100 ms
  releaseMs: number;     // 10 to 1000 ms
  makeupGainDb: number;  // 0.0 to +12.0 dB
  kneeDb: number;        // 0.0 to 12.0 dB (Soft Knee)
}

export interface MasterSaturationConfig {
  bypass: boolean;
  drive: number;          // 0.0 to 1.0 (Harmonic Saturation Drive)
  mix: number;            // 0.0 to 1.0 (Dry/Wet Mix)
  outputGainDb: number;   // -6.0 to +6.0 dB
}

export interface MasterStereoConfig {
  bypass: boolean;
  width: number;          // 0.0 (Mono) to 2.0 (Ultra Wide), 1.0 = Unity
  balance: number;        // -1.0 (Left) to 1.0 (Right), 0.0 = Center
}

export interface MasterLimiterConfig {
  bypass: boolean;
  thresholdDb: number;   // -12.0 to 0.0 dBFS
  ceilingDb: number;     // -3.0 to -0.1 dBTP (True Peak Ceiling)
  releaseMs: number;     // 5 to 500 ms
  lookaheadMs: number;   // 0.1 to 10 ms
}

export interface LoudnessTargetConfig {
  targetLufs: number;          // Target Integrated Loudness (e.g. -14 LUFS for Streaming)
  targetTruePeakDb: number;    // Target Max True Peak (e.g. -1.0 dBTP)
  autoLoudnessMatch: boolean;  // Automatically match target LUFS via pre-limiter gain
}

export interface DitherConfig {
  enabled: boolean;
  bitDepth: 16 | 24 | 32;
  type: 'triangular' | 'flat' | 'none';
}

export interface MasterPlan {
  version: number;             // Canonical Schema Version (7)
  presetName: string;          // Preset Name e.g. 'Streaming', 'Club Loud', 'Warm Analog'
  enabled: boolean;            // Master Bypass Toggle (false = direct bypass)
  inputGainDb: number;         // Pre-master Trim Input Gain (-12.0 to +12.0 dB)
  eq: MasterEqConfig;
  compressor: MasterCompressorConfig;
  saturation: MasterSaturationConfig;
  stereo: MasterStereoConfig;
  limiter: MasterLimiterConfig;
  target: LoudnessTargetConfig;
  dither: DitherConfig;
}

export function createDefaultMasterPlan(presetName: string = 'Streaming'): MasterPlan {
  const presets: Record<string, Partial<MasterPlan>> = {
    'Streaming': {
      inputGainDb: 0.0,
      eq: { bypass: false, lowGainDb: 1.0, lowFreqHz: 80, midGainDb: 0.0, midFreqHz: 1500, midQ: 1.0, highGainDb: 1.5, highFreqHz: 10000 },
      compressor: { bypass: false, thresholdDb: -14.0, ratio: 2.0, attackMs: 30.0, releaseMs: 150.0, makeupGainDb: 1.5, kneeDb: 3.0 },
      saturation: { bypass: false, drive: 0.15, mix: 0.25, outputGainDb: 0.0 },
      stereo: { bypass: false, width: 1.15, balance: 0.0 },
      limiter: { bypass: false, thresholdDb: -1.0, ceilingDb: -1.0, releaseMs: 50.0, lookaheadMs: 2.0 },
      target: { targetLufs: -14.0, targetTruePeakDb: -1.0, autoLoudnessMatch: true }
    },
    'Club Loud': {
      inputGainDb: 2.0,
      eq: { bypass: false, lowGainDb: 2.5, lowFreqHz: 60, midGainDb: -1.0, midFreqHz: 800, midQ: 1.2, highGainDb: 2.0, highFreqHz: 12000 },
      compressor: { bypass: false, thresholdDb: -18.0, ratio: 3.5, attackMs: 10.0, releaseMs: 80.0, makeupGainDb: 3.0, kneeDb: 2.0 },
      saturation: { bypass: false, drive: 0.35, mix: 0.4, outputGainDb: 0.0 },
      stereo: { bypass: false, width: 1.25, balance: 0.0 },
      limiter: { bypass: false, thresholdDb: -2.5, ceilingDb: -0.3, releaseMs: 30.0, lookaheadMs: 1.5 },
      target: { targetLufs: -9.0, targetTruePeakDb: -0.3, autoLoudnessMatch: true }
    },
    'Warm Analog': {
      inputGainDb: 0.5,
      eq: { bypass: false, lowGainDb: 1.5, lowFreqHz: 100, midGainDb: 1.0, midFreqHz: 2500, midQ: 0.8, highGainDb: -0.5, highFreqHz: 8000 },
      compressor: { bypass: false, thresholdDb: -12.0, ratio: 1.8, attackMs: 40.0, releaseMs: 200.0, makeupGainDb: 1.0, kneeDb: 5.0 },
      saturation: { bypass: false, drive: 0.4, mix: 0.5, outputGainDb: -0.5 },
      stereo: { bypass: false, width: 1.05, balance: 0.0 },
      limiter: { bypass: false, thresholdDb: -1.5, ceilingDb: -1.0, releaseMs: 80.0, lookaheadMs: 2.5 },
      target: { targetLufs: -13.0, targetTruePeakDb: -1.0, autoLoudnessMatch: true }
    },
    'Natural': {
      inputGainDb: 0.0,
      eq: { bypass: false, lowGainDb: 0.0, lowFreqHz: 80, midGainDb: 0.0, midFreqHz: 1000, midQ: 1.0, highGainDb: 0.5, highFreqHz: 10000 },
      compressor: { bypass: false, thresholdDb: -10.0, ratio: 1.5, attackMs: 50.0, releaseMs: 250.0, makeupGainDb: 0.5, kneeDb: 6.0 },
      saturation: { bypass: true, drive: 0.0, mix: 0.0, outputGainDb: 0.0 },
      stereo: { bypass: false, width: 1.0, balance: 0.0 },
      limiter: { bypass: false, thresholdDb: -0.5, ceilingDb: -1.0, releaseMs: 100.0, lookaheadMs: 3.0 },
      target: { targetLufs: -16.0, targetTruePeakDb: -1.0, autoLoudnessMatch: false }
    }
  };

  const preset = presets[presetName] || presets['Streaming'];

  return {
    version: 7,
    presetName,
    enabled: true,
    inputGainDb: preset.inputGainDb ?? 0.0,
    eq: preset.eq ?? { bypass: false, lowGainDb: 1.0, lowFreqHz: 80, midGainDb: 0.0, midFreqHz: 1500, midQ: 1.0, highGainDb: 1.5, highFreqHz: 10000 },
    compressor: preset.compressor ?? { bypass: false, thresholdDb: -14.0, ratio: 2.0, attackMs: 30.0, releaseMs: 150.0, makeupGainDb: 1.5, kneeDb: 3.0 },
    saturation: preset.saturation ?? { bypass: false, drive: 0.15, mix: 0.25, outputGainDb: 0.0 },
    stereo: preset.stereo ?? { bypass: false, width: 1.15, balance: 0.0 },
    limiter: preset.limiter ?? { bypass: false, thresholdDb: -1.0, ceilingDb: -1.0, releaseMs: 50.0, lookaheadMs: 2.0 },
    target: preset.target ?? { targetLufs: -14.0, targetTruePeakDb: -1.0, autoLoudnessMatch: true },
    dither: { enabled: true, bitDepth: 24, type: 'triangular' }
  };
}
