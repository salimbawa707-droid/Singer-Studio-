/**
 * MUSICBASE / SURGE STUDIO
 * Neural & Deep-Learning Musical Intelligence Layer Types (Phase 12)
 *
 * Optional, non-intrusive hybrid AI provider interfaces and validation contracts.
 * 100% Offline-first, sample-accurate, with deterministic fallback when no neural model is present.
 */

import { InstrumentKey } from './generativeArrangement';
import { SongSectionArchetype } from './professionalSongArrangement';

export type NeuralProviderStatus = 'UNINITIALIZED' | 'READY' | 'UNAVAILABLE' | 'ERROR';

export interface NeuralModelMetadata {
  providerId: string;
  modelName: string;
  version: string;
  runtimeTarget: 'WEBGPU' | 'WASM' | 'BROWSER_WORKER' | 'EXTERNAL_API' | 'LOCAL_HYBRID';
  dimensions?: number;
  isAvailable: boolean;
}

export interface NeuralMusicalEmbedding {
  embeddingId: string;
  dimensions: number;
  vector: Float32Array;
  confidence: number;                 // Strictly [0.0, 1.0]
  provenance: 'neural_model' | 'deterministic_fallback';
  modelMetadata: NeuralModelMetadata;
  createdAtTimestamp: number;
}

export interface NeuralMelodicSuggestion {
  suggestionId: string;
  notes: Array<{
    midiNote: number;
    startBeat: number;
    durationBeats: number;
    velocity: number;
  }>;
  suggestedInstrument: InstrumentKey;
  targetSection: SongSectionArchetype;
  intent: 'MOTIF_CONTINUATION' | 'COUNTER_MELODY' | 'CALL_AND_RESPONSE' | 'RHYTHMIC_VARIATION';
  confidence: number;                 // [0.0, 1.0]
}

export interface NeuralMixRecommendation {
  recommendationId: string;
  stemKey: InstrumentKey;
  suggestedEqDb: { low: number; mid: number; high: number }; // [-6.0, +6.0] dB
  suggestedPan: number;               // [-1.0, +1.0]
  suggestedReverbSend: number;        // [0.0, 1.0]
  suggestedCompressionRatio: number;  // [1.0, 8.0]
  confidence: number;
}

export interface NeuralAudioUnderstandingProvider {
  metadata: NeuralModelMetadata;
  isReady(): boolean;
  extractEmbeddings?(audioBuffer: Float32Array, sampleRate: number): Promise<NeuralMusicalEmbedding> | NeuralMusicalEmbedding;
  enhanceMelodicContour?(pitches: number[]): Promise<number[]> | number[];
}

export interface NeuralGenerativeMusicProvider {
  metadata: NeuralModelMetadata;
  isReady(): boolean;
  suggestContinuation?(
    themePitches: number[],
    scaleType: string,
    keyRoot: string
  ): Promise<NeuralMelodicSuggestion> | NeuralMelodicSuggestion;
}

export interface NeuralPerformanceProvider {
  metadata: NeuralModelMetadata;
  isReady(): boolean;
  suggestMicrotiming?(
    noteEvents: Array<{ midiNote: number; startBeat: number }>,
    instrument: InstrumentKey
  ): Promise<number[]> | number[];
}

export interface NeuralMixProvider {
  metadata: NeuralModelMetadata;
  isReady(): boolean;
  recommendMixAdjustments?(
    activeStems: InstrumentKey[],
    section: SongSectionArchetype
  ): Promise<NeuralMixRecommendation[]> | NeuralMixRecommendation[];
}

export interface QualityGateValidationResult {
  accepted: boolean;
  rejectionReason?: string;
  sanitizedPitches?: number[];
  sanitizedVelocities?: number[];
  finiteValuesVerified: boolean;
  harmonicConsistencyVerified: boolean;
  vocalMaskingProtectionVerified: boolean;
  timingBoundsVerified: boolean;
}
