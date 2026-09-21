/**
 * MUSICBASE / SURGE STUDIO
 * Generative Arrangement Realization Types (Phase 5 - Prompt 3)
 *
 * Formal types for:
 * - Generative Arrangement State & Section Structuring
 * - 9-Instrument Role Assignment (Piano, Guitar, Bass, Drums, Tabla, Strings, Flute, Harmonium, Sitar)
 * - Motif Variation & Call-and-Response Realization
 * - Repetition vs Novelty Balancing & Anti-Loop Memory
 * - Dynamic Global Song Arc Trajectories
 * - Pluggable Generative Music Model Provider Interface
 * - Renderer Integration Instructions
 *
 * 100% Offline-First, Deterministic, Sample-Accurate & Web Audio API Powered.
 */

import { UnifiedMusicalRepresentation, StructuralSectionHypothesis, MotifCluster, SwaraName } from './musicalBrain';
import { MusicalIntent, GenerativeCandidate, CandidateScoringBreakdown } from './generativeDecision';
import { ChordVoicing, MusicalTimeline } from '../services/intelligentArrangementEngine';
import { VocalSilenceGap } from '../services/vocalUnderstandingEngine';

export type InstrumentKey = 
  | 'piano'
  | 'guitar'
  | 'bass'
  | 'drums'
  | 'tabla'
  | 'strings'
  | 'flute'
  | 'harmonium'
  | 'sitar';

export type InstrumentRole =
  | 'OFF'
  | 'FOUNDATION'
  | 'SUPPORT'
  | 'TEXTURE'
  | 'RHYTHMIC'
  | 'MELODIC'
  | 'CALL'
  | 'RESPONSE'
  | 'FILL'
  | 'CLIMAX';

export type DynamicSongArcPhase =
  | 'introduction'
  | 'development'
  | 'build'
  | 'climax'
  | 'release'
  | 'resolution';

export interface GenerativeSectionState {
  sectionId: string;
  category: StructuralSectionHypothesis['category'];
  name: string;
  startBeat: number;
  endBeat: number;
  durationBeats: number;
  energy: number; // [0.0, 1.0]
  density: number; // [0.0, 1.0]
  emotionalState: MusicalIntent['emotionalState'];
  vocalActivity: number; // [0.0, 1.0] average vocal presence
  instrumentActivity: Record<InstrumentKey, number>; // [0.0, 1.0]
  instrumentRoles: Record<InstrumentKey, InstrumentRole>;
  harmonicRole: 'tonic_anchor' | 'tension_build' | 'modal_color' | 'cadential_resolution' | 'pedal_drone';
  rhythmicRole: 'sparse_pulse' | 'subdivided_groove' | 'syncopated_theka' | 'driving_tihai' | 'rubato_float';
  motifRole: 'statement' | 'development' | 'counter_melody' | 'recapitulation' | 'none';
  callResponseRole: 'lead_call' | 'instrumental_response' | 'simultaneous_polyphony' | 'rest';
  textureRole: 'sparse_acoustic' | 'warm_pad' | 'rhythmic_drive' | 'symphonic_full' | 'indian_classical_drone';
  transitionRole: 'smooth_flow' | 'anticipation_swell' | 'tihai_drop' | 'sudden_cut' | 'none';
  variationIndex: number; // 0 for 1st occurrence, 1 for 2nd, etc.
  repetitionCount: number;
  noveltyScore: number; // [0.0, 1.0]
  confidence: number; // [0.0, 1.0]
  provenance: string;
}

export interface MotifArrangementEvent {
  motifId: string;
  sourceBeat: number;
  targetBeat: number;
  durationBeats: number;
  variationIndex: number;
  assignedInstrument: InstrumentKey;
  variationType: 'exact_repetition' | 'transposition' | 'rhythmic_dilation' | 'inversion' | 'ornamented_flourish';
  transpositionSemitones: number;
  notes: Array<{
    beat: number;
    midi: number;
    duration: number;
    velocity: number;
    swara?: SwaraName;
  }>;
}

export interface CallResponseRealizationEvent {
  eventId: string;
  gapId: number;
  startBeat: number;
  endBeat: number;
  durationBeats: number;
  leaderPhraseId: number;
  responderInstrument: InstrumentKey;
  responseRole: InstrumentRole;
  isSuppressedDueToShortGap: boolean;
  vocalReentrySafetyBeats: number; // Headroom before next vocal onset
  notes: Array<{
    beat: number;
    midi: number;
    duration: number;
    velocity: number;
    swara?: SwaraName;
  }>;
}

export interface SectionTransitionRealization {
  fromSectionCategory: string;
  toSectionCategory: string;
  transitionStartBeat: number;
  transitionEndBeat: number;
  durationBeats: number;
  buildType: 'tihai_cadence' | 'dynamic_swell' | 'sudden_drop' | 'anticipation_fill' | 'smooth_crossfade';
  primaryFillInstrument: InstrumentKey;
  fillVelocityCurve: number[];
  crescendoLevel: number; // [0.0, 1.0]
}

export interface DynamicSongArcState {
  globalPhaseByBeat: DynamicSongArcPhase[];
  peakClimaxBeat: number;
  arcTrajectory: number[]; // [0.0, 1.0] continuous curve per beat
  vocalCouplingWeight: number; // [0.0, 1.0]
}

export interface RepetitionNoveltyTracking {
  sectionRepetitions: Record<string, number>;
  phraseRepetitions: Record<string, number>;
  motifOccurrences: Record<string, number>;
  instrumentPairingFrequencies: Record<string, number>;
  averageNoveltyScore: number;
  antiLoopDivergenceApplied: boolean;
}

/**
 * Complete Realized Generative Arrangement Plan
 */
export interface GenerativeArrangementPlan {
  songId: string;
  totalBeats: number;
  totalDurationSeconds: number;
  bpm: number;
  key: string;
  scale: 'major' | 'minor';
  sections: GenerativeSectionState[];
  instrumentRolesByBeat: Record<InstrumentKey, InstrumentRole[]>;
  instrumentDensityByBeat: Record<InstrumentKey, number[]>;
  dynamicArc: DynamicSongArcState;
  motifEvents: MotifArrangementEvent[];
  callResponseEvents: CallResponseRealizationEvent[];
  transitions: SectionTransitionRealization[];
  repetitionNovelty: RepetitionNoveltyTracking;
  chordVoicingsByBeat: ChordVoicing[];
  chordMapByBeat: number[];
  overallDensityCurve: number[];
  timeline: MusicalTimeline;
  confidence: number;
  provenance: string;
}

/**
 * Lightweight Model Provider Abstraction for future Neural / ML backends
 */
export interface ArrangementContextAnalysis {
  umr: UnifiedMusicalRepresentation;
  totalBeats: number;
  averageVocalIntensity: number;
  emotionalArc: string;
  dominantRaga?: string;
  highTensionBeats: number[];
}

export interface GenerativeMusicModelProvider {
  name: string;
  version: string;
  analyzeArrangementContext(umr: UnifiedMusicalRepresentation): ArrangementContextAnalysis;
  suggestInstrumentRoles(
    section: GenerativeSectionState,
    intent: MusicalIntent,
    memoryState: any
  ): Record<InstrumentKey, InstrumentRole>;
  suggestMotifVariation(
    motif: MotifCluster,
    variationIndex: number,
    targetInstrument: InstrumentKey,
    rootSaMidi: number
  ): MotifArrangementEvent;
  suggestTransition(
    fromSection: GenerativeSectionState,
    toSection: GenerativeSectionState,
    intent: MusicalIntent
  ): SectionTransitionRealization;
  scoreGenerativeCandidate<T>(
    candidate: GenerativeCandidate<T>,
    intent: MusicalIntent,
    umr?: UnifiedMusicalRepresentation
  ): CandidateScoringBreakdown;
}
