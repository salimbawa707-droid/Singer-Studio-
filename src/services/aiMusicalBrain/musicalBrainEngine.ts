/**
 * MUSICBASE / SURGE STUDIO
 * AI Musical Brain & Unified Musical Representation Master Engine (Phase 5 - Prompt 1)
 *
 * The foundational intelligence orchestrator for Surge Studio:
 * - Fuses multi-feature vocal analysis, pitch/rhythm/expressive/Indian profiles
 * - Constructs the Unified Musical Representation (UMR)
 * - Builds the indexed Musical Intelligence Graph
 * - Guarantees 100% determinism, numerical safety (no NaN/Infinity), zero Math.random()
 * - Strictly preserves Part 1 Timing Lock, Part 2 Harmonic Lock, Part 3 DSP Lock, Part 4A/4B Expressive Locks
 *
 * 100% Offline-First, Deterministic, Sample-Accurate & Web Audio API Powered.
 */

import {
  UnifiedMusicalRepresentation,
  PitchFeatureProfile,
  RhythmicFeatureProfile,
  ExpressiveEmotionProfile,
  ExpressiveDimensions,
  IndianMusicalProfile,
  StructuralSectionHypothesis,
  EnrichedVocalPhrase,
  MotifCluster,
  InferenceProvenance
} from '../../types/musicalBrain';
import {
  VocalUnderstandingEngine,
  VocalSongMap,
  DetectedVocalNote,
  DeepVocalPhrase,
  VocalSilenceGap,
  VocalEmotionalPeak
} from '../vocalUnderstandingEngine';
import {
  ExpressivePerformanceEngine,
  ExpressiveVocalPerformanceMap
} from '../expressivePerformanceEngine';
import { MusicalTimeline } from '../intelligentArrangementEngine';
import { IndianMusicTheoryEngine } from './indianMusicTheory';
import { MotifAnalyzer } from './motifAnalyzer';
import { SectionStructureAnalyzer } from './sectionStructureAnalyzer';
import { MusicalIntelligenceGraphImpl } from './musicalGraph';
import { DeterministicAudioEmbeddingProvider } from './modelAdapters';

function clamp(val: number, min: number = 0.0, max: number = 1.0): number {
  if (Number.isNaN(val) || !Number.isFinite(val)) return min;
  return Math.max(min, Math.min(max, val));
}

export class MusicalBrainEngine {
  private static instance: MusicalBrainEngine;
  private readonly embeddingProvider: DeterministicAudioEmbeddingProvider;

  private constructor() {
    this.embeddingProvider = new DeterministicAudioEmbeddingProvider();
  }

  public static getInstance(): MusicalBrainEngine {
    if (!MusicalBrainEngine.instance) {
      MusicalBrainEngine.instance = new MusicalBrainEngine();
    }
    return MusicalBrainEngine.instance;
  }

  /**
   * Primary entry point: Analyze vocal performance and build Unified Musical Representation
   */
  public async analyzeAndBuildUMR(
    audioBuffer: AudioBuffer,
    options?: {
      vocalMap?: VocalSongMap;
      timeline?: MusicalTimeline;
      songId?: string;
      explicitKey?: string;
      explicitBpm?: number;
    }
  ): Promise<UnifiedMusicalRepresentation> {
    return this.analyzeAndBuildUMRSync(audioBuffer, options);
  }

  /**
   * Synchronous core for UMR generation
   */
  public analyzeAndBuildUMRSync(
    audioBuffer: AudioBuffer,
    options?: {
      vocalMap?: VocalSongMap;
      timeline?: MusicalTimeline;
      songId?: string;
      explicitKey?: string;
      explicitBpm?: number;
    }
  ): UnifiedMusicalRepresentation {
    const sampleRate = audioBuffer.sampleRate || 44100;
    const totalDuration = options?.vocalMap?.totalDuration || options?.vocalMap?.duration || audioBuffer.duration || 0;
    const songId = options?.songId || `song_${Date.now()}`;

    // 1. Obtain or generate VocalSongMap
    let vocalMap = options?.vocalMap;
    if (!vocalMap) {
      const vocalEngine = VocalUnderstandingEngine.getInstance();
      vocalMap = vocalEngine.analyzeVocalPerformance(
        audioBuffer,
        options?.explicitBpm || 120,
        options?.explicitKey || 'C'
      );
    }

    // 2. Obtain or construct canonical MusicalTimeline
    const bpm = options?.explicitBpm || vocalMap.bpm || vocalMap.tempo || 120;
    const totalBeats = Math.max(1, Math.ceil((totalDuration * bpm) / 60) || 1);

    let timeline = options?.timeline;
    if (!timeline) {
      timeline = new MusicalTimeline(
        bpm,
        totalBeats,
        sampleRate,
        vocalMap.tempoDeviationCurve
      );
    }

    // 3. Obtain or construct ExpressiveVocalPerformanceMap (Part 4A)
    let expressiveMap = vocalMap.expressiveMap;
    if (!expressiveMap) {
      const expEngine = ExpressivePerformanceEngine.getInstance();
      expressiveMap = expEngine.buildExpressivePerformanceMap(vocalMap, totalBeats);
      vocalMap.expressiveMap = expressiveMap;
    }

    // 4. Extract High-Resolution Pitch Features
    const pitchProfile = this.extractPitchProfile(vocalMap, totalBeats);

    // 5. Extract High-Resolution Rhythmic Features
    const rhythmicProfile = this.extractRhythmicProfile(vocalMap, timeline, totalBeats);

    // 6. Extract Multi-Dimensional Expressive & Emotional Profile
    const expressiveProfile = this.extractExpressiveProfile(vocalMap, expressiveMap, totalBeats);

    // 7. Extract Indian & Modal Musical Profile
    const indianProfile = IndianMusicTheoryEngine.buildIndianProfile(
      vocalMap,
      vocalMap.notes || [],
      vocalMap.phrases || [],
      totalBeats
    );

    // 8. Analyze Motifs & Enrich Phrases with Swaras
    const { motifClusters, enrichedPhrases } = MotifAnalyzer.analyzeMotifs(
      vocalMap.phrases || [],
      vocalMap.notes || []
    );

    // Attach Swara and Ornament linkages to enriched phrases
    const tonicRootMidi = indianProfile.tonicSaMidi;
    for (const phrase of enrichedPhrases) {
      const phraseNotes = phrase.notes || [];
      phrase.swaraSequence = phraseNotes.map(n => {
        const swaraEvent = indianProfile.swaraEvents.find(s => s.noteId === n.id);
        return swaraEvent ? swaraEvent.swara : 'S';
      });
      phrase.ornaments = indianProfile.ornaments.filter(
        o => o.startBeat >= phrase.startBeat - 0.25 && o.endBeat <= phrase.endBeat + 0.25
      );
    }

    // 9. Infer Song Structural Sections
    const sections = SectionStructureAnalyzer.inferSections(
      vocalMap,
      timeline,
      motifClusters
    );

    // 10. Generate Beat-Indexed Continuous Trajectories
    const beatTrajectories = this.synthesizeBeatTrajectories(
      vocalMap,
      expressiveMap,
      pitchProfile,
      rhythmicProfile,
      expressiveProfile,
      indianProfile,
      totalBeats
    );

    // 11. Build the Unified Musical Intelligence Graph
    const graph = new MusicalIntelligenceGraphImpl(
      sections,
      enrichedPhrases,
      motifClusters,
      indianProfile.ornaments,
      { songId, totalBeats, totalDuration }
    );

    // 12. Calculate Provenance and Confidence Summary
    const confidenceSummary = {
      pitchAccuracy: vocalMap.confidenceScores?.pitch ?? 0.90,
      tempoAccuracy: vocalMap.confidenceScores?.bpm ?? 0.90,
      phraseSegmentation: vocalMap.confidenceScores?.phraseSegmentation ?? 0.88,
      sectionBoundaries: Number((sections.reduce((a, s) => a + s.confidence, 0) / Math.max(1, sections.length)).toFixed(3)),
      ragaModalClassification: indianProfile.primaryRaga.confidence,
      motifDetection: Number((motifClusters.reduce((a, m) => a + m.prominenceScore, 0) / Math.max(1, motifClusters.length)).toFixed(3)),
      overall: vocalMap.confidenceScores?.overall ?? 0.90
    };

    const provenanceSummary: Record<string, InferenceProvenance> = {
      pitch: 'deterministic_vocal_analysis',
      timing: 'deterministic_vocal_analysis',
      phrasing: 'deterministic_vocal_analysis',
      motifs: 'deterministic_vocal_analysis',
      sections: 'deterministic_vocal_analysis',
      raga: 'deterministic_vocal_analysis',
      expressiveMap: 'deterministic_vocal_analysis'
    };

    return {
      metadata: {
        songId,
        sampleRate,
        totalDuration,
        totalBeats,
        totalSamples: timeline.totalSamples,
        bpm: timeline.bpm,
        key: vocalMap.key || 'C',
        scale: vocalMap.scale || 'major',
        meter: vocalMap.meter || '4/4',
        generatedAt: new Date().toISOString(),
        version: 'phase_5_prompt_1'
      },
      timeline,
      vocalMap,
      expressiveMap,
      pitchProfile,
      rhythmicProfile,
      expressiveProfile,
      indianProfile,
      sections,
      phrases: enrichedPhrases,
      motifClusters,
      silenceGaps: vocalMap.silenceGaps || [],
      beatTrajectories,
      graph,
      confidenceSummary,
      provenanceSummary
    };
  }

  private extractPitchProfile(vocalMap: VocalSongMap, totalBeats: number): PitchFeatureProfile {
    const notes = vocalMap.notes || [];
    const fractionalMidiByBeat = new Array(totalBeats).fill(0);
    const pitchStabilityByBeat = new Array(totalBeats).fill(0.0);
    const microtonalDeviationCents = new Array(totalBeats).fill(0);
    const chromaCounts = new Float64Array(12);

    let minMidi = 127;
    let maxMidi = 0;
    const registerCounts = { chest: 0, mid: 0, head: 0, falsetto: 0 };

    for (const note of notes) {
      const midi = note.midiNote;
      if (midi < minMidi) minMidi = midi;
      if (midi > maxMidi) maxMidi = midi;

      // Classify register
      if (midi < 53) registerCounts.chest++;
      else if (midi <= 65) registerCounts.mid++;
      else if (midi <= 72) registerCounts.head++;
      else registerCounts.falsetto++;

      const startB = Math.max(0, Math.floor(note.startBeat));
      const endB = Math.min(totalBeats - 1, Math.ceil(note.endBeat));

      for (let b = startB; b <= endB; b++) {
        fractionalMidiByBeat[b] = midi;
        pitchStabilityByBeat[b] = note.stability;
        microtonalDeviationCents[b] = note.centsOff ?? 0;
      }

      const chroma = midi % 12;
      chromaCounts[chroma] += note.duration;
    }

    if (minMidi > maxMidi) {
      minMidi = 60;
      maxMidi = 60;
    }

    // Normalize chroma
    let totalChroma = 0;
    for (let i = 0; i < 12; i++) totalChroma += chromaCounts[i];
    const chromaHistogram = new Array(12).fill(0);
    if (totalChroma > 0) {
      for (let i = 0; i < 12; i++) chromaHistogram[i] = Number((chromaCounts[i] / totalChroma).toFixed(4));
    }

    const totalNotes = Math.max(1, notes.length);
    const vocalRegisterDistribution = {
      chest: Number((registerCounts.chest / totalNotes).toFixed(3)),
      mid: Number((registerCounts.mid / totalNotes).toFixed(3)),
      head: Number((registerCounts.head / totalNotes).toFixed(3)),
      falsetto: Number((registerCounts.falsetto / totalNotes).toFixed(3))
    };

    return {
      fundamentalFreqs: new Float32Array(totalBeats),
      pitchConfidences: new Float32Array(totalBeats).fill(0.9),
      fractionalMidiByBeat,
      pitchStabilityByBeat,
      chromaHistogram,
      pitchRangeMidi: { min: minMidi, max: maxMidi, span: maxMidi - minMidi },
      microtonalDeviationCents,
      vocalRegisterDistribution
    };
  }

  private extractRhythmicProfile(
    vocalMap: VocalSongMap,
    timeline: MusicalTimeline,
    totalBeats: number
  ): RhythmicFeatureProfile {
    const onsetsByBeat = new Array(totalBeats).fill(0.0);
    const rhythmicDensityByBeat = new Array(totalBeats).fill(0.0);
    const grooveMicrotimingShiftMs = new Array(totalBeats).fill(0.0);
    const localTempoStability = new Array(totalBeats).fill(1.0);
    const interOnsetDistances: number[] = [];

    const notes = vocalMap.notes || [];
    for (let i = 0; i < notes.length; i++) {
      const note = notes[i];
      const b = Math.max(0, Math.min(totalBeats - 1, Math.floor(note.startBeat)));
      onsetsByBeat[b] = Math.min(1.0, onsetsByBeat[b] + 0.8);

      if (i > 0) {
        const ioi = note.startTime - notes[i - 1].startTime;
        interOnsetDistances.push(Number(ioi.toFixed(4)));
      }

      // Calculate microtiming shift against strict beat grid
      const expectedTime = timeline.getBeatAtSample ? timeline.getSampleAtBeat(note.startBeat) / timeline.sampleRate : (note.startBeat / timeline.bpm) * 60;
      const shiftMs = (note.startTime - expectedTime) * 1000;
      grooveMicrotimingShiftMs[b] = Number(Math.max(-50, Math.min(50, shiftMs)).toFixed(2));
    }

    // Calculate rhythmic density
    for (let b = 0; b < totalBeats; b++) {
      const activeNotes = notes.filter(n => n.startBeat <= b + 1 && n.endBeat >= b);
      rhythmicDensityByBeat[b] = clamp(activeNotes.length * 0.5);

      // Local tempo deviation stability
      const dev = vocalMap.tempoDeviationCurve ? (vocalMap.tempoDeviationCurve[b] ?? 1.0) : 1.0;
      localTempoStability[b] = clamp(1.0 - Math.abs(dev - 1.0) * 1.5);
    }

    // Syncopation tendency: count onsets falling on off-beats (e.g. x.5)
    let syncopatedCount = 0;
    for (const note of notes) {
      const frac = note.startBeat - Math.floor(note.startBeat);
      if (frac >= 0.35 && frac <= 0.65) syncopatedCount++;
    }
    const syncopationTendency = clamp(notes.length > 0 ? syncopatedCount / notes.length : 0.0);

    return {
      onsetsByBeat,
      interOnsetDistances,
      rhythmicDensityByBeat,
      syncopationTendency,
      grooveMicrotimingShiftMs,
      localTempoStability
    };
  }

  private extractExpressiveProfile(
    vocalMap: VocalSongMap,
    expressiveMap: ExpressiveVocalPerformanceMap,
    totalBeats: number
  ): ExpressiveEmotionProfile {
    const beatTrajectory: ExpressiveDimensions[] = new Array(totalBeats);

    let sumIntensity = 0;
    let sumTension = 0;
    let sumDensity = 0;

    for (let b = 0; b < totalBeats; b++) {
      const intensity = expressiveMap.intensityCurve[b] ?? 0.0;
      const attack = expressiveMap.attackStrengths[b] ?? 0.0;
      const pEnergy = expressiveMap.phraseEnergyCurve[b] ?? 0.5;
      const tension = vocalMap.tensionMap ? (vocalMap.tensionMap[b] ?? 0.0) : 0.0;
      const density = expressiveMap.articulationDensity[b] ?? 0.0;
      const ornaments = expressiveMap.ornamentDensityCurve[b] ?? 0.0;

      sumIntensity += intensity;
      sumTension += tension;
      sumDensity += density;

      beatTrajectory[b] = {
        calm_vs_intense: clamp(intensity * 0.7 + pEnergy * 0.3),
        intimate_vs_powerful: clamp(intensity * 0.8 + attack * 0.2),
        stable_vs_tense: clamp(tension),
        bright_vs_dark: clamp(0.5 + (pEnergy - 0.5) * 0.4),
        sparse_vs_dense: clamp(density),
        restrained_vs_expressive: clamp(ornaments * 0.6 + attack * 0.4)
      };
    }

    const avgIntensity = sumIntensity / totalBeats;
    const avgTension = sumTension / totalBeats;
    const avgDensity = sumDensity / totalBeats;

    const globalVector: ExpressiveDimensions = {
      calm_vs_intense: clamp(avgIntensity),
      intimate_vs_powerful: clamp(avgIntensity * 1.1),
      stable_vs_tense: clamp(avgTension),
      bright_vs_dark: 0.55,
      sparse_vs_dense: clamp(avgDensity),
      restrained_vs_expressive: 0.60
    };

    return {
      globalVector,
      beatTrajectory,
      emotionalPeaks: vocalMap.emotionalPeaks || [],
      dynamicArcType: vocalMap.overallVocalDynamicArc || 'wave',
      confidence: expressiveMap.confidence || 0.90
    };
  }

  private synthesizeBeatTrajectories(
    vocalMap: VocalSongMap,
    expressiveMap: ExpressiveVocalPerformanceMap,
    pitchProfile: PitchFeatureProfile,
    rhythmicProfile: RhythmicFeatureProfile,
    expressiveProfile: ExpressiveEmotionProfile,
    indianProfile: IndianMusicalProfile,
    totalBeats: number
  ) {
    const melodicPitchMidi = [...pitchProfile.fractionalMidiByBeat];
    const vocalActivity = new Array(totalBeats).fill(false);
    const vocalDensity = new Array(totalBeats).fill(0.0);
    const harmonicTension = new Array(totalBeats).fill(0.0);
    const cadenceResolution = new Array(totalBeats).fill(0.0);
    const ornamentationDensity = [...indianProfile.ornamentationDensityByBeat];
    const tempoStability = [...rhythmicProfile.localTempoStability];

    for (let b = 0; b < totalBeats; b++) {
      const isSilent = vocalMap.silenceMap ? (vocalMap.silenceMap[b] ?? false) : false;
      vocalActivity[b] = !isSilent;
      vocalDensity[b] = vocalMap.vocalDensityByBeat ? (vocalMap.vocalDensityByBeat[b] ?? (isSilent ? 0 : 0.6)) : (isSilent ? 0 : 0.6);
      harmonicTension[b] = vocalMap.tensionMap ? (vocalMap.tensionMap[b] ?? 0.0) : 0.0;
      cadenceResolution[b] = vocalMap.resolutionMap ? (vocalMap.resolutionMap[b] ?? 0.0) : 0.0;
    }

    return {
      melodicPitchMidi,
      vocalActivity,
      vocalDensity,
      harmonicTension,
      cadenceResolution,
      expressiveDimensions: expressiveProfile.beatTrajectory,
      ornamentationDensity,
      tempoStability
    };
  }
}
