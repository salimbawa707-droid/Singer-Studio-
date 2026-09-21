/**
 * MUSICBASE / SURGE STUDIO
 * Professional Song Arrangement Engine Types (Phase 8)
 * 
 * Formal interfaces and types for full-song arrangement planning:
 * - Macro Song Architecture (Intro, Verse/Mukhda, Pre-Chorus, Chorus, Interlude, Antara, Climax, Outro)
 * - 9-Instrument Role Allocation & Dynamic Density Trajectories
 * - Register Allocation & Frequency Coordination
 * - Section-by-Section Orchestration & Thematic Development
 * - Transitions, Tihai Cadences, and Dynamic Swells
 * - 100% Deterministic & Offline-First
 */

import { InstrumentKey, InstrumentRole, DynamicSongArcPhase } from './generativeArrangement';
import { SongSectionCategory } from './musicalBrain';
import { ChordVoicing, MusicalTimeline } from '../services/intelligentArrangementEngine';

export type SongSectionArchetype =
  | 'intro'
  | 'verse_mukhda'
  | 'pre_chorus'
  | 'chorus_hook'
  | 'interlude'
  | 'verse_antara'
  | 'chorus_climax'
  | 'outro';

export type ArrangementSectionPurpose =
  | 'opening'
  | 'development'
  | 'buildup'
  | 'anticipation'
  | 'climax'
  | 'release'
  | 'resolution';

export type FrequencyRegister = 'sub_bass' | 'low_mid' | 'mid' | 'high_mid' | 'ultra_high';

export interface InstrumentOrchestrationSpec {
  instrument: InstrumentKey;
  role: InstrumentRole;
  isActive: boolean;
  isForeground: boolean;
  isRhythmicFoundation: boolean;
  isMelodicSupport: boolean;
  isCallResponse: boolean;
  isFillLead: boolean;
  isClimaxDriver: boolean;
  targetDensity: number; // [0.0, 1.0]
  register: FrequencyRegister;
  panPosition: number; // [-1.0 (left), 1.0 (right)]
  velocityScale: number; // [0.0, 1.0]
}

export interface SectionArrangementPlan {
  sectionId: string;
  name: string;
  category: SongSectionCategory;
  archetype: SongSectionArchetype;
  purpose: ArrangementSectionPurpose;
  startBeat: number;
  endBeat: number;
  durationBeats: number;
  targetDensity: number; // [0.0, 1.0]
  targetEnergy: number; // [0.0, 1.0]
  foregroundInstrument: InstrumentKey;
  rhythmicFoundation: InstrumentKey[];
  activeInstruments: InstrumentKey[];
  supportingInstruments: InstrumentKey[];
  backgroundTexture: InstrumentKey[];
  instrumentSpecs: Record<InstrumentKey, InstrumentOrchestrationSpec>;
  harmonicProgression: ChordVoicing[];
  transitionIn?: SectionTransitionSpec;
  transitionOut?: SectionTransitionSpec;
  repetitionIndex: number; // 0 for 1st, 1 for 2nd, etc.
  evolutionFactor: number; // [0.0, 1.0] escalation across repetitions
  vocalMaskingProtectionLevel: number; // [0.0, 1.0]
  noveltyScore: number;
}

export interface SectionTransitionSpec {
  transitionType: 'fill' | 'pickup' | 'tihai_cadence' | 'string_swell' | 'sudden_drop' | 'crossfade';
  startBeat: number;
  endBeat: number;
  durationBeats: number;
  primaryLeadInstrument: InstrumentKey;
  secondarySupportInstruments: InstrumentKey[];
  crescendoCurve: number[];
  anticipationTension: number; // [0.0, 1.0]
}

export interface MacroSongArrangement {
  songId: string;
  bpm: number;
  key: string;
  scale: 'major' | 'minor';
  totalBeats: number;
  totalDurationSeconds: number;
  sections: SectionArrangementPlan[];
  overallDensityCurve: number[]; // continuous [0.0, 1.0] per beat
  macroEnergyTrajectory: number[]; // continuous [0.0, 1.0] per beat
  climaxBeat: number;
  instrumentDensityByBeat: Record<InstrumentKey, number[]>;
  instrumentRolesByBeat: Record<InstrumentKey, InstrumentRole[]>;
  transitions: SectionTransitionSpec[];
  timeline: MusicalTimeline;
  repetitionEvolutionSummary: {
    versesCount: number;
    chorusesCount: number;
    hasDistinctAntara: boolean;
    hasEscalatingClimax: boolean;
    hasProperIntroAndOutro: boolean;
    antiLoopVerificationPassed: boolean;
  };
  confidence: number;
  provenance: string;
}
