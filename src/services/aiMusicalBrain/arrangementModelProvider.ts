/**
 * MUSICBASE / SURGE STUDIO
 * Deterministic Arrangement Model Provider (Phase 5 - Prompt 3)
 *
 * Implements the lightweight GenerativeMusicModelProvider interface.
 * Provides pluggable architecture for local algorithmic and future neural AI models.
 *
 * 100% Offline-First, Deterministic, Zero Math.random().
 */

import {
  GenerativeMusicModelProvider,
  ArrangementContextAnalysis,
  GenerativeSectionState,
  InstrumentKey,
  InstrumentRole,
  MotifArrangementEvent,
  SectionTransitionRealization
} from '../../types/generativeArrangement';
import { UnifiedMusicalRepresentation, MotifCluster, SwaraName } from '../../types/musicalBrain';
import { MusicalIntent, GenerativeCandidate, CandidateScoringBreakdown } from '../../types/generativeDecision';
import { CandidateScoringEngine } from './candidateScoringEngine';

function clamp(val: number, min = 0.0, max = 1.0): number {
  if (Number.isNaN(val) || !Number.isFinite(val)) return min;
  return Math.max(min, Math.min(max, val));
}

function deriveSeed(str: string): number {
  let hash = 2166136261;
  for (let i = 0; i < str.length; i++) {
    hash ^= str.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0) / 4294967296;
}

export class DeterministicLocalArrangementProvider implements GenerativeMusicModelProvider {
  public readonly name = 'Surge-Deterministic-Arrangement-Model-v1';
  public readonly version = '1.0.0-offline';

  public analyzeArrangementContext(umr: UnifiedMusicalRepresentation): ArrangementContextAnalysis {
    const totalBeats = umr.metadata.totalBeats || 32;
    const vocalDensities = umr.beatTrajectories?.vocalDensity || [];
    const avgIntensity = vocalDensities.length > 0
      ? vocalDensities.reduce((a, b) => a + b, 0) / vocalDensities.length
      : 0.5;

    const highTensionBeats: number[] = [];
    const tensionTrajectory = umr.beatTrajectories?.harmonicTension || [];
    for (let b = 0; b < tensionTrajectory.length; b++) {
      if (tensionTrajectory[b] > 0.7) {
        highTensionBeats.push(b);
      }
    }

    return {
      umr,
      totalBeats,
      averageVocalIntensity: clamp(avgIntensity),
      emotionalArc: umr.expressiveProfile?.dynamicArcType || 'steady',
      dominantRaga: umr.indianProfile?.primaryRaga?.value?.ragaName || 'Bilawal',
      highTensionBeats
    };
  }

  public suggestInstrumentRoles(
    section: GenerativeSectionState,
    intent: MusicalIntent,
    memoryState: any
  ): Record<InstrumentKey, InstrumentRole> {
    const category = section.category;
    const isIndian = intent.indianModalContext.isModalFocus || intent.indianModalContext.ragaName !== 'Bilawal';
    const isHighEnergy = intent.energyDynamic > 0.65;
    const isClimax = category === 'chorus_climax' || intent.climaxReleaseState === 'climax';
    const repetition = section.repetitionCount || 0;

    const roles: Record<InstrumentKey, InstrumentRole> = {
      piano: 'OFF',
      guitar: 'OFF',
      bass: 'OFF',
      drums: 'OFF',
      tabla: 'OFF',
      strings: 'OFF',
      flute: 'OFF',
      harmonium: 'OFF',
      sitar: 'OFF'
    };

    switch (category) {
      case 'intro':
        roles.piano = 'FOUNDATION';
        roles.guitar = 'TEXTURE';
        roles.strings = 'TEXTURE';
        roles.flute = 'MELODIC';
        if (isIndian) {
          roles.sitar = 'MELODIC';
          roles.harmonium = 'SUPPORT';
        }
        break;

      case 'verse_mukhda':
        roles.piano = 'FOUNDATION';
        roles.bass = 'FOUNDATION';
        roles.guitar = 'SUPPORT';
        if (isIndian) {
          roles.tabla = 'RHYTHMIC';
          roles.harmonium = 'SUPPORT';
        } else {
          roles.drums = isHighEnergy ? 'RHYTHMIC' : 'SUPPORT';
        }
        if (repetition > 0) {
          roles.strings = 'TEXTURE';
        }
        break;

      case 'pre_chorus':
        roles.piano = 'RHYTHMIC';
        roles.bass = 'FOUNDATION';
        roles.guitar = 'RHYTHMIC';
        roles.strings = 'SUPPORT';
        if (isIndian) {
          roles.tabla = 'RHYTHMIC';
          roles.harmonium = 'RHYTHMIC';
          roles.sitar = 'FILL';
        } else {
          roles.drums = 'RHYTHMIC';
        }
        break;

      case 'chorus_hook':
        roles.piano = 'FOUNDATION';
        roles.guitar = 'RHYTHMIC';
        roles.bass = 'FOUNDATION';
        roles.strings = 'CLIMAX';
        if (isIndian) {
          roles.tabla = 'RHYTHMIC';
          roles.harmonium = 'SUPPORT';
          roles.sitar = 'RESPONSE';
        } else {
          roles.drums = 'RHYTHMIC';
          roles.flute = 'RESPONSE';
        }
        break;

      case 'interlude':
        roles.piano = 'SUPPORT';
        roles.bass = 'FOUNDATION';
        roles.strings = 'SUPPORT';
        if (isIndian) {
          roles.sitar = 'MELODIC';
          roles.flute = 'RESPONSE';
          roles.tabla = 'RHYTHMIC';
        } else {
          roles.guitar = 'MELODIC';
          roles.flute = 'MELODIC';
          roles.drums = 'RHYTHMIC';
        }
        break;

      case 'verse_antara':
        roles.piano = 'FOUNDATION';
        roles.bass = 'FOUNDATION';
        roles.guitar = 'SUPPORT';
        roles.strings = 'TEXTURE';
        if (isIndian) {
          roles.tabla = 'RHYTHMIC';
          roles.harmonium = 'SUPPORT';
          roles.flute = 'FILL';
        } else {
          roles.drums = 'SUPPORT';
        }
        break;

      case 'chorus_climax':
        roles.piano = 'CLIMAX';
        roles.guitar = 'CLIMAX';
        roles.bass = 'FOUNDATION';
        roles.strings = 'CLIMAX';
        if (isIndian) {
          roles.tabla = 'CLIMAX';
          roles.harmonium = 'CLIMAX';
          roles.sitar = 'CLIMAX';
        } else {
          roles.drums = 'CLIMAX';
          roles.flute = 'FILL';
        }
        break;

      case 'outro':
        roles.piano = 'FOUNDATION';
        roles.strings = 'TEXTURE';
        roles.flute = 'MELODIC';
        if (isIndian) {
          roles.sitar = 'MELODIC';
          roles.harmonium = 'TEXTURE';
        } else {
          roles.guitar = 'TEXTURE';
        }
        break;

      default:
        roles.piano = 'FOUNDATION';
        roles.bass = 'FOUNDATION';
        roles.strings = 'TEXTURE';
    }

    return roles;
  }

  public suggestMotifVariation(
    motif: MotifCluster,
    variationIndex: number,
    targetInstrument: InstrumentKey,
    rootSaMidi: number
  ): MotifArrangementEvent {
    const rawPitches = motif.canonicalIntervals || [0, 4, 7];
    const baseMidi = rootSaMidi || 60;
    const duration = Math.max(1, motif.instances?.[0]?.durationBeats || 4);

    let variationType: MotifArrangementEvent['variationType'] = 'exact_repetition';
    let transpositionSemitones = 0;

    if (variationIndex === 1) {
      variationType = 'transposition';
      transpositionSemitones = 7; // Dominant transposition (P5)
    } else if (variationIndex === 2) {
      variationType = 'rhythmic_dilation';
      transpositionSemitones = 0;
    } else if (variationIndex >= 3) {
      variationType = 'ornamented_flourish';
      transpositionSemitones = 0;
    }

    const notes: MotifArrangementEvent['notes'] = [];
    const noteCount = rawPitches.length;
    const stepDuration = duration / Math.max(1, noteCount);

    for (let i = 0; i < noteCount; i++) {
      const interval = rawPitches[i];
      let finalMidi = baseMidi + interval + transpositionSemitones;
      let finalDuration = stepDuration;

      if (variationType === 'rhythmic_dilation') {
        finalDuration = i === noteCount - 1 ? stepDuration * 1.5 : stepDuration * 0.8;
      }

      notes.push({
        beat: i * stepDuration,
        midi: Math.max(24, Math.min(108, finalMidi)),
        duration: Math.max(0.25, finalDuration),
        velocity: 0.75 + (i % 2 === 0 ? 0.05 : -0.05)
      });
    }

    return {
      motifId: motif.id || `motif_${Date.now()}`,
      sourceBeat: motif.instances?.[0]?.startBeat || 0,
      targetBeat: 0, // Set by caller
      durationBeats: duration,
      variationIndex,
      assignedInstrument: targetInstrument,
      variationType,
      transpositionSemitones,
      notes
    };
  }

  public suggestTransition(
    fromSection: GenerativeSectionState,
    toSection: GenerativeSectionState,
    intent: MusicalIntent
  ): SectionTransitionRealization {
    const durationBeats = 4;
    const startBeat = Math.max(0, fromSection.endBeat - durationBeats);
    const isToChorus = toSection.category === 'chorus_hook' || toSection.category === 'chorus_climax';
    const isIndian = intent.indianModalContext.isModalFocus;

    const buildType = isToChorus
      ? (isIndian ? 'tihai_cadence' : 'dynamic_swell')
      : 'smooth_crossfade';

    const primaryFill = isIndian ? 'tabla' : 'drums';
    const fillVelocityCurve = [0.55, 0.65, 0.8, 0.95];

    return {
      fromSectionCategory: fromSection.category,
      toSectionCategory: toSection.category,
      transitionStartBeat: startBeat,
      transitionEndBeat: fromSection.endBeat,
      durationBeats,
      buildType,
      primaryFillInstrument: primaryFill,
      fillVelocityCurve,
      crescendoLevel: isToChorus ? 0.9 : 0.6
    };
  }

  public scoreGenerativeCandidate<T>(
    candidate: GenerativeCandidate<T>,
    intent: MusicalIntent,
    umr?: UnifiedMusicalRepresentation
  ): CandidateScoringBreakdown {
    const dummyUMR = umr || ({} as any);
    return CandidateScoringEngine.computeBreakdown(candidate, dummyUMR, intent, 0);
  }
}
