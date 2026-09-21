/**
 * SURGE STUDIO / MUSICBASE — CANONICAL FINAL RENDER MODEL (PHASE 7)
 * 
 * Represents the immutable result of the authoritative offline render pipeline.
 * Contains audio metrics, ITU-R BS.1770 LUFS analysis, true-peak calculation,
 * integrity checksum, and validation status for hand-off to Phase 8 Export.
 */

export interface LoudnessAnalysisResult {
  integratedLUFS: number;      // ITU-R BS.1770-4 K-weighted Integrated Loudness (LUFS)
  shortTermLUFS: number;       // Peak 3-second short-term loudness (LUFS)
  momentaryLUFS: number;       // Peak 400ms momentary loudness (LUFS)
  loudnessRangeLU: number;     // Loudness Range (LRA in LU)
  peakDbFS: number;            // Absolute sample peak in dBFS
  truePeakDbTP: number;        // Inter-sample 4x oversampled True Peak in dBTP
  clippingSamplesCount: number;// Number of samples exceeding 0.0 dBFS / ceiling
  isFiniteNumeric: boolean;    // Guaranteed zero NaN/Infinity values
}

export type RenderStatus = 'VALIDATED' | 'INVALIDATED' | 'FAILED';

export interface FinalRender {
  renderId: string;
  projectId: string;
  sourceMixVersion: number;
  masterPlanVersion: number;
  sampleRate: number;
  channels: number;
  durationSeconds: number;
  totalSamples: number;
  format: 'pcm_float32' | 'pcm_int24' | 'pcm_int16' | 'wav';
  peakDbFS: number;
  truePeakDbTP: number;
  integratedLUFS: number;
  shortTermLUFS: number;
  momentaryLUFS: number;
  loudnessRangeLU: number;
  clippingSamplesCount: number;
  renderTimestamp: string;
  renderEngineVersion: string; // e.g. "7.0.0"
  contentChecksum: string;     // SHA-256 or FNV-1a hash of final PCM waveform
  status: RenderStatus;
  validationReport: {
    passed: boolean;
    hasFiniteSamples: boolean;
    respectsTruePeakCeiling: boolean;
    validDuration: boolean;
    details: string;
  };
  // Pre-rendered stereo PCM channel data (or AudioBuffer pointer)
  pcmDataL?: Float32Array;
  pcmDataR?: Float32Array;
}
