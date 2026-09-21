/**
 * MUSICBASE / SURGE STUDIO
 * Neural Music Understanding & Similarity Analyzer (Phase 12)
 *
 * Implements:
 * - Musical similarity calculation between audio embeddings
 * - Neural section characteristic profiling (density, tension, energy)
 * - Harmonic & rhythmic pattern understanding
 */

import { NeuralMusicalEmbedding } from '../../types/neuralMusicIntelligence';
import { NeuralModelRegistry } from './neuralModelRegistry';

export interface NeuralMusicalSimilarityResult {
  similarityScore: number; // Cosine similarity [0.0, 1.0]
  compatible: boolean;
  reason?: string;
}

export class NeuralMusicAnalyzer {
  private static instance: NeuralMusicAnalyzer | null = null;
  private registry: NeuralModelRegistry;

  private constructor() {
    this.registry = NeuralModelRegistry.getInstance();
  }

  public static getInstance(): NeuralMusicAnalyzer {
    if (!NeuralMusicAnalyzer.instance) {
      NeuralMusicAnalyzer.instance = new NeuralMusicAnalyzer();
    }
    return NeuralMusicAnalyzer.instance;
  }

  /**
   * Calculate cosine similarity between two neural embeddings
   */
  public calculateEmbeddingSimilarity(
    emb1: NeuralMusicalEmbedding,
    emb2: NeuralMusicalEmbedding
  ): NeuralMusicalSimilarityResult {
    if (!emb1 || !emb2 || !emb1.vector || !emb2.vector) {
      return { similarityScore: 0.0, compatible: false, reason: 'Missing embedding vector' };
    }

    if (!this.registry.areEmbeddingsCompatible(emb1, emb2)) {
      return {
        similarityScore: 0.0,
        compatible: false,
        reason: `Incompatible embedding models: ${emb1.modelMetadata?.modelName} (v${emb1.modelMetadata?.version}) vs ${emb2.modelMetadata?.modelName} (v${emb2.modelMetadata?.version})`
      };
    }

    const v1 = emb1.vector;
    const v2 = emb2.vector;
    let dot = 0;
    let mag1 = 0;
    let mag2 = 0;

    for (let i = 0; i < v1.length; i++) {
      dot += v1[i] * v2[i];
      mag1 += v1[i] * v1[i];
      mag2 += v2[i] * v2[i];
    }

    mag1 = Math.sqrt(mag1);
    mag2 = Math.sqrt(mag2);

    if (mag1 < 0.0001 || mag2 < 0.0001) {
      return { similarityScore: 0.0, compatible: true, reason: 'Zero magnitude vector' };
    }

    const rawCos = dot / (mag1 * mag2);
    // Map cosine similarity [-1, 1] to [0, 1]
    const normalizedScore = Number(Math.max(0.0, Math.min(1.0, (rawCos + 1.0) / 2.0)).toFixed(4));

    return {
      similarityScore: normalizedScore,
      compatible: true
    };
  }
}
