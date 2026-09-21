/**
 * MUSICBASE / SURGE STUDIO
 * AI Musical Brain & Unified Musical Representation Types (Phase 5 - Prompt 1)
 *
 * Core typed interfaces for Deep Audio Understanding, Multi-Dimensional MIR,
 * Indian/Global Music Theory, Expressive Embeddings, Motif Graph, and Pluggable ML Adapters.
 *
 * 100% Offline-First, Deterministic, Sample-Accurate & Web Audio API Powered.
 */

import { MusicalTimeline } from '../services/intelligentArrangementEngine';
import { VocalSongMap, DetectedVocalNote, DeepVocalPhrase, VocalSilenceGap, VocalEmotionalPeak } from '../services/vocalUnderstandingEngine';
import { ExpressiveVocalPerformanceMap } from '../services/expressivePerformanceEngine';

/**
 * Inference provenance tracking for explainability & forensic auditing.
 */
export type InferenceProvenance =
  | 'deterministic_vocal_analysis'
  | 'ml_model'
  | 'heuristic_fallback'
  | 'user_input'
  | 'hybrid_fusion';

/**
 * Confidence-encapsulated value with optional alternative candidates and provenance.
 */
export interface ConfidenceValue<T> {
  value: T;
  confidence: number; // Strictly [0.0, 1.0]
  provenance: InferenceProvenance;
  evidence?: string;
  alternatives?: { value: T; confidence: number; evidence?: string }[];
}

/**
 * 12-TET Pitch class indices (0 = C, 1 = C#, ..., 11 = B)
 */
export type PitchClass = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11;

/**
 * Indian Classical Swara representation (12 standard swaras relative to tonic Sa)
 */
export type SwaraName =
  | 'S'   // Shadja (Tonic / Root)
  | 'r'   // Komal Rishabh (Minor 2nd)
  | 'R'   // Shuddha Rishabh (Major 2nd)
  | 'g'   // Komal Gandhar (Minor 3rd)
  | 'G'   // Shuddha Gandhar (Major 3rd)
  | 'm'   // Shuddha Madhyam (Perfect 4th)
  | 'M'   // Tivra Madhyam (Augmented 4th / Tritone)
  | 'P'   // Pancham (Perfect 5th)
  | 'd'   // Komal Dhaivat (Minor 6th)
  | 'D'   // Shuddha Dhaivat (Major 6th)
  | 'n'   // Komal Nishad (Minor 7th)
  | 'N';  // Shuddha Nishad (Major 7th)

export interface SwaraNoteEvent {
  noteId: number;
  swara: SwaraName;
  semitoneOffsetFromSa: number; // 0 to 11
  octaveRegister: 'mandra' | 'madhya' | 'taar'; // Lower, Middle, Higher octave
  centsDeviationFromShruti: number; // Microtonal intonation offset
  startBeat: number;
  endBeat: number;
  startTime: number;
  endTime: number;
  duration: number;
  rmsIntensity: number;
  stability: number;
}

/**
 * Microtonal ornamentation types in Indian & Vocal performance
 */
export type OrnamentationType =
  | 'meend'       // Continuous pitch glide/glissando between swaras
  | 'murki'       // Rapid 3-4 note ornamental turn/flourish
  | 'gamak'       // Heavy, rhythmic pitch oscillation
  | 'khatka'      // Quick decorative note cluster
  | 'andolan'     // Slow, delicate wavering on a specific swara
  | 'kan_swara'   // Grace note / touch note
  | 'vibrato';    // Sustained periodic pitch modulation

export interface DetectedOrnamentEvent {
  id: number;
  type: OrnamentationType;
  startBeat: number;
  endBeat: number;
  startTime: number;
  endTime: number;
  duration: number;
  fromMidi: number;
  toMidi: number;
  pitchTrajectory: number[]; // High-res pitch sequence
  rateHz?: number;           // Oscillation rate for Gamak/Vibrato
  depthCents?: number;       // Modulation depth for Gamak/Vibrato
  associatedPhraseId?: number;
  confidence: number;
  provenance: InferenceProvenance;
}

/**
 * Candidate Raga / Modal hypothesis
 */
export interface RagaHypothesis {
  ragaName: string;
  thaat: string;
  vadiSwara: SwaraName;
  samvadiSwara: SwaraName;
  arohana: SwaraName[];
  avarohana: SwaraName[];
  characteristicPhrases: string[];
  scaleIntervals: number[]; // semitone offsets from Sa
  confidence: number;       // [0.0, 1.0]
  evidence: string;
}

/**
 * Tala / Meter hypothesis
 */
export interface TalaHypothesis {
  talaName: string;
  totalMatras: number; // Beats in cycle (e.g., 16 for Teentaal, 8 for Keherwa, 6 for Dadra, 7 for Roopak)
  divisions: number[]; // Vibhag breakdown (e.g. [4, 4, 4, 4] or [3, 2, 2])
  samBeat: number;     // Primary downbeat
  taliBeats: number[]; // Clapped beats
  khaliBeats: number[];// Wave/unaccented beats
  confidence: number;  // [0.0, 1.0]
  evidence: string;
}

/**
 * Indian & Modal Musical Profile
 */
export interface IndianMusicalProfile {
  tonicSaMidi: number;
  tonicSaFrequencyHz: number;
  paAnchorPresent: boolean;
  swaraEvents: SwaraNoteEvent[];
  swaraHistogram: number[]; // 12-element normalized frequency distribution [0..11]
  ornaments: DetectedOrnamentEvent[];
  meendEvents: DetectedOrnamentEvent[];
  murkiEvents: DetectedOrnamentEvent[];
  gamakEvents: DetectedOrnamentEvent[];
  ragaCandidates: RagaHypothesis[];
  primaryRaga: ConfidenceValue<RagaHypothesis>;
  talaCandidates: TalaHypothesis[];
  primaryTala: ConfidenceValue<TalaHypothesis>;
  ornamentationDensityByBeat: number[]; // [0.0, 1.0] per beat
}

/**
 * High-resolution pitch features
 */
export interface PitchFeatureProfile {
  fundamentalFreqs: Float32Array;      // Frame-level F0
  pitchConfidences: Float32Array;      // Frame-level confidence
  fractionalMidiByBeat: number[];      // Beat-level pitch (0 if unvoiced)
  pitchStabilityByBeat: number[];      // [0.0, 1.0] stability per beat
  chromaHistogram: number[];           // 12-bin normalized energy distribution
  pitchRangeMidi: { min: number; max: number; span: number };
  microtonalDeviationCents: number[];  // Cents offset relative to nearest 12-TET semitone
  vocalRegisterDistribution: { chest: number; mid: number; head: number; falsetto: number };
}

/**
 * Rhythmic and timing features
 */
export interface RhythmicFeatureProfile {
  onsetsByBeat: number[];              // Onset presence / strength per beat
  interOnsetDistances: number[];       // Time deltas between consecutive notes
  rhythmicDensityByBeat: number[];     // Notes/second active density
  syncopationTendency: number;         // [0.0, 1.0] score of off-beat accents
  grooveMicrotimingShiftMs: number[];  // Beat-level humanization timing deviation
  localTempoStability: number[];       // [0.0, 1.0] tempo regularity curve
}

/**
 * 6-Dimensional Continuous Emotional & Expressive Space
 */
export interface ExpressiveDimensions {
  calm_vs_intense: number;             // 0.0 = deeply calm, 1.0 = highly intense / climactic
  intimate_vs_powerful: number;        // 0.0 = whisper/intimate, 1.0 = belting/powerful
  stable_vs_tense: number;             // 0.0 = harmonic resolution, 1.0 = maximum tension
  bright_vs_dark: number;              // 0.0 = somber/dark, 1.0 = bright/uplifting
  sparse_vs_dense: number;             // 0.0 = minimal space, 1.0 = dense vocal performance
  restrained_vs_expressive: number;    // 0.0 = controlled/steady, 1.0 = highly ornamented/dynamic
}

export interface ExpressiveEmotionProfile {
  globalVector: ExpressiveDimensions;
  beatTrajectory: ExpressiveDimensions[]; // Beat-indexed 6-dim vector curve
  emotionalPeaks: VocalEmotionalPeak[];
  dynamicArcType: 'rising' | 'wave' | 'steady' | 'peaked';
  confidence: number;
}

/**
 * Melodic Motif Representation & Structural Patterns
 */
export type MotifRole = 'hook' | 'signature' | 'riff' | 'call' | 'response' | 'cadence_turn';

export interface MotifInstance {
  motifId: string;
  sourcePhraseId: number;
  startBeat: number;
  endBeat: number;
  startTime: number;
  endTime: number;
  durationBeats: number;
  pitchSequenceMidi: number[];
  intervalPattern: number[];           // Relative pitch deltas, e.g. [0, 2, 4, -1]
  rhythmSignature: string;             // e.g. '8th-dotted-quarter'
  transpositionFromOriginal: number;   // Semitone shift from root instance
  similarityToRoot: number;            // [0.0, 1.0]
  role: MotifRole;
  confidence: number;
}

export interface MotifCluster {
  id: string;
  canonicalIntervals: number[];
  instances: MotifInstance[];
  recurrenceCount: number;
  isHookCandidate: boolean;
  prominenceScore: number;             // [0.0, 1.0]
  recommendedInstrument: 'flute' | 'guitar' | 'piano' | 'synth' | 'strings' | 'sitar';
}

/**
 * Section Structural Intelligence
 */
export type SongSectionCategory =
  | 'intro'
  | 'verse_mukhda'
  | 'pre_chorus'
  | 'chorus_hook'
  | 'interlude'
  | 'verse_antara'
  | 'bridge'
  | 'breakdown'
  | 'chorus_climax'
  | 'outro';

export interface StructuralSectionHypothesis {
  id: string;
  category: SongSectionCategory;
  name: string;
  startBeat: number;
  endBeat: number;
  startTime: number;
  endTime: number;
  startSample: number;
  endSample: number;
  durationBeats: number;
  energyLevel: number;                 // [0.0, 1.0]
  vocalDensity: number;                // [0.0, 1.0]
  melodicDensity: number;              // [0.0, 1.0]
  instrumentationTargetDensity: number;// [0.0, 1.0]
  dominantRole: string;
  associatedMotifIds: string[];
  associatedPhraseIds: number[];
  confidence: number;                  // [0.0, 1.0]
  provenance: InferenceProvenance;
  alternatives?: { category: SongSectionCategory; confidence: number }[];
}

/**
 * Detailed Phrase Semantic & Musical Intent
 */
export interface EnrichedVocalPhrase extends DeepVocalPhrase {
  intervalSequence: number[];
  swaraSequence: SwaraName[];
  ornaments: DetectedOrnamentEvent[];
  expressiveVector: ExpressiveDimensions;
  consequentPhraseId?: number;         // Call-and-response linkage
  antecedentPhraseId?: number;
  isCall: boolean;
  isResponse: boolean;
  isHookClimax: boolean;
  motifClusterId?: string;
  provenance: InferenceProvenance;
}

/**
 * Musical Intelligence Graph (Node & Edge Network)
 */
export type GraphNodeType = 'song' | 'section' | 'phrase' | 'note' | 'motif' | 'ornament' | 'cadence';
export type GraphEdgeType =
  | 'contains'
  | 'precedes'
  | 'overlaps'
  | 'repeats'
  | 'varies'
  | 'transposes'
  | 'calls'
  | 'responds'
  | 'resolves_to';

export interface GraphNode {
  id: string;
  type: GraphNodeType;
  startBeat: number;
  endBeat: number;
  startTime: number;
  endTime: number;
  data: any;
}

export interface GraphEdge {
  fromNodeId: string;
  toNodeId: string;
  type: GraphEdgeType;
  weight: number; // [0.0, 1.0]
  metadata?: Record<string, any>;
}

export interface MusicalIntelligenceGraph {
  nodes: GraphNode[];
  edges: GraphEdge[];
  nodeMap: Map<string, GraphNode>;
  outgoingEdges: Map<string, GraphEdge[]>;
  incomingEdges: Map<string, GraphEdge[]>;

  // Graph traversal query helpers
  getSectionAtBeat(beat: number): GraphNode | null;
  getPhrasesForSection(sectionId: string): GraphNode[];
  getMotifsForSection(sectionId: string): GraphNode[];
  getOrnamentsInBeatRange(startBeat: number, endBeat: number): GraphNode[];
  findConnectedNodes(nodeId: string, edgeType?: GraphEdgeType): GraphNode[];
}

/**
 * Unified Musical Representation (UMR)
 * The top-level master data structure emitted by the AI Musical Brain.
 */
export interface UnifiedMusicalRepresentation {
  metadata: {
    songId: string;
    sampleRate: number;
    totalDuration: number;
    totalBeats: number;
    totalSamples: number;
    bpm: number;
    key: string;
    scale: 'major' | 'minor';
    meter: '4/4' | '3/4' | '6/8' | '7/8';
    generatedAt: string;
    version: 'phase_5_prompt_1';
  };

  // Direct reference to the canonical Part 1 MusicalTimeline
  timeline: MusicalTimeline;

  // Direct reference to underlying VocalSongMap & Expressive Performance Map
  vocalMap: VocalSongMap;
  expressiveMap: ExpressiveVocalPerformanceMap;

  // Rich Multi-Dimensional MIR Profiles
  pitchProfile: PitchFeatureProfile;
  rhythmicProfile: RhythmicFeatureProfile;
  expressiveProfile: ExpressiveEmotionProfile;
  indianProfile: IndianMusicalProfile;

  // Structural & Melodic Intelligence
  sections: StructuralSectionHypothesis[];
  phrases: EnrichedVocalPhrase[];
  motifClusters: MotifCluster[];
  silenceGaps: VocalSilenceGap[];

  // Continuous Beat-Indexed Trajectories
  beatTrajectories: {
    melodicPitchMidi: number[];
    vocalActivity: boolean[];
    vocalDensity: number[];
    harmonicTension: number[];
    cadenceResolution: number[];
    expressiveDimensions: ExpressiveDimensions[];
    ornamentationDensity: number[];
    tempoStability: number[];
  };

  // The Master Musical Intelligence Graph
  graph: MusicalIntelligenceGraph;

  // Overall Confidence Matrix & Provenance
  confidenceSummary: {
    pitchAccuracy: number;
    tempoAccuracy: number;
    phraseSegmentation: number;
    sectionBoundaries: number;
    ragaModalClassification: number;
    motifDetection: number;
    overall: number;
  };
  provenanceSummary: Record<string, InferenceProvenance>;
}

/**
 * Pluggable ML Model Abstraction Layer Interfaces
 */
export interface MusicalFeatureModel {
  name: string;
  version: string;
  extractFeatures(audioBuffer: AudioBuffer, timeline: MusicalTimeline): Promise<Partial<UnifiedMusicalRepresentation>>;
}

export interface AudioEmbeddingProvider {
  name: string;
  embeddingDimension: number; // e.g. 64 or 128
  computeEmbeddings(audioBuffer: AudioBuffer, beats: number): Float32Array[];
}

export interface MusicalIntelligenceProvider {
  name: string;
  inferStructure(vocalMap: VocalSongMap, timeline: MusicalTimeline): StructuralSectionHypothesis[];
  inferRaga(vocalMap: VocalSongMap): RagaHypothesis[];
  inferMotifs(vocalMap: VocalSongMap): MotifCluster[];
}

export interface ModelInferenceAdapter {
  providerName: string;
  isAvailable: boolean;
  infer<TInput, TOutput>(task: string, input: TInput): Promise<ConfidenceValue<TOutput>>;
}
