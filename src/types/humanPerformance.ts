/**
 * MUSICBASE / SURGE STUDIO
 * Human-Like Instrument Performance Engine Types (Phase 10)
 *
 * Types for humanized micro-timing, expressive velocity dynamics,
 * instrument-specific physical performance modeling, phrase-aware articulation,
 * and deterministic, offline-first performance rendering.
 */

import { InstrumentKey, InstrumentRole } from './generativeArrangement';
import { SongSectionArchetype } from './professionalSongArrangement';
import { NoteEvent } from '../services/instrumentSoundEngine';

export type PerformanceArticulationType =
  | 'legato'
  | 'staccato'
  | 'marcato'
  | 'tenuto'
  | 'accented'
  | 'ghost'
  | 'strum_down'
  | 'strum_up'
  | 'mizrab_da'
  | 'mizrab_ra'
  | 'bayan_mod'
  | 'bowed_soft'
  | 'bowed_accent'
  | 'breath_soft'
  | 'breath_accent';

export interface HumanizedNoteEvent extends NoteEvent {
  originalStartTime: number;
  originalDuration: number;
  originalVelocity: number;
  microTimingOffsetSeconds: number; // bounded e.g. [-0.015, 0.015] s
  humanizedVelocity: number;        // bounded [0.1, 1.0]
  articulation: PerformanceArticulationType;
  sustainMultiplier: number;        // [0.70, 1.30]
  expressionModulation: number;     // [0.0, 1.0] (e.g. vibrato/bow/bellows depth)
  contextSeed: number;
}

export interface InstrumentPerformanceProfile {
  instrument: InstrumentKey;
  role: InstrumentRole;
  timingGrooveBias: number;         // [-0.010, 0.010] (e.g. slight laid-back or push)
  velocityDynamicRange: number;     // [0.15, 0.40] dynamic spread
  repetitionDivergenceStrength: number; // [0.05, 0.25]
  chordStrumSpreadMs: number;       // [8, 35] ms across chord notes
  accentBeatWeight: number;         // downbeat / accent emphasis factor [1.05, 1.25]
  ghostNoteProbability: number;     // [0.0, 0.35]
  breathBellowsDrift: number;       // [0.0, 0.20]
  mizrabAlternation: boolean;
}

export interface HumanPerformanceContext {
  sectionArchetype: SongSectionArchetype;
  sectionEnergy: number;            // [0.0, 1.0]
  repetitionCount: number;          // 0, 1, 2...
  isVocalActive: boolean;
  vocalPitchRegister?: 'low' | 'mid' | 'high';
  isCallResponseActive: boolean;
  bpm: number;
  meter: string;
  harmonicTension: number;          // [0.0, 1.0]
}

export interface HumanPerformanceLedgerEntry {
  noteIndex: number;
  instrument: InstrumentKey;
  beatPosition: number;
  timingDeltaMs: number;
  velocityDelta: number;
  articulationApplied: PerformanceArticulationType;
  justification: string;
}

export interface HumanPerformanceResult {
  instrument: InstrumentKey;
  totalNotes: number;
  events: HumanizedNoteEvent[];
  performanceProfile: InstrumentPerformanceProfile;
  ledger: HumanPerformanceLedgerEntry[];
  averageVelocity: number;
  timingJitterStdDevMs: number;
  repeatVariationScore: number;
  isDeterministic: boolean;
}

/**
 * Optional Future Neural Performance Model Interface
 * Offline-first deterministic local engine is always the primary fallback.
 */
export interface NeuralPerformanceProvider {
  name: string;
  version: string;
  isAvailable(): boolean;
  humanizePerformance(
    events: NoteEvent[],
    instrument: InstrumentKey,
    context: HumanPerformanceContext
  ): Promise<HumanPerformanceResult> | HumanPerformanceResult;
}
