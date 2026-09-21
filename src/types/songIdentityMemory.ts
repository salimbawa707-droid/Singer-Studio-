/**
 * MUSICBASE / SURGE STUDIO
 * Song Identity & Long-Term Musical Memory Engine Types (Phase 11)
 *
 * Types for extracting, preserving, and serializing a song's core musical identity
 * across multi-pass arrangement, iterative regeneration, section repetitions,
 * and future sessions.
 */

import { InstrumentKey } from './generativeArrangement';
import { SongSectionArchetype } from './professionalSongArrangement';
import { IndianMusicalProfile } from './musicalBrain';

export const CURRENT_SONG_IDENTITY_VERSION = 1;
export const CURRENT_MUSICAL_MEMORY_VERSION = 1;

export type FactSource = 'MEASURED' | 'USER' | 'AI' | 'SYSTEM_DERIVED' | 'IMPORTED';

export interface IdentityFact<T> {
  value: T;
  source: FactSource;
  confidence: number; // [0.0, 1.0]
  timestamp: number;
  version: number;
}

export type IdentityLockKey =
  | 'key'
  | 'tempo'
  | 'timeSignature'
  | 'vocalMelody'
  | 'chordProgression'
  | 'mainMotif'
  | 'genre'
  | 'instrumentation'
  | 'structure';

export interface IdentityLock {
  lockKey: IdentityLockKey;
  isLocked: boolean;
  lockedValue: any;
  lockedBy: 'user' | 'system';
  lockedAtTimestamp: number;
  reason?: string;
}

export type AuthorityPriorityLevel =
  | 1 // Current explicit user instruction (Highest)
  | 2 // Hard project constraints
  | 3 // Measured audio facts
  | 4 // Explicitly locked song identity
  | 5 // Existing musical memory
  | 6 // AI recommendations
  | 7; // Creative variation (Lowest)

export type GenerationMode = 'PRESERVE_IDENTITY' | 'VARIATION' | 'REBUILD';

export type RepetitionEvolutionType = 'EXACT_THEME' | 'VARIATION' | 'DEVELOPMENT' | 'CLIMAX_TRANSFORMATION';

export interface MusicalMotifMemoryEntry {
  motifId: string;
  pitches: number[];
  intervalContour: number[];
  rhythmicSignature: string;
  importanceScore: number;          // [0.0, 1.0] High = hook/signature, Low = transitional
  occurrences: number;
  firstSeenSection: SongSectionArchetype;
  isVocalHook: boolean;
  preservationPriority: 'MANDATORY' | 'HIGH' | 'FLEXIBLE';
}

export interface VocalMelodicSignature {
  pitchRangeMidi: { min: number; max: number; center: number };
  primaryIntervals: number[];
  contourArchetype: 'ASCENDING' | 'DESCENDING' | 'ARCH' | 'INVERTED_ARCH' | 'WAVE' | 'STATIONARY';
  tessitura: 'LOW' | 'MID' | 'HIGH';
  phraseDensityAvg: number;
}

export interface HarmonicIdentity {
  tonicRoot: string;
  tonicMidi: number;
  scaleMode: string;
  primaryProgression: string[];
  harmonicRhythmBeats: number;
  dominantCadenceType: string;
}

export interface RhythmicIdentity {
  meter: string;
  bpm: number;
  grooveArchetype: string;
  syncopationDegree: number;        // [0.0, 1.0]
  timeSignatureNumerator: number;
  timeSignatureDenominator: number;
}

export interface SectionMemoryEntry {
  sectionIndex: number;
  archetype: SongSectionArchetype;
  repetitionIndex: number;
  evolutionType: RepetitionEvolutionType;
  density: number;
  activeStems: InstrumentKey[];
  thematicMotifIds: string[];
  energyLevel: number;
}

export interface SongIdentity {
  songId: string;
  projectId: string;
  identityVersion: number;
  createdAtTimestamp: number;
  updatedAtTimestamp: number;
  
  // Provenance-tracked Core Facts
  title: IdentityFact<string>;
  key: IdentityFact<string>;
  scale: IdentityFact<string>;
  tempo: IdentityFact<number>;
  timeSignature: IdentityFact<string>;
  genre: IdentityFact<string>;
  style: IdentityFact<string>;
  mood: IdentityFact<string>;
  emotionalArc: IdentityFact<string>;
  vocalCharacter: IdentityFact<string>;

  // Structural Sub-identities
  vocalMelodicSignature: VocalMelodicSignature;
  importantMotifs: MusicalMotifMemoryEntry[];
  harmonicIdentity: HarmonicIdentity;
  rhythmicIdentity: RhythmicIdentity;
  tonalModalIdentity: {
    indianProfile?: IndianMusicalProfile;
    mode: string;
    characteristicSwaras: string[];
    saGroundingMidi: number;
  };
  characteristicOrnaments: {
    hasMeendGamak: boolean;
    vibratoDepth: number;
    staccatoRatio: number;
  };
  sectionStructure: SectionMemoryEntry[];
  emotionalDynamicSignature: {
    mood: string;
    peakEnergySection: SongSectionArchetype;
    dynamicRangeDb: number;
  };
  instrumentationIdentity: {
    coreRhythmSpine: InstrumentKey[];
    primaryHarmonicBed: InstrumentKey[];
    leadSoloists: InstrumentKey[];
  };

  // Identity Parameter Locks
  locks: Record<IdentityLockKey, IdentityLock>;

  isDeterministic: boolean;
}

export type MemoryEventType =
  | 'USER_DECISION'
  | 'AI_SUGGESTION_ACCEPTED'
  | 'AI_SUGGESTION_REJECTED'
  | 'IDENTITY_LOCKED'
  | 'IDENTITY_UNLOCKED'
  | 'KEY_CHANGED'
  | 'TEMPO_CHANGED'
  | 'ARRANGEMENT_APPROVED'
  | 'MOTIF_ACCEPTED'
  | 'MOTIF_REJECTED'
  | 'INSTRUMENT_APPROVED';

export interface MemoryEvent {
  id: string;
  projectId: string;
  songId: string;
  type: MemoryEventType;
  timestamp: number;
  source: FactSource;
  previousValue?: any;
  newValue?: any;
  reason?: string;
  projectVersion: number;
}

export interface MusicalMemory {
  projectId: string;
  songId: string;
  memoryVersion: number;
  updatedAt: number;
  events: MemoryEvent[];
  acceptedMotifIds: string[];
  rejectedMotifIds: string[];
  rejectedSuggestions: Array<{ suggestionText: string; timestamp: number }>;
  previousKeys: string[];
  previousTempos: number[];
  previousArrangements: string[];
  userApprovedChanges: string[];
}

export interface RegenerationPreservationRules {
  preserveKeyAndScale: boolean;
  preserveVocalHooks: boolean;
  preserveGrooveFeel: boolean;
  preserveSectionMacroStructure: boolean;
  allowedNoveltyScale: number;      // [0.0, 1.0] 0.0 = lock, 1.0 = wild variation
  mode?: GenerationMode;
}

export interface RegenerationResult {
  songIdentity: SongIdentity;
  preservedMotifsCount: number;
  developedMotifsCount: number;
  retainedSectionArchetypes: SongSectionArchetype[];
  identitySimilarityScore: number;  // [0.0, 1.0] >= 0.85 indicates true identity preservation
  isConsistent: boolean;
}

/**
 * Optional future Neural Model Interface for consuming and guiding SongIdentity.
 */
export interface NeuralSongIdentityConsumer {
  name: string;
  version: string;
  evaluateIdentityContinuity(identity: SongIdentity): Promise<number> | number;
  suggestDevelopmentVariations(identity: SongIdentity, section: SongSectionArchetype): Promise<string[]> | string[];
}

