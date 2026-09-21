/**
 * MUSICBASE / SURGE STUDIO — PHASE 5 CANONICAL MUSIC INTELLIGENCE & ARRANGEMENT TYPES
 * 
 * Formal data types for:
 * 1. Canonical Musical Intent
 * 2. Canonical Music Plan (Single Authority Decision Model)
 * 3. Canonical Composition Plan (Motifs, Harmony, Counterpoint)
 * 4. Canonical Arrangement & Event Representation (Editable, Structured)
 * 5. Sample-Accurate Musical Timeline (Bars / Beats / Ticks / Seconds)
 * 6. Vocal Range Estimates from Phase 4 DSP Analysis
 * 7. Music & Arrangement Validation Models
 * 8. Deterministic Seed & Versioning Metadata
 * 
 * 100% Offline-First, Deterministic, Zero Math.random(), Canonical Authority Locked.
 */

export type MusicalScaleMode = 'major' | 'minor' | 'dorian' | 'mixolydian' | 'phrygian' | 'lydian' | 'harmonic_minor' | 'melodic_minor' | 'raga_yaman' | 'raga_bhairav' | 'raga_kafi' | 'raga_bilawal' | 'raga_darbari' | 'raga_bhinna_shadja';

export type SongSectionType = 
  | 'intro'
  | 'verse_mukhda'
  | 'pre_chorus'
  | 'chorus_hook'
  | 'interlude'
  | 'verse_antara'
  | 'bridge'
  | 'chorus_climax'
  | 'outro';

export type InstrumentRole = 
  | 'LEAD_VOCAL'
  | 'FOUNDATION'
  | 'RHYTHMIC'
  | 'HARMONIC_PAD'
  | 'HARMONIC_ARPEGGIO'
  | 'MELODIC_LEAD'
  | 'CALL'
  | 'RESPONSE'
  | 'FILL'
  | 'BASS_ANCHOR'
  | 'PERCUSSION_ACCENT'
  | 'CLIMAX_SWELL'
  | 'OFF';

export type DynamicLevel = 'pp' | 'p' | 'mp' | 'mf' | 'f' | 'ff';

/**
 * 1. Canonical Musical Intent
 */
export interface CanonicalMusicalIntent {
  intentId: string;
  genre: string;
  mood: string;
  energyLevel: 'soft' | 'balanced' | 'powerful' | 'cinematic';
  tempoPreference?: number | 'unspecified';
  keyPreference?: string | 'unspecified';
  scalePreference?: MusicalScaleMode | 'unspecified';
  timeSignature: {
    numerator: number;
    denominator: number;
  };
  vocalStyle?: string | 'unspecified';
  instrumentPreferences: string[];
  referenceStyle?: string;
  songForm?: SongSectionType[];
  targetDurationSeconds?: number;
  targetDensity: number; // 0.0 (minimalist) to 1.0 (dense symphonic)
  rhythmicCharacter: 'sparse_pulse' | 'steady_pulse' | 'syncopated_groove' | 'driving_dynamic' | 'indian_keherwa' | 'indian_dadra' | 'indian_rupak' | 'rubato_expressive';
  harmonicCharacter: 'simple_diatonic' | 'rich_extended' | 'modal_indian' | 'cinematic_tensions' | 'jazz_pop_slash';
  derivationSource: 'user_explicit' | 'vocal_analysis_inferred' | 'ai_proposed' | 'genre_default';
}

/**
 * 2. Vocal Range Estimation from Phase 4 DSP Data
 */
export interface VocalRangeEstimate {
  lowestMidi: number;
  lowestNoteName: string;
  highestMidi: number;
  highestNoteName: string;
  tessituraLowMidi: number;
  tessituraHighMidi: number;
  estimatedVoiceType: 'bass' | 'baritone' | 'tenor' | 'alto' | 'mezzo_soprano' | 'soprano' | 'undefined';
  confidence: number; // [0.0, 1.0]
  voicedFrameRatio: number;
  isReliable: boolean;
}

/**
 * 3. Canonical Structured Timeline Conversions
 */
export interface MusicalTimelinePoint {
  bar: number;      // 1-indexed (e.g. Bar 1)
  beat: number;     // 1-indexed within bar (e.g. Beat 1.0 to 4.0)
  totalBeats: number; // 0-indexed absolute beats from start of song
  ticks: number;    // Standard 480 PPQ (Pulses Per Quarter Note)
  seconds: number;  // Absolute time in seconds
}

/**
 * 4. Structured Chord Event
 */
export interface ChordEvent {
  id: string;
  chordName: string;            // e.g. 'Am7', 'F#m9', 'G/B', 'Cadd9'
  root: string;                 // 'C', 'C#', 'D', etc.
  rootMidiPitchClass: number;   // 0 to 11
  quality: 'maj' | 'min' | 'dim' | 'aug' | 'sus2' | 'sus4' | 'maj7' | 'min7' | 'dom7' | 'add9' | 'm7b5' | '6' | 'min6' | 'slash';
  inversion: number;            // 0 = root position, 1 = 1st, 2 = 2nd, 3 = 3rd
  bassMidiPitchClass?: number;  // Slash chord bass note
  startBeat: number;
  durationBeats: number;
  startSeconds: number;
  durationSeconds: number;
  midiNotes: number[];          // Voice-led target MIDI notes [e.g. 60, 64, 67, 71]
  tensionScore: number;         // 0.0 to 1.0
  source: 'vocal_harmony_derived' | 'intent_rule_generated' | 'ai_proposed' | 'user_edited';
  confidence: number;           // 0.0 to 1.0
}

/**
 * 5. Structured Note Event (for Melodic, Bass, Motif, and Harmonic realization)
 */
export interface NoteEvent {
  id: string;
  trackId: string;
  instrument: string;
  midiPitch: number;            // 0 to 127
  noteName: string;             // 'C4', 'A#3'
  startBeat: number;
  durationBeats: number;
  startSeconds: number;
  durationSeconds: number;
  velocity: number;             // 1 to 127
  articulation: 'legato' | 'staccato' | 'accent' | 'tenuto' | 'meend' | 'gamak' | 'slide' | 'ghost';
  phraseId?: string;
  sectionId?: string;
  isVocalResponse?: boolean;
}

/**
 * 6. Structured Rhythmic Event (for Drums, Percussion, Tabla Theka)
 */
export interface RhythmicEvent {
  id: string;
  trackId: string;
  instrument: 'kick' | 'snare' | 'hihat_closed' | 'hihat_open' | 'crash' | 'ride' | 'tom_low' | 'tom_mid' | 'tom_high' | 'tabla_ge' | 'tabla_na' | 'tabla_tin' | 'tabla_dha' | 'tabla_dhin' | 'shaker' | 'tambourine' | 'clap';
  startBeat: number;
  durationBeats: number;
  startSeconds: number;
  velocity: number; // 1 to 127
  subdivision: 'quarter' | 'eighth' | 'sixteenth' | 'triplet' | 'thirtysecond';
  accent: boolean;
  sectionId?: string;
}

/**
 * 7. Canonical Section Representation
 */
export interface ArrangementSectionDef {
  id: string;
  type: SongSectionType;
  name: string;
  startBar: number;
  startBeat: number;
  startSeconds: number;
  durationBars: number;
  durationBeats: number;
  durationSeconds: number;
  energy: number; // 0.0 to 1.0
  density: number; // 0.0 to 1.0
  activeInstruments: string[];
  instrumentRoles: Record<string, InstrumentRole>;
  chords: ChordEvent[];
  drumGrooveName: string;
  transitionType: 'none' | 'tihai_drop' | 'fill' | 'riser' | 'breakdown_cut' | 'smooth_swell';
  isVocalActive: boolean;
  vocalSilenceFillAllowed: boolean;
}

/**
 * 8. Canonical Track Representation
 */
export interface ArrangementTrackDef {
  id: string;
  name: string;
  role: InstrumentRole;
  instrumentKey: string;
  category: 'rhythm' | 'bass' | 'harmony' | 'melody' | 'vocal' | 'fx';
  panIntent: number;   // -1.0 (Left) to +1.0 (Right)
  volumeIntent: number;// 0.0 to 1.0
  midiNotes: NoteEvent[];
  rhythmicHits: RhythmicEvent[];
  assignedSections: string[]; // section IDs
  muted: boolean;
  solo: boolean;
}

/**
 * 9. Canonical Music Plan (The Authoritative Musical Decision Blueprint)
 */
export interface CanonicalMusicPlan {
  planId: string;
  version: number;
  generationVersion: number;
  seed: number;
  createdAt: string;
  
  // Authoritative Core Musical Foundation
  tempo: number;
  key: string;
  mode: MusicalScaleMode;
  timeSignature: {
    numerator: number;
    denominator: number;
  };
  genre: string;
  mood: string;
  
  // Decision Rationale & Traceability
  tempoDecisionSource: 'explicit_user' | 'project_validated' | 'high_confidence_vocal_analysis' | 'genre_default';
  keyDecisionSource: 'explicit_user' | 'project_validated' | 'high_confidence_vocal_analysis' | 'vocal_range_inferred' | 'genre_default';
  detectedVocalTempo?: number;
  detectedVocalKey?: string;
  vocalRange?: VocalRangeEstimate;
  
  // High-Level Structured Architecture
  energyTrajectory: Array<{ beat: number; energy: number }>;
  sections: ArrangementSectionDef[];
  globalChords: ChordEvent[];
  instrumentation: string[];
  rhythmicGrooveStyle: string;
  
  // Validation status
  isValid: boolean;
  validationWarnings: string[];
  validationErrors: string[];
}

/**
 * 10. Canonical Composition Plan (The Thematic, Motivic & Harmonic Foundation)
 */
export interface CanonicalCompositionPlan {
  compositionId: string;
  musicPlanId: string;
  generationVersion: number;
  seed: number;
  createdAt: string;
  
  primaryMotifs: Array<{
    motifId: string;
    name: string;
    pitches: number[]; // MIDI notes
    rhythmicDurations: number[]; // beats
    sourceSection: SongSectionType;
    assignedInstrument: string;
  }>;
  counterpointLines: Array<{
    phraseId: string;
    targetSection: SongSectionType;
    assignedInstrument: string;
    notes: NoteEvent[];
  }>;
  harmonicCadences: Array<{
    bar: number;
    type: 'perfect_authentic' | 'plagal' | 'half' | 'deceptive' | 'tihai_cadence';
    chords: ChordEvent[];
  }>;
}

/**
 * 11. Canonical Arrangement (The Complete Realized Multi-Track Musical Work)
 */
export interface CanonicalArrangement {
  arrangementId: string;
  arrangementVersion: number;
  musicPlanId: string;
  compositionPlanId?: string;
  seed: number;
  createdAt: string;
  
  totalDurationSeconds: number;
  totalBars: number;
  totalBeats: number;
  
  sections: ArrangementSectionDef[];
  tracks: ArrangementTrackDef[];
  allChordEvents: ChordEvent[];
  allNoteEvents: NoteEvent[];
  allRhythmicEvents: RhythmicEvent[];
  
  // Provenance & Observability
  generationDurationMs: number;
  isFullyValidated: boolean;
  warnings: string[];
}

/**
 * 12. Music Plan & Arrangement Validation Results
 */
export interface ValidationCheckResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  metrics: {
    tempo: number;
    key: string;
    sectionCount: number;
    trackCount: number;
    eventCount: number;
    totalDurationSeconds: number;
    maxDensity: number;
  };
}
