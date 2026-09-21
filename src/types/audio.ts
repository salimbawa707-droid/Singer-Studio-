import { SongArrangementSheet } from './musicDirector';

export type TrackType = 
  | 'vocal' 
  | 'accompaniment' 
  | 'drums' 
  | 'bass' 
  | 'piano' 
  | 'guitar' 
  | 'strings' 
  | 'synth' 
  | 'pad' 
  | 'percussion' 
  | 'flute' 
  | 'violin'
  | 'sitar'
  | 'harmonium'
  | 'tabla';

export interface ProjectTrack {
  id: string;
  name: string;
  type: TrackType | string;
  volume: number; // 0.0 to 1.0
  pan: number; // -1.0 to 1.0
  isMuted: boolean;
  isSolo: boolean;
  audioBuffer?: AudioBuffer | null;
  audioBlob?: Blob | null;
  assetId?: string; // Stable persistent asset reference
  duration?: number; // seconds
  color?: string;
}

export type StudioTrack = ProjectTrack;

export type SaveStatus = 
  | 'saved' 
  | 'saving' 
  | 'unsaved' 
  | 'error' 
  | 'recovering';

export type ProductionStage = 
  | 'new'
  | 'recording'
  | 'imported'
  | 'cleaning'
  | 'cleaned'
  | 'analyzingPitch'
  | 'analyzingBpmKey'
  | 'analysisComplete'
  | 'selectingInstruments'
  | 'generatingAccompaniment'
  | 'generatingIntro'
  | 'arranging'
  | 'mixing'
  | 'mastering'
  | 'completed'
  | 'exported';

export type ProductionStageId = 
  | 'record'
  | 'cleanup'
  | 'pitch'
  | 'bpm_key'
  | 'accompaniment'
  | 'pipeline'
  | 'mixer'
  | 'mastering'
  | 'export';

import { 
  CanonicalMusicalIntent, 
  CanonicalMusicPlan, 
  CanonicalCompositionPlan, 
  CanonicalArrangement 
} from './musicPlan';
import { MixPlan } from './mixPlan';
import { MasterPlan } from './masterPlan';
import { FinalRender } from './finalRender';
import { SongIdentity, MusicalMemory } from './songIdentityMemory';

export interface StudioProject {
  schemaVersion?: number; // Canonical schema version (default: 1)
  revision?: number; // Incremental edit revision number
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  bpm: number;
  key: string;
  scale: 'major' | 'minor';
  genre: string;
  duration?: number;
  durationSeconds?: number;
  tracks: ProjectTrack[];
  
  // Persistent Asset References
  rawVocalAssetId?: string | null;
  cleanedVocalAssetId?: string | null;
  masterMixAssetId?: string | null;
  
  isCleaned?: boolean;
  cleanupSettings?: DspPipelineSettings;
  cleanedAt?: string;
  isMastered?: boolean;
  masterPreset?: string;
  masterIntensity?: number;
  masterBrightness?: number;
  masterWidth?: number;
  notes?: string;
  stage?: ProductionStage;
  selectedInstruments?: string[];
  introDurationSeconds?: number;
  arrangementStyle?: string;
  energyLevel?: string;
  arrangementPlan?: any;
  detectedPitch?: PitchAnalysisResult | null;
  detectedBpmKey?: BpmKeyResult | null;
  vocalSongMap?: any | null;
  analysisEngineVersion?: number;
  analysisTimestamp?: string;
  analysisSourceAssetId?: string;
  recordingQualityReport?: any;
  rawVocalBuffer?: AudioBuffer | null;
  cleanedVocalBuffer?: AudioBuffer | null;
  lyrics?: string;
  selectedLanguage?: string;
  semanticMode?: 'auto' | 'conservative' | 'expressive';
  semanticAnalysis?: any;
  semanticArrangementSheet?: any;
  
  // Phase 5 Canonical Music Intelligence & Arrangement Models
  musicalIntent?: CanonicalMusicalIntent;
  musicPlan?: CanonicalMusicPlan;
  compositionPlan?: CanonicalCompositionPlan;
  canonicalArrangement?: CanonicalArrangement;
  
  // Phase 6 Canonical Mixer & DSP Models
  mixPlan?: MixPlan;

  // Phase 7 Canonical MasterPlan & FinalRender Models
  masterPlan?: MasterPlan;
  finalRender?: FinalRender;
  masterPlanVersion?: number;
  sourceMixVersion?: number;
  
  // Phase 11 Canonical Song Identity & Long-Term Musical Memory Engine
  songIdentity?: SongIdentity;
  musicalMemory?: MusicalMemory;
  
  // Dependency-aware non-destructive editing flags
  arrangementNeedsUpdate?: boolean;
  mixerNeedsUpdate?: boolean;
  masteringNeedsUpdate?: boolean;
  exportNeedsUpdate?: boolean;
  completedStages?: string[];
}

export interface DspPipelineSettings {
  dcRemoval: boolean;
  hpfCutoff: number; // 80Hz default
  hpfEnabled: boolean;
  noiseReductionDb: number; // 0 to -30dB
  noiseReductionEnabled: boolean;
  deEsserFreq: number; // 6000 to 9000 Hz
  deEsserGain: number; // -18 to 0 dB
  deEsserEnabled: boolean;
  compressorThreshold: number; // -40 to 0 dB
  compressorRatio: number; // 1 to 12
  compressorEnabled: boolean;
  limiterCeiling: number; // -0.1 to -3.0 dB
  limiterEnabled: boolean;
  normalizeGain: number; // 0.5 to 1.0
  normalizeEnabled: boolean;
  
  // Fine-Tuning Voice Restoration Extensions
  humNotchEnabled?: boolean;
  humNotchFreq?: 50 | 60; // 50 Hz (Asia/Europe) or 60 Hz (US/Americas)
  dePlosiveEnabled?: boolean;
  dePlosiveSensitivity?: number; // 0.1 to 1.0
  deClickEnabled?: boolean;
  warmthEnabled?: boolean;
  warmthGain?: number; // 0 to +6 dB (low-mid chest resonance)
  airClarityEnabled?: boolean;
  airClarityGain?: number; // 0 to +6 dB (high-shelf silk air)
  adaptiveNoiseProfileEnabled?: boolean;
  presetName?: string;
}

export interface RoomNoiseFingerprint {
  analyzedDurationMs: number;
  overallNoiseFloorRms: number;
  subBandNoiseFloor: Float32Array; // 16 critical bands
  binMagnitudes: Float32Array; // FFT bin profile
  stationarityPerBin: Float32Array; // 0.0 to 1.0 stationarity measure
  steadyStateHumDetected: boolean;
  steadyStateHumFreqs: number[]; // e.g. [50, 100, 150] or [60, 120]
  hasTransientOnset: boolean;
  spectralTilt: number; // Low vs High frequency noise ratio
}

export interface PitchAnalysisResult {
  frequency: number;
  noteName: string;
  midiNumber: number;
  centsOff: number;
  confidence: number;
  inTune: boolean;
}

export interface BpmKeyResult {
  bpm: number;
  key: string;
  scale: 'major' | 'minor' | 'Major' | 'Minor';
  confidence: number;
}

export type ScreenId = 
  | 'home' 
  | 'record' 
  | 'director'
  | 'pipeline'
  | 'tools'
  | 'cleanup' 
  | 'pitch' 
  | 'bpm_key' 
  | 'accompaniment' 
  | 'mixer' 
  | 'mastering'
  | 'projects' 
  | 'export' 
  | 'settings'
  | 'omni_test'
  | 'vak';

export interface StructuredRenderEvent {
  instrument: 'kick' | 'snare' | 'hihat' | 'bass' | 'pad' | 'piano' | 'acoustic_guitar' | 'electric_guitar' | 'strings' | 'flute' | 'synth' | string;
  startTime: number; // in seconds
  duration: number;  // in seconds
  midiNote?: number; // MIDI pitch number (e.g. 60 for C4)
  velocity?: number; // 0.0 to 1.0
  pan?: number;      // -1.0 (left) to 1.0 (right)
}

export interface StructuredPerformanceScore {
  totalDurationSec: number;
  bpm: number;
  rootKey: string;
  events: StructuredRenderEvent[];
}


