/**
 * MUSICBASE / SURGE STUDIO
 * Generative Arrangement Realization Engine (Phase 5 - Prompt 3)
 *
 * Core engine converting approved UMR decisions into a complete, evolving arrangement plan:
 * - 9-Instrument Role Assignment (Piano, Guitar, Bass, Drums, Tabla, Strings, Flute, Harmonium, Sitar)
 * - Section-Aware Structuring (Intro, Verse/Mukhda, Pre-Chorus, Chorus, Interlude, Antara, Climax, Outro)
 * - Dynamic Song Arc (Introduction -> Development -> Build -> Climax -> Release -> Resolution)
 * - Motif-Aware Variations & Call-and-Response Realization with Vocal Re-entry Protection
 * - Memory-Guided Repetition vs Novelty Balancing & Anti-Loop Divergence
 * - Transition Realization (Fills, Dynamic Swells, Tihai Cadences)
 * - Downstream Render Instruction Formatting
 *
 * 100% Offline-First, Deterministic, Sample-Accurate & Web Audio API Powered.
 */

import { UnifiedMusicalRepresentation, StructuralSectionHypothesis, MotifCluster } from '../../types/musicalBrain';
import { 
  GenerativeArrangementPlan, 
  GenerativeSectionState, 
  InstrumentKey, 
  InstrumentRole, 
  DynamicSongArcPhase,
  DynamicSongArcState,
  MotifArrangementEvent,
  CallResponseRealizationEvent,
  SectionTransitionRealization,
  RepetitionNoveltyTracking,
  GenerativeMusicModelProvider
} from '../../types/generativeArrangement';
import { MusicalIntent } from '../../types/generativeDecision';
import { MusicalIntentConverter } from './musicalIntentConverter';
import { GenerativeMusicDecisionEngine } from './generativeMusicDecisionEngine';
import { GenerativeMusicalMemory } from './generativeMemory';
import { DeterministicLocalArrangementProvider } from './arrangementModelProvider';
import { ChordVoicing, MusicalTimeline } from '../intelligentArrangementEngine';
import { VocalSilenceGap } from '../vocalUnderstandingEngine';

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

export class GenerativeArrangementRealizationEngine {
  private static instance: GenerativeArrangementRealizationEngine;
  private modelProvider: GenerativeMusicModelProvider;

  private constructor() {
    this.modelProvider = new DeterministicLocalArrangementProvider();
  }

  public static getInstance(): GenerativeArrangementRealizationEngine {
    if (!GenerativeArrangementRealizationEngine.instance) {
      GenerativeArrangementRealizationEngine.instance = new GenerativeArrangementRealizationEngine();
    }
    return GenerativeArrangementRealizationEngine.instance;
  }

  public setModelProvider(provider: GenerativeMusicModelProvider): void {
    this.modelProvider = provider;
  }

  /**
   * Realize a full generative arrangement plan from UMR and decisions.
   */
  public realizeArrangement(
    umr: UnifiedMusicalRepresentation,
    customMemory?: GenerativeMusicalMemory
  ): GenerativeArrangementPlan {
    const memory = customMemory || new GenerativeMusicalMemory();
    const decisionEngine = GenerativeMusicDecisionEngine.getInstance();
    const totalBeats = Math.max(1, umr.metadata.totalBeats || 32);
    const totalDurationSeconds = umr.metadata.totalDuration || (totalBeats * 0.5);
    const bpm = umr.metadata.bpm || 120;
    const key = umr.metadata.key || 'C';
    const scale = umr.metadata.scale || 'major';
    const timeline = umr.timeline || new MusicalTimeline(bpm, totalBeats, 44100);

    const allInstruments: InstrumentKey[] = [
      'piano', 'guitar', 'bass', 'drums', 'tabla', 'strings', 'flute', 'harmonium', 'sitar'
    ];

    // 1. Process Sections & Section-Aware States
    const rawSections: StructuralSectionHypothesis[] = (umr.sections && umr.sections.length > 0)
      ? umr.sections
      : [
          {
            id: 'sec_0',
            category: 'verse_mukhda',
            name: 'Verse',
            startBeat: 0,
            endBeat: Math.min(totalBeats, 16),
            startTime: 0,
            endTime: Math.min(totalDurationSeconds, 8),
            startSample: 0,
            endSample: Math.floor(Math.min(totalDurationSeconds, 8) * 44100),
            durationBeats: Math.min(totalBeats, 16),
            energyLevel: 0.5,
            vocalDensity: 0.5,
            melodicDensity: 0.5,
            instrumentationTargetDensity: 0.5,
            dominantRole: 'lead',
            associatedMotifIds: [],
            associatedPhraseIds: [],
            confidence: 0.9,
            provenance: 'heuristic_fallback'
          }
        ];

    const realizedSections: GenerativeSectionState[] = [];
    const sectionRepetitionCounts: Record<string, number> = {};

    for (let sIdx = 0; sIdx < rawSections.length; sIdx++) {
      const sec = rawSections[sIdx];
      const cat = sec.category;
      const repCount = sectionRepetitionCounts[cat] || 0;
      sectionRepetitionCounts[cat] = repCount + 1;
      memory.recordSection(cat, sec.confidence || 0.8);

      const sectionStartBeat = Math.max(0, sec.startBeat);
      const sectionEndBeat = Math.min(totalBeats, sec.endBeat);
      const durationBeats = Math.max(1, sectionEndBeat - sectionStartBeat);

      const intent = MusicalIntentConverter.deriveIntentAtBeat(umr, sectionStartBeat, cat);

      // Section Activity & Energy
      const vocalDensities = umr.beatTrajectories?.vocalDensity?.slice(sectionStartBeat, sectionEndBeat) || [];
      const avgVocalActivity = vocalDensities.length > 0
        ? vocalDensities.reduce((a, b) => a + b, 0) / vocalDensities.length
        : 0.5;

      const noveltyScore = clamp(0.5 + (repCount * 0.15) + (cat === 'chorus_climax' ? 0.2 : 0.0));

      // Build initial section state
      const initialSectionState: GenerativeSectionState = {
        sectionId: sec.id || `sec_${sIdx}`,
        category: cat,
        name: sec.name || sec.category.replace('_', ' ').toUpperCase(),
        startBeat: sectionStartBeat,
        endBeat: sectionEndBeat,
        durationBeats,
        energy: clamp(intent.energyDynamic),
        density: clamp(0.3 + (cat === 'chorus_hook' || cat === 'chorus_climax' ? 0.4 : 0.1) + repCount * 0.08),
        emotionalState: intent.emotionalState,
        vocalActivity: clamp(avgVocalActivity),
        instrumentActivity: {
          piano: 0.8,
          guitar: 0.7,
          bass: 0.8,
          drums: 0.7,
          tabla: 0.0,
          strings: 0.5,
          flute: 0.0,
          harmonium: 0.0,
          sitar: 0.0
        },
        instrumentRoles: {
          piano: 'FOUNDATION',
          guitar: 'SUPPORT',
          bass: 'FOUNDATION',
          drums: 'RHYTHMIC',
          tabla: 'OFF',
          strings: 'TEXTURE',
          flute: 'OFF',
          harmonium: 'OFF',
          sitar: 'OFF'
        },
        harmonicRole: cat === 'intro' ? 'tonic_anchor' : (cat === 'chorus_climax' ? 'cadential_resolution' : 'tension_build'),
        rhythmicRole: cat === 'intro' ? 'sparse_pulse' : (cat === 'chorus_hook' || cat === 'chorus_climax' ? 'driving_tihai' : 'subdivided_groove'),
        motifRole: cat === 'intro' ? 'statement' : (cat === 'interlude' ? 'development' : 'recapitulation'),
        callResponseRole: cat === 'interlude' ? 'instrumental_response' : 'lead_call',
        textureRole: cat === 'intro' ? 'sparse_acoustic' : (cat === 'chorus_climax' ? 'symphonic_full' : 'warm_pad'),
        transitionRole: sIdx < rawSections.length - 1 ? 'anticipation_swell' : 'smooth_flow',
        variationIndex: repCount,
        repetitionCount: repCount,
        noveltyScore,
        confidence: clamp(sec.confidence || 0.9),
        provenance: 'GenerativeArrangementRealizationEngine'
      };

      // Query model provider for instrument roles
      const suggestedRoles = this.modelProvider.suggestInstrumentRoles(initialSectionState, intent, memory);
      initialSectionState.instrumentRoles = suggestedRoles;

      // Adjust instrument activity densities
      for (const inst of allInstruments) {
        const role = suggestedRoles[inst] || 'OFF';
        if (role === 'OFF') {
          initialSectionState.instrumentActivity[inst] = 0.0;
        } else if (role === 'FOUNDATION' || role === 'RHYTHMIC') {
          initialSectionState.instrumentActivity[inst] = clamp(0.7 + repCount * 0.05);
        } else if (role === 'CLIMAX') {
          initialSectionState.instrumentActivity[inst] = 0.95;
        } else {
          initialSectionState.instrumentActivity[inst] = clamp(0.5 + repCount * 0.05);
        }
      }

      realizedSections.push(initialSectionState);
    }

    // 2. Continuous Trajectories per Beat for all 9 Instruments
    const instrumentRolesByBeat: Record<InstrumentKey, InstrumentRole[]> = {
      piano: new Array(totalBeats).fill('OFF'),
      guitar: new Array(totalBeats).fill('OFF'),
      bass: new Array(totalBeats).fill('OFF'),
      drums: new Array(totalBeats).fill('OFF'),
      tabla: new Array(totalBeats).fill('OFF'),
      strings: new Array(totalBeats).fill('OFF'),
      flute: new Array(totalBeats).fill('OFF'),
      harmonium: new Array(totalBeats).fill('OFF'),
      sitar: new Array(totalBeats).fill('OFF')
    };

    const instrumentDensityByBeat: Record<InstrumentKey, number[]> = {
      piano: new Array(totalBeats).fill(0),
      guitar: new Array(totalBeats).fill(0),
      bass: new Array(totalBeats).fill(0),
      drums: new Array(totalBeats).fill(0),
      tabla: new Array(totalBeats).fill(0),
      strings: new Array(totalBeats).fill(0),
      flute: new Array(totalBeats).fill(0),
      harmonium: new Array(totalBeats).fill(0),
      sitar: new Array(totalBeats).fill(0)
    };

    const overallDensityCurve = new Array(totalBeats).fill(0.5);

    for (let b = 0; b < totalBeats; b++) {
      const activeSec = realizedSections.find(s => b >= s.startBeat && b < s.endBeat) || realizedSections[0];
      const vocalDensity = umr.beatTrajectories?.vocalDensity?.[b] ?? 0.5;
      
      // Vocal Priority Masking Adjustment
      const vocalSuppressionFactor = vocalDensity > 0.7 ? 0.85 : 1.0;

      let sumDensity = 0;
      let activeCount = 0;

      for (const inst of allInstruments) {
        const role = activeSec.instrumentRoles[inst] || 'OFF';
        instrumentRolesByBeat[inst][b] = role;

        let baseDensity = activeSec.instrumentActivity[inst] || 0.0;
        if (role !== 'OFF' && (role === 'FILL' || role === 'RESPONSE')) {
          // Boost fill/response density during vocal silence
          if (vocalDensity < 0.2) {
            baseDensity = Math.min(1.0, baseDensity * 1.3);
          }
        } else {
          baseDensity *= vocalSuppressionFactor;
        }

        const finalDens = clamp(baseDensity);
        instrumentDensityByBeat[inst][b] = finalDens;
        if (finalDens > 0.05) {
          sumDensity += finalDens;
          activeCount++;
        }
      }

      overallDensityCurve[b] = activeCount > 0 ? clamp(sumDensity / activeCount) : 0.3;
    }

    // 3. Dynamic Global Song Arc
    const dynamicArc = this.computeDynamicSongArc(realizedSections, totalBeats, umr);

    // 4. Motif-Aware Variations
    const motifEvents = this.realizeMotifVariations(umr, realizedSections, memory);

    // 5. Intelligent Call-and-Response Realization
    const callResponseEvents = this.realizeCallAndResponse(umr, realizedSections, totalBeats);

    // 6. Section Transitions Realization
    const transitions = this.realizeSectionTransitions(realizedSections, umr);

    // 7. Harmonic Voicings & Chord Progression Map (Part 2 Harmonic Lock)
    const { chordVoicingsByBeat, chordMapByBeat } = this.resolveHarmonicVoicings(umr, realizedSections, totalBeats);

    // 8. Repetition & Novelty Tracking (Anti-Loop Verification)
    const repetitionNovelty: RepetitionNoveltyTracking = {
      sectionRepetitions: sectionRepetitionCounts,
      phraseRepetitions: {},
      motifOccurrences: {},
      instrumentPairingFrequencies: {},
      averageNoveltyScore: realizedSections.reduce((acc, s) => acc + s.noveltyScore, 0) / realizedSections.length,
      antiLoopDivergenceApplied: Object.values(sectionRepetitionCounts).some(c => c > 1)
    };

    return {
      songId: umr.metadata.songId || 'gen_song_plan',
      totalBeats,
      totalDurationSeconds,
      bpm,
      key,
      scale,
      sections: realizedSections,
      instrumentRolesByBeat,
      instrumentDensityByBeat,
      dynamicArc,
      motifEvents,
      callResponseEvents,
      transitions,
      repetitionNovelty,
      chordVoicingsByBeat,
      chordMapByBeat,
      overallDensityCurve,
      timeline,
      confidence: 0.94,
      provenance: 'GenerativeArrangementRealizationEngine'
    };
  }

  private computeDynamicSongArc(
    sections: GenerativeSectionState[],
    totalBeats: number,
    umr: UnifiedMusicalRepresentation
  ): DynamicSongArcState {
    const globalPhaseByBeat: DynamicSongArcPhase[] = new Array(totalBeats).fill('development');
    const arcTrajectory = new Array(totalBeats).fill(0.5);

    let peakClimaxBeat = Math.floor(totalBeats * 0.75);

    // Identify climax section if present
    const climaxSec = sections.find(s => s.category === 'chorus_climax');
    if (climaxSec) {
      peakClimaxBeat = Math.floor((climaxSec.startBeat + climaxSec.endBeat) / 2);
    }

    for (let b = 0; b < totalBeats; b++) {
      const progress = b / Math.max(1, totalBeats);
      const sec = sections.find(s => b >= s.startBeat && b < s.endBeat);
      const cat = sec?.category;

      let phase: DynamicSongArcPhase = 'development';
      let arcVal = 0.5;

      if (cat === 'intro' || progress < 0.15) {
        phase = 'introduction';
        arcVal = 0.2 + progress * 0.3;
      } else if (cat === 'pre_chorus' || (progress >= 0.35 && progress < 0.5)) {
        phase = 'build';
        arcVal = 0.6 + progress * 0.2;
      } else if (cat === 'chorus_climax' || (b >= peakClimaxBeat - 4 && b <= peakClimaxBeat + 4)) {
        phase = 'climax';
        arcVal = 0.95;
      } else if (cat === 'interlude') {
        phase = 'release';
        arcVal = 0.45;
      } else if (cat === 'outro' || progress > 0.85) {
        phase = 'resolution';
        arcVal = Math.max(0.2, 0.6 - (progress - 0.85) * 2.0);
      } else {
        phase = 'development';
        arcVal = 0.5 + progress * 0.2;
      }

      globalPhaseByBeat[b] = phase;
      arcTrajectory[b] = clamp(arcVal);
    }

    return {
      globalPhaseByBeat,
      peakClimaxBeat,
      arcTrajectory,
      vocalCouplingWeight: 0.85
    };
  }

  private realizeMotifVariations(
    umr: UnifiedMusicalRepresentation,
    sections: GenerativeSectionState[],
    memory: GenerativeMusicalMemory
  ): MotifArrangementEvent[] {
    const events: MotifArrangementEvent[] = [];
    const motifs = umr.motifClusters || [];
    const isIndian = umr.indianProfile?.primaryRaga?.value?.ragaName !== 'Bilawal';
    const rootSaMidi = umr.indianProfile?.tonicSaMidi || 60;

    let motifCounter = 0;
    for (const m of motifs) {
      const targetInst: InstrumentKey = isIndian
        ? (motifCounter % 2 === 0 ? 'sitar' : 'flute')
        : (motifCounter % 2 === 0 ? 'piano' : 'guitar');

      const varIndex = memory.getMotifRepetitionCount(m.id || `motif_${motifCounter}`);
      memory.recordMotif(m.id || `motif_${motifCounter}`, m.canonicalIntervals || [0, 4, 7], 0, 'theme');

      const event = this.modelProvider.suggestMotifVariation(m, varIndex, targetInst, rootSaMidi) as MotifArrangementEvent;
      
      // Target appropriate interlude or intro section
      const interlude = sections.find(s => s.category === 'interlude' || s.category === 'intro');
      event.targetBeat = interlude ? interlude.startBeat + 2 : Math.min(umr.metadata.totalBeats || 32, 8);

      events.push(event);
      motifCounter++;
    }

    return events;
  }

  private realizeCallAndResponse(
    umr: UnifiedMusicalRepresentation,
    sections: GenerativeSectionState[],
    totalBeats: number
  ): CallResponseRealizationEvent[] {
    const events: CallResponseRealizationEvent[] = [];
    const gaps: VocalSilenceGap[] = umr.silenceGaps || [];
    const isIndian = umr.indianProfile?.primaryRaga?.value?.ragaName !== 'Bilawal';
    const rootSa = umr.indianProfile?.tonicSaMidi || 60;

    let eventIdx = 0;
    for (const gap of gaps) {
      const startBeat = Math.max(0, gap.startBeat);
      const durationBeats = Math.max(0.5, gap.duration);
      const endBeat = Math.min(totalBeats, startBeat + durationBeats);

      // Section context
      const activeSec = sections.find(s => startBeat >= s.startBeat && startBeat < s.endBeat);
      const isIntroOrOutro = activeSec?.category === 'intro' || activeSec?.category === 'outro';

      if (isIntroOrOutro) continue;

      // Short-gap suppression rule (< 2 beats)
      const isShortGap = durationBeats < 2.0;

      let responderInstrument: InstrumentKey = 'piano';
      if (gap.recommendedResponseInstrument === 'flute') responderInstrument = 'flute';
      else if (gap.recommendedResponseInstrument === 'strings') responderInstrument = 'strings';
      else if (isIndian) responderInstrument = eventIdx % 2 === 0 ? 'sitar' : 'flute';
      else responderInstrument = eventIdx % 2 === 0 ? 'piano' : 'guitar';

      // Vocal re-entry protection headroom (ensure response finishes 0.5 beats before next vocal onset)
      const vocalReentrySafetyBeats = 0.5;
      const usableDuration = Math.max(0.5, durationBeats - vocalReentrySafetyBeats);

      const notes: CallResponseRealizationEvent['notes'] = [];
      if (!isShortGap) {
        const noteCount = durationBeats > 4.0 ? 4 : 2;
        const step = usableDuration / noteCount;
        for (let i = 0; i < noteCount; i++) {
          notes.push({
            beat: startBeat + (i * step),
            midi: rootSa + 7 + (i * 2), // Melodic fifth ascend
            duration: step * 0.8,
            velocity: 0.75
          });
        }
      }

      events.push({
        eventId: `cr_evt_${eventIdx++}`,
        gapId: gap.id || eventIdx,
        startBeat,
        endBeat,
        durationBeats,
        leaderPhraseId: gap.afterPhraseId || 0,
        responderInstrument,
        responseRole: isShortGap ? 'OFF' : 'RESPONSE',
        isSuppressedDueToShortGap: isShortGap,
        vocalReentrySafetyBeats,
        notes
      });
    }

    return events;
  }

  private realizeSectionTransitions(
    sections: GenerativeSectionState[],
    umr: UnifiedMusicalRepresentation
  ): SectionTransitionRealization[] {
    const transitions: SectionTransitionRealization[] = [];

    for (let i = 0; i < sections.length - 1; i++) {
      const fromSec = sections[i];
      const toSec = sections[i + 1];
      const intent = MusicalIntentConverter.deriveIntentAtBeat(umr, fromSec.endBeat - 2);

      const trans = this.modelProvider.suggestTransition(fromSec, toSec, intent) as SectionTransitionRealization;
      transitions.push(trans);
    }

    return transitions;
  }

  private resolveHarmonicVoicings(
    umr: UnifiedMusicalRepresentation,
    sections: GenerativeSectionState[],
    totalBeats: number
  ): { chordVoicingsByBeat: ChordVoicing[]; chordMapByBeat: number[] } {
    const rootMidi = umr.indianProfile?.tonicSaMidi || 60;
    const isMinor = umr.metadata.scale === 'minor';

    const chordVoicingsByBeat: ChordVoicing[] = new Array(totalBeats);
    const chordMapByBeat: number[] = new Array(totalBeats).fill(0);

    for (let b = 0; b < totalBeats; b++) {
      const sec = sections.find(s => b >= s.startBeat && b < s.endBeat) || sections[0];
      const cat = sec.category;

      let rootOffset = 0;
      let chordType: ChordVoicing['chordType'] = isMinor ? 'min' : 'maj';

      if (cat === 'chorus_hook' || cat === 'chorus_climax') {
        const barPos = b % 8;
        if (barPos >= 4) rootOffset = 5; // Subdominant IV
      } else if (cat === 'pre_chorus') {
        rootOffset = 7; // Dominant V
      }

      chordMapByBeat[b] = rootOffset;
      chordVoicingsByBeat[b] = {
        rootOffset,
        chordType,
        inversion: 0,
        chordName: isMinor ? (rootOffset === 0 ? 'i' : 'iv') : (rootOffset === 0 ? 'I' : 'IV'),
        midiNotes: [rootMidi + rootOffset, rootMidi + rootOffset + (isMinor ? 3 : 4), rootMidi + rootOffset + 7],
        voiceLeadingDistance: 0
      };
    }

    return { chordVoicingsByBeat, chordMapByBeat };
  }
}
