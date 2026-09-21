/**
 * SURGE STUDIO — PHASE 7 TRUE GENERATIVE COMPOSITION TYPES
 * 
 * Formal data types for:
 * - Composition Intent (Section & Phrase Level)
 * - Motif Generation & Multi-Dimensional Transformations
 * - Counter-Melody Composition & Masking Safety
 * - Call-and-Response Compositional Dialogue
 * - Rhythmic Ideas, Accents, Theka & Drum Variations
 * - Harmonic Composition (Anticipation, Passing Chords, Suspensions, Cadences)
 * - Section Identities & Compositional Contrast
 * - Generative Quality Gate Evaluation & Candidate Scoring
 * 
 * 100% Offline-First, Deterministic, Zero Math.random(), Canonical Authority Locked.
 */

import { InstrumentKey } from './generativeArrangement';
import { StructuralSectionHypothesis, SwaraName } from './musicalBrain';

export type CompositionalSectionType =
  | 'intro'
  | 'verse'
  | 'mukhda'
  | 'pre_chorus'
  | 'chorus'
  | 'hook'
  | 'interlude'
  | 'antara'
  | 'bridge'
  | 'climax'
  | 'outro';

export type MotifTransformationType =
  | 'statement'
  | 'continuation'
  | 'transposition'
  | 'rhythmic_transformation'
  | 'inversion'
  | 'augmentation'
  | 'diminution'
  | 'ornament_adaptation'
  | 'register_transformation'
  | 'instrument_reassignment';

export type RhythmicCharacterType =
  | 'sparse_floating'
  | 'steady_pulse'
  | 'syncopated_groove'
  | 'driving_dynamic'
  | 'tihai_cadence'
  | 'rubato_expressive';

export type HarmonicMovementType =
  | 'tonic_pedal'
  | 'diatonic_flow'
  | 'chromatic_passing'
  | 'suspended_build'
  | 'cadence_arrival'
  | 'modal_color';

export interface CompositionNote {
  beat: number;
  midi: number;
  durationBeats: number;
  velocity: number;
  swara?: SwaraName;
  centsOff?: number;
  articulation?: 'staccato' | 'legato' | 'accent' | 'meend' | 'gamak';
}

export interface CompositionIntent {
  intentId: string;
  sectionId: string;
  sectionType: CompositionalSectionType;
  startBeat: number;
  endBeat: number;
  durationBeats: number;
  primaryMusicalIdea: string;
  supportingIdea: string;
  tensionLevel: number; // [0.0, 1.0]
  releaseLevel: number; // [0.0, 1.0]
  rhythmicCharacter: RhythmicCharacterType;
  melodicDensity: number; // [0.0, 1.0]
  harmonicMovement: HarmonicMovementType;
  primaryRegister: 'low' | 'mid' | 'high' | 'ultra_high';
  targetInstrumentation: InstrumentKey[];
  motifUsage: 'seed_establishment' | 'thematic_statement' | 'development' | 'counterpoint' | 'climax_fusion' | 'dissolution';
  callResponseStrategy: 'none' | 'short_pickup' | 'two_bar_phrase' | 'polyphonic_interlock';
  transitionStrategy: 'smooth_swell' | 'rhythmic_fill' | 'tihai_drop' | 'tutti_hit' | 'subtle_fade';
  climaxStrategy: 'none' | 'harmonic_broadening' | 'rhythmic_frenzy' | 'octave_doubling' | 'maximum_polyphony';
}

export interface GeneratedMotif {
  motifId: string;
  name: string;
  sourceType: 'vocal_extracted' | 'tonic_derived' | 'modal_generated';
  transformationType: MotifTransformationType;
  parentMotifId?: string;
  assignedInstrument: InstrumentKey;
  startBeat: number;
  durationBeats: number;
  tonicMidi: number;
  ragaScale?: string;
  notes: CompositionNote[];
  recognizabilityScore: number; // [0.0, 1.0]
  noveltyScore: number; // [0.0, 1.0]
}

export interface CounterMelodyIdea {
  id: string;
  assignedInstrument: InstrumentKey;
  startBeat: number;
  durationBeats: number;
  notes: CompositionNote[];
  vocalMaskingRisk: number; // [0.0, 1.0] (0.0 = safe, 1.0 = heavy masking)
  harmonicCompliance: number; // [0.0, 1.0]
  modalCompliance: number; // [0.0, 1.0]
  contourType: 'oblique' | 'contrary' | 'interlocking_gaps';
  resolvesCleanly: boolean;
}

export interface CallAndResponseDialogue {
  id: string;
  gapId: number;
  leader: 'vocal' | InstrumentKey;
  responder: InstrumentKey;
  callStartBeat: number;
  callEndBeat: number;
  responseStartBeat: number;
  responseEndBeat: number;
  reEntryHeadroomBeats: number; // Must be >= 0.5 beats for safe vocal re-entry
  notes: CompositionNote[];
  musicalContext: string;
}

export interface RhythmicCompositionIdea {
  id: string;
  instrument: InstrumentKey;
  startBeat: number;
  durationBeats: number;
  thekaName?: string;
  syncopationLevel: number; // [0.0, 1.0]
  accentPattern: number[]; // beats where accents fall
  fillType: 'none' | 'phrase_landing' | 'tihai_triplet' | 'section_transition';
  events: Array<{
    beat: number;
    subdivision: number;
    drumType: 'kick' | 'snare' | 'hihat' | 'tom' | 'crash' | 'ge' | 'ke' | 'na' | 'tin' | 'dha' | 'dhin';
    velocity: number;
  }>;
}

export interface HarmonicCompositionPlan {
  beat: number;
  chordRoot: string;
  chordType: string;
  voicingMidis: number[];
  pedalToneMidi?: number;
  passingChord?: boolean;
  suspensionType?: 'sus2' | 'sus4' | '7th' | '9th' | 'none';
  cadencePreparation: boolean;
  tensionLevel: number;
}

export interface QualityGateEvaluation {
  candidateId: string;
  vocalCompatibility: number; // [0.0, 1.0]
  harmonicCompatibility: number; // [0.0, 1.0]
  rhythmicCompatibility: number; // [0.0, 1.0]
  modalRagaCompatibility: number; // [0.0, 1.0]
  phraseContinuity: number; // [0.0, 1.0]
  maskingRiskScore: number; // [0.0, 1.0] (0 = zero risk)
  reEntrySafetyScore: number; // [0.0, 1.0] (1.0 = safe headroom)
  noveltyScore: number; // [0.0, 1.0]
  overallQualityScore: number; // [0.0, 1.0]
  passed: boolean;
  rejectionReasons: string[];
}

export interface ComprehensiveCompositionPlan {
  songId: string;
  totalBeats: number;
  bpm: number;
  key: string;
  scale: string;
  compositionIntents: CompositionIntent[];
  generatedMotifs: GeneratedMotif[];
  counterMelodies: CounterMelodyIdea[];
  callResponses: CallAndResponseDialogue[];
  rhythmicIdeas: RhythmicCompositionIdea[];
  harmonicPlans: HarmonicCompositionPlan[];
  qualityGateReport: {
    totalEvaluated: number;
    passedCount: number;
    rejectedCount: number;
    allPassed: boolean;
    evaluations: QualityGateEvaluation[];
  };
  provenance: 'phase_7_true_generative_composition_engine';
}
