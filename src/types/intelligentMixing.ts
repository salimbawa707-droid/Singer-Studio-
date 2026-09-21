/**
 * SURGE STUDIO — PHASE 9
 * AI-Assisted Professional Mixing Engine Types & Interfaces
 *
 * Defines the complete song-aware mix analysis, vocal-first stem prioritization,
 * dynamic multi-band masking de-confliction, low-end coordination, section automation,
 * translation verification, explainable decision ledger, and optional neural provider interface.
 */

import { MusicalTimeline } from '../services/intelligentArrangementEngine';
import { UnifiedMusicalRepresentation } from './musicalBrain';
import { MacroSongArrangement } from './professionalSongArrangement';

export type MixSectionType =
  | 'INTRO'
  | 'VERSE'
  | 'PRE_CHORUS'
  | 'CHORUS'
  | 'INTERLUDE'
  | 'ANTARA'
  | 'CLIMAX'
  | 'OUTRO';

export type StemCategory =
  | 'LEAD_VOCAL'
  | 'KICK'
  | 'SNARE'
  | 'TABLA'
  | 'BASS'
  | 'PIANO'
  | 'GUITAR'
  | 'STRINGS'
  | 'FLUTE'
  | 'HARMONIUM'
  | 'SITAR'
  | 'BACKING_ACCENT';

export interface StemFrequencyRole {
  hpfCutoffHz: number;
  mudCutFreqHz: number;
  mudCutDepthDb: number;
  presenceFreqHz: number;
  presenceBoostDb: number;
  airShelfFreqHz: number;
  airShelfBoostDb: number;
  vocalNotchFreqHz: number;
  maxVocalNotchDepthDb: number;
}

export interface StemDynamicsRole {
  compThresholdDb: number;
  compRatio: number;
  attackMs: number;
  releaseMs: number;
  transientPreserve: number; // [0.0, 1.0] (1.0 = sharp attack preservation)
  levelingTargetRmsDb: number;
}

export interface StemStereoRole {
  basePan: number;          // [-1.0 (L) to +1.0 (R), 0 = Center]
  baseWidth: number;        // [0.0 (Mono) to 1.5 (Extra wide)]
  isSubMonoLocked: boolean; // Always true for Kick, Bass, Tabla Bayan
  phaseAligned: boolean;
}

export interface StemDepthRole {
  baseReverbSend: number;     // [0.0, 0.35]
  earlyReflectionAmount: number;
  dryWetRatio: number;
  decayPerception: 'TIGHT' | 'NATURAL_ROOM' | 'WARM_HALL' | 'LUSH_EXPANSIVE';
}

export interface StemMixProfile {
  stemType: string;
  category: StemCategory;
  frequency: StemFrequencyRole;
  dynamics: StemDynamicsRole;
  stereo: StemStereoRole;
  depth: StemDepthRole;
}

export interface SectionMixTrajectory {
  sectionIndex: number;
  sectionType: MixSectionType;
  startBeat: number;
  endBeat: number;
  vocalImportance: number;       // [0.0, 1.0]
  arrangementDensity: number;    // [0.0, 1.0]
  emotionalIntensity: number;    // [0.0, 1.0]
  stereoWidthScale: number;      // [0.85, 1.30]
  reverbDepthScale: number;      // [0.60, 1.50]
  vocalDuckingDb: number;        // [-4.5 to 0 dB]
  bassWeightScale: number;       // [0.85, 1.15]
  activeStems: string[];
}

export interface FrequencyMaskingCollision {
  collisionId: string;
  sourceStem: string;
  targetStem: string;
  bandHz: [number, number];
  severity: number;              // [0.0, 1.0]
  resolution: 'DYNAMIC_EQ_NOTCH' | 'LOW_END_SIDECHAIN' | 'STEREO_PAN_SEPARATION' | 'DUCKING_ATTENUATION';
  attenuationDb: number;
  explanation: string;
}

export interface LowEndCoordinationProfile {
  kickCenterHz: number;          // 55 - 65 Hz
  bassCenterHz: number;          // 80 - 110 Hz
  tablaBayanCenterHz: number;    // 90 - 130 Hz
  subMonoFloorHz: number;        // 110 Hz (strict mono anchor)
  kickSidechainDuckOnBassDb: number; // -1.5 to -3.0 dB
  tablaBayanDampOnKickDb: number;    // -1.0 to -2.5 dB
  headroomPreservedDb: number;
  monoCompatibilityMaintained: boolean;
}

export interface ExplainableMixDecision {
  id: string;
  beat: number;
  timeSec: number;
  sectionType: MixSectionType;
  category:
    | 'VOCAL_PRIORITY'
    | 'FREQUENCY_MASKING'
    | 'LOW_END_COORDINATION'
    | 'STEREO_IMAGING'
    | 'DEPTH_CONTROL'
    | 'DYNAMIC_LEVELING'
    | 'SECTION_AUTOMATION'
    | 'MASTER_HEADROOM_SAFETY';
  affectedStems: string[];
  reason: string;
  actionTaken: string;
}

export interface MixTranslationVerification {
  stereoCorrelationCoeff: number;   // [0.75, 1.0] (>= 0.80 = excellent mono translation)
  monoFoldDownLevelLossDb: number;  // [< 1.5 dB loss]
  lowEndPhaseCoherence: number;     // [0.90, 1.0]
  vocalIntelligibilityScore: number;// [0.85, 1.0]
  peakHeadroomDbfs: number;         // <= -0.3 dBFS
  dynamicRangeLu: number;           // 8.0 - 14.0 LU
  zeroClippingVerified: boolean;
  zeroNonFiniteVerified: boolean;
  isMonoTranslationSafe: boolean;
}

export interface SongMixAnalysis {
  totalDuration: number;
  totalBeats: number;
  bpm: number;
  key: string;
  vocalDominanceRatio: number;
  vocalPresenceZoneHz: [number, number];
  lowEnd: LowEndCoordinationProfile;
  sections: SectionMixTrajectory[];
  stemProfiles: Record<string, StemMixProfile>;
  collisions: FrequencyMaskingCollision[];
  decisionLog: ExplainableMixDecision[];
  translation: MixTranslationVerification;
}

/**
 * Optional Future Neural Mix Provider Interface
 * Allows plug-in neural mixing models while maintaining 100% offline deterministic fallback.
 */
export interface NeuralMixModelProvider {
  name: string;
  version: string;
  isAvailable(): boolean;
  optimizeMix?(analysis: SongMixAnalysis): Promise<SongMixAnalysis>;
}
