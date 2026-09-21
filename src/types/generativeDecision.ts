/**
 * MUSICBASE / SURGE STUDIO
 * Generative Music Decision Types (Phase 5 - Prompt 2)
 *
 * Formal types for UMR-Driven Generative Decision Engine:
 * - Musical Intent Derivation
 * - Multi-Candidate Generation & Multi-Criteria Scoring
 * - Musically Unsafe Rejection & Safety Validation
 * - Deterministic Generative Memory
 * - Controlled Variation & Anti-Loop Logic
 * - Indian Modal / Raga-Aware Decision Structures
 * 
 * 100% Offline-First, Deterministic, Sample-Accurate & Web Audio API Powered.
 */

import { SwaraName } from './musicalBrain';

/**
 * 10-Dimensional High-Level Musical Intent derived from UMR
 */
export interface MusicalIntent {
  emotionalState: 'calm' | 'intimate' | 'building' | 'climactic' | 'resolving' | 'energetic' | 'reflective' | 'devotional' | 'melancholic';
  phraseRole: 'antecedent' | 'consequent' | 'hook_statement' | 'transitional' | 'cadential_climax' | 'interlude_solo' | 'background_hold';
  melodicDensity: number; // [0.0, 1.0]
  rhythmicDensity: number; // [0.0, 1.0]
  harmonicTension: number; // [0.0, 1.0] (0 = stable tonic, 1 = high tension)
  silenceOpportunity: {
    isGap: boolean;
    durationBeats: number;
    fillPotential: number; // [0.0, 1.0]
    suggestedResponseRole: 'flute_flourish' | 'sitar_tihai' | 'strings_swell' | 'piano_turn' | 'guitar_riff' | 'rest';
  };
  ornamentActivity: {
    hasMeend: boolean;
    hasMurki: boolean;
    hasGamak: boolean;
    intensity: number; // [0.0, 1.0]
  };
  sectionRole: 'intro' | 'verse_mukhda' | 'pre_chorus' | 'chorus_hook' | 'interlude' | 'verse_antara' | 'chorus_climax' | 'outro';
  indianModalContext: {
    tonicSa: number; // MIDI pitch class (0-11)
    ragaName: string;
    dominantSwaras: SwaraName[];
    isModalFocus: boolean;
    vadiSwara?: SwaraName;
    samvadiSwara?: SwaraName;
  };
  climaxReleaseState: 'pre_build' | 'climax' | 'release' | 'steady' | 'breakdown';
  energyDynamic: number; // [0.0, 1.0]
}

/**
 * Criteria breakdown for candidate scoring
 */
export interface CandidateScoringBreakdown {
  melodyCompatibility: number;     // [0.0, 1.0]
  harmonicAuthority: number;       // [0.0, 1.0]
  voiceLeading: number;            // [0.0, 1.0]
  timingFit: number;               // [0.0, 1.0]
  expressiveStateMatch: number;    // [0.0, 1.0]
  instrumentDensityBalance: number;// [0.0, 1.0]
  phraseCadenceContext: number;    // [0.0, 1.0]
  indianModalFit: number;          // [0.0, 1.0]
  vocalMaskingSafety: number;      // [0.0, 1.0]
}

/**
 * Generative Candidate Container
 */
export interface GenerativeCandidate<T> {
  id: string;
  category: 
    | 'chord_progression' 
    | 'chord_voicing' 
    | 'bass_movement' 
    | 'drum_tabla_pattern' 
    | 'accompaniment' 
    | 'flute_sitar_fill' 
    | 'call_response' 
    | 'density_intensity' 
    | 'section_transition';
  data: T;
  score: number; // Strictly [0.0, 1.0]
  confidence: number; // Strictly [0.0, 1.0]
  breakdown: CandidateScoringBreakdown;
  status: 'selected' | 'rejected' | 'candidate';
  rejectionReason?: string;
  reason: string;
  provenance: string;
}

/**
 * Generative Decision Result with fallback tracking
 */
export interface GenerativeDecisionResult<T> {
  selected: GenerativeCandidate<T>;
  candidates: GenerativeCandidate<T>[];
  fallbackUsed: boolean;
  decisionSeed: number;
  executionTimeMs: number;
}

/**
 * Deterministic Musical Memory tracking past choices to drive anti-loop variation
 */
export interface GenerativeMusicalMemoryState {
  chordHistory: Array<{ beat: number; chordName: string; rootOffset: number; chordType: string }>;
  recentMotifs: Array<{ id: string; intervals: number[]; beat: number; role: string }>;
  phraseHistory: Array<{ phraseId: number; intent: string; energy: number; endBeat: number }>;
  sectionHistory: Array<{ sectionType: string; repetitionCount: number; averageDensity: number }>;
  instrumentActivityHistory: Record<string, number[]>; // Instrument -> density curve per beat
  repetitionCount: Record<string, number>;
  variationState: {
    verseRepetitionIndex: number;
    chorusRepetitionIndex: number;
    lastFillBeat: number;
    lastCallResponseBeat: number;
    themeVariationStep: number;
  };
}

/**
 * Specific Decision Payload Types
 */

export interface ChordProgressionPayload {
  progression: number[]; // semitone offsets from root (e.g. [0, 5, 7, 0])
  chordTypes: ('maj' | 'min' | 'sus2' | 'sus4' | 'maj7' | 'min7' | 'dom7' | 'add9' | 'm7b5' | '6')[];
  chordNames: string[];
  harmonicTensionProfile: number[];
  cadenceType: 'authentic' | 'half' | 'plagal' | 'deceptive' | 'modal_swara';
}

export interface ChordVoicingPayload {
  rootOffset: number;
  chordType: string;
  inversion: number; // 0=root, 1=1st, 2=2nd, 3=3rd
  bassOffset?: number;
  midiNotes: number[];
  spread: 'close' | 'open' | 'drop2';
  voiceLeadingDistance: number;
  topNoteMidi: number;
}

export interface BassMovementPayload {
  patternType: 'root_sustain' | 'walking' | 'octave_bounce' | 'passing_approach' | 'pedal_point' | 'syncopated_groove';
  noteSequence: Array<{
    beat: number;
    midi: number;
    duration: number;
    velocity: number;
    articulation: 'sustain' | 'staccato' | 'legato' | 'slap';
  }>;
}

export interface DrumTablaPatternPayload {
  grooveType: 'tabla_theka' | 'acoustic_groove' | 'hybrid_bollywood' | 'ambient_percussion' | 'intense_tihai';
  talaMeter: '4/4' | '3/4' | '6/8' | '7/8';
  patternMap: {
    kickOrDha: number[];
    snareOrTa: number[];
    hihatOrTin: number[];
    tablaBayan: number[];
    tablaDayan: number[];
    percussionFill: number[];
  };
  fillActive: boolean;
  velocityCurve: number[];
}

export interface AccompanimentPayload {
  instrument: 'piano' | 'guitar' | 'harmonium' | 'strings' | 'synth';
  role: 'arpeggiated' | 'strum' | 'pad_sustain' | 'syncopated_chops' | 'counter_melody';
  density: number; // [0.0, 1.0]
  dynamics: number; // [0.0, 1.0]
  registerOffsetOctaves: number;
  notes: Array<{
    beat: number;
    midi: number;
    duration: number;
    velocity: number;
  }>;
}

export interface FluteSitarFillPayload {
  instrument: 'flute' | 'sitar';
  fillType: 'flourish' | 'tihai' | 'meend_glide' | 'call_answer' | 'chikari_accent';
  startBeat: number;
  durationBeats: number;
  notes: Array<{
    beat: number;
    midi: number;
    duration: number;
    velocity: number;
    pitchBendCents?: number;
  }>;
  swaraSequence: SwaraName[];
}

export interface CallResponsePayload {
  isTriggered: boolean;
  leaderInstrument: 'vocal';
  responderInstrument: 'flute' | 'sitar' | 'violin' | 'piano' | 'guitar';
  responseIntervalBeats: number;
  sourceMotifId?: string;
  responseNotes: Array<{
    beat: number;
    midi: number;
    duration: number;
    velocity: number;
  }>;
}

export interface SectionTransitionPayload {
  fromSection: string;
  toSection: string;
  transitionStartBeat: number;
  transitionEndBeat: number;
  buildType: 'tihai_cadence' | 'dynamic_swell' | 'sudden_drop' | 'anticipation_fill';
  intensityCurve: number[];
  fillDensity: number;
}

export interface ArrangementDensityPayload {
  globalDensity: number; // [0.0, 1.0]
  activeStems: string[];
  dynamicIntensity: number; // [0.0, 1.0]
  headroomSafetyDb: number;
  stemBalances: Record<string, number>;
}
