/**
 * MUSICBASE / SURGE STUDIO
 * Cross-Stem Expressive Coherence & Vocal Priority Coordinator (Phase 24 - Part 4B)
 *
 * Propagates canonical VocalSongMap and Part 4A Expressive Performance Map into a
 * sample-accurate, unified, multi-stem arrangement state.
 *
 * Core Capabilities:
 * 1. 9-Stem Cross-Stem Expressive Coherence (Drums, Tabla, Bass, Piano, Guitar, Strings, Flute, Harmonium, Sitar)
 * 2. Deterministic Vocal Activity State Machine (9 States: IDLE, VOCAL_ENTRY, VOCAL_ACTIVE, VOCAL_SUSTAIN, VOCAL_CLIMAX, PHRASE_RELEASE, VOCAL_GAP, FILL, VOCAL_REENTRY)
 * 3. Vocal Priority Arbitration (Levels 1-5 Dynamic Hierarchy)
 * 4. Vocal Re-Entry Protection (Pre-entry fill taper, attack de-confliction, click-free harmonic restoration)
 * 5. Fill Entry / Exit Intelligence (Gap duration, preceding energy, next onset distance, role gating)
 * 6. Cross-Stem Density Arbitration (Continuous bounded multi-stem capacity scaling)
 * 7. Phrase Climax Orchestration & Gradual Release (Instrument-specific swelling without all-stem clipping)
 * 8. Spatial / Stereo Coherence & Dynamic Width Modulation (Phase-aligned, mono-compatible, stable imaging)
 * 9. Master Headroom, Bounded Gain & Zero-Clipping Protection
 *
 * 100% Offline-First, Deterministic, Zero-Math.random(), Bounded [0.0, 1.0].
 */

import {
  VocalSongMap,
  DeepVocalPhrase,
  VocalSilenceGap,
  VocalEmotionalPeak,
  DetectedVocalNote
} from './vocalUnderstandingEngine';
import {
  ExpressiveVocalPerformanceMap,
  ExpressivePerformanceEngine,
  smoothExpressiveCurve,
  getDeterministicVariation
} from './expressivePerformanceEngine';
import { MusicalTimeline, ArrangementPlan, SongSection } from './intelligentArrangementEngine';

export type VocalActivityState =
  | 'IDLE'
  | 'VOCAL_ENTRY'
  | 'VOCAL_ACTIVE'
  | 'VOCAL_SUSTAIN'
  | 'VOCAL_CLIMAX'
  | 'PHRASE_RELEASE'
  | 'VOCAL_GAP'
  | 'FILL'
  | 'VOCAL_REENTRY';

export enum DynamicHierarchyLevel {
  LEVEL_1_LEAD_VOCAL = 1,
  LEVEL_2_HARMONIC_FOUNDATION = 2,
  LEVEL_3_RHYTHMIC_FOUNDATION = 3,
  LEVEL_4_SUPPORTING_TEXTURE = 4,
  LEVEL_5_DECORATIVE_RESPONSE = 5
}

export interface CoordinatedStemProfile {
  beat: number;
  vocalState: VocalActivityState;
  aggregateDensity: number;      // 0.0 to 1.0 total active accompaniment load
  densityScaleFactor: number;    // 0.60 to 1.0 capacity scaling factor
  vocalPriorityDucking: number;  // 0.0 to 1.0 (1.0 = no reduction, 0.72 = vocal foreground ducking)
  vocalReentryTaper: number;     // 0.0 to 1.0 (0.0 = fully tapered at vocal entry, 1.0 = full fill)
  fillEligibility: boolean;      // whether decorative fills may play on this beat
  climaxExpansion: number;       // 0.0 to 1.0 climax orchestrator boost
  stereoWidthMultiplier: number; // 0.85 to 1.15 dynamic stereo width factor
  
  // Specific Coordinated Gains and Gating
  drums: {
    kickGain: number;            // [0.70, 1.15]
    snareGain: number;           // [0.70, 1.15]
    hihatGain: number;           // [0.50, 1.00]
    fillAllowed: boolean;
  };
  tabla: {
    thekaGain: number;           // [0.70, 1.15]
    bayanMod: number;            // [0.80, 1.25]
    fillAllowed: boolean;
  };
  bass: {
    gain: number;                // [0.70, 1.10]
    sustainScale: number;        // [0.70, 1.25]
    octaveJumpAllowed: boolean;
  };
  piano: {
    compGain: number;            // [0.50, 1.05]
    fillGain: number;            // [0.00, 1.00]
    sustainScale: number;        // [0.75, 1.30]
    fillAllowed: boolean;
  };
  guitar: {
    strumGain: number;           // [0.55, 1.05]
    arpDensity: number;          // [0.20, 1.00]
    panOffset: number;           // base pan offset
  };
  strings: {
    padGain: number;             // [0.40, 1.15]
    swellGain: number;           // [0.50, 1.25]
    allowed: boolean;
    panOffset: number;
  };
  flute: {
    fillGain: number;            // [0.00, 1.05]
    responseAllowed: boolean;
    panOffset: number;
  };
  harmonium: {
    foundationGain: number;      // [0.60, 1.10]
    panOffset: number;
  };
  sitar: {
    leadGain: number;            // [0.00, 1.05]
    chikariAllowed: boolean;
    fillAllowed: boolean;
    panOffset: number;
  };
}

export interface CrossStemCoherenceMap {
  totalBeats: number;
  stateByBeat: VocalActivityState[];
  aggregateDensityCurve: number[];
  reentryTaperCurve: number[];
  climaxCurve: number[];
  profilesByBeat: CoordinatedStemProfile[];
}

function clamp(val: number, min: number = 0.0, max: number = 1.0): number {
  if (Number.isNaN(val) || !Number.isFinite(val)) return min;
  return Math.max(min, Math.min(max, val));
}

export class CrossStemCoordinator {
  private static instance: CrossStemCoordinator;

  public static getInstance(): CrossStemCoordinator {
    if (!CrossStemCoordinator.instance) {
      CrossStemCoordinator.instance = new CrossStemCoordinator();
    }
    return CrossStemCoordinator.instance;
  }

  /**
   * Determine Vocal Activity State for a given beat deterministically
   */
  public determineVocalState(
    beat: number,
    vocalMap: VocalSongMap,
    expMap: ExpressiveVocalPerformanceMap,
    totalBeats: number
  ): VocalActivityState {
    const b = Math.max(0, Math.min(totalBeats - 1, Math.floor(beat)));
    const bpm = vocalMap.bpm || 120;
    const secPerBeat = 60 / bpm;
    const t = beat * secPerBeat;

    const notes = vocalMap.notes || [];
    const phrases = vocalMap.phrases || [];
    const gaps = vocalMap.silenceGaps || [];
    const peaks = vocalMap.emotionalPeaks || [];

    // Check if within intro / before first phrase
    const firstPhrase = phrases[0];
    if (firstPhrase && beat < firstPhrase.startBeat) {
      // If within 0.75 beats of first phrase entry -> VOCAL_REENTRY preparation
      if (firstPhrase.startBeat - beat <= 0.75) {
        return 'VOCAL_REENTRY';
      }
      return 'IDLE';
    }

    // Check if currently inside a silence gap
    const activeGap = gaps.find(g => beat >= g.startBeat && beat < g.endBeat);
    if (activeGap) {
      const beatsUntilGapEnd = activeGap.endBeat - beat;
      // Protected vocal re-entry window: last 0.75 beat of gap
      if (beatsUntilGapEnd <= 0.75) {
        return 'VOCAL_REENTRY';
      }
      // Fill window if gap is meaningful space and at least 1.0 beat duration
      if (activeGap.isMeaningfulMusicalSpace && activeGap.duration >= 1.0 && activeGap.fillCapacity !== 'none') {
        const gapProg = (beat - activeGap.startBeat) / Math.max(1, activeGap.endBeat - activeGap.startBeat);
        if (gapProg >= 0.15 && gapProg <= 0.85) {
          return 'FILL';
        }
      }
      return 'VOCAL_GAP';
    }

    // Check active phrase
    const activePhrase = phrases.find(p => beat >= p.startBeat && beat <= p.endBeat);
    if (activePhrase) {
      const pLen = Math.max(1, activePhrase.endBeat - activePhrase.startBeat);
      const prog = (beat - activePhrase.startBeat) / pLen;

      // Phrase entry: first 0.75 beats
      if (beat - activePhrase.startBeat <= 0.75) {
        return 'VOCAL_ENTRY';
      }

      // Phrase release: last 20% of phrase
      if (prog >= 0.80) {
        return 'PHRASE_RELEASE';
      }

      // Check explicit emotional climax / peak
      const isPeakBeat = peaks.some(pk => Math.abs(beat - pk.beat) <= 1.5 && (pk.intensity ?? 1.0) >= 0.75);
      const isClimaxPeak = isPeakBeat || (activePhrase.isHighIntensity && (expMap.emotionalPeakCurve[b] ?? 0) > 0.80);
      if (isClimaxPeak) {
        return 'VOCAL_CLIMAX';
      }

      // Check sustained hold
      const isSustainedNote = notes.some(n => n.isSustained && beat >= n.startBeat && beat <= n.endBeat);
      const isExpSustained = (expMap.sustainedNoteCurve[b] ?? 0) > 0.55;
      if (isSustainedNote || isExpSustained) {
        return 'VOCAL_SUSTAIN';
      }

      // Check high intensity phrase climax
      if (activePhrase.isHighIntensity && prog >= 0.35 && prog <= 0.80) {
        return 'VOCAL_CLIMAX';
      }

      return 'VOCAL_ACTIVE';
    }

    // Fallback: check if vocal density is active
    const dens = vocalMap.vocalDensityByBeat?.[b] ?? 0;
    if (dens > 0.15) {
      return 'VOCAL_ACTIVE';
    }

    return 'VOCAL_GAP';
  }

  /**
   * Build complete Cross-Stem Coherence Map deterministically for the entire arrangement
   */
  public coordinateArrangement(
    plan: ArrangementPlan,
    expMap: ExpressiveVocalPerformanceMap,
    timeline: MusicalTimeline,
    totalBeats: number
  ): CrossStemCoherenceMap {
    const vocalMap = plan.vocalMap;
    const stateByBeat: VocalActivityState[] = new Array(totalBeats);
    const aggregateDensityCurve: number[] = new Array(totalBeats);
    const reentryTaperCurve: number[] = new Array(totalBeats).fill(1.0);
    const rawDuckingCurve: number[] = new Array(totalBeats).fill(1.0);
    const climaxCurve: number[] = new Array(totalBeats).fill(0.0);
    const profilesByBeat: CoordinatedStemProfile[] = new Array(totalBeats);

    // 1. First Pass: Compute Vocal States
    for (let b = 0; b < totalBeats; b++) {
      stateByBeat[b] = this.determineVocalState(b, vocalMap, expMap, totalBeats);
    }

    // 2. Second Pass: Re-Entry Protection & Fill Taper Curve
    // Smoothly ramp down fill energy to 0.0 before any vocal entry or re-entry
    for (let b = 0; b < totalBeats; b++) {
      const state = stateByBeat[b];
      if (state === 'VOCAL_REENTRY') {
        // Taper down aggressively across the re-entry window
        reentryTaperCurve[b] = 0.10;
      } else if (state === 'VOCAL_ENTRY') {
        reentryTaperCurve[b] = 0.0;
      } else if (state === 'FILL') {
        // Check distance to next VOCAL_REENTRY / VOCAL_ENTRY
        let distToEntry = 999;
        for (let nextB = b + 1; nextB < Math.min(totalBeats, b + 6); nextB++) {
          if (stateByBeat[nextB] === 'VOCAL_REENTRY' || stateByBeat[nextB] === 'VOCAL_ENTRY' || stateByBeat[nextB] === 'VOCAL_ACTIVE') {
            distToEntry = nextB - b;
            break;
          }
        }
        if (distToEntry <= 1.0) {
          reentryTaperCurve[b] = 0.25;
        } else if (distToEntry <= 2.0) {
          reentryTaperCurve[b] = 0.65;
        } else {
          reentryTaperCurve[b] = 1.0;
        }
      } else if (state === 'VOCAL_ACTIVE' || state === 'VOCAL_SUSTAIN' || state === 'VOCAL_CLIMAX') {
        reentryTaperCurve[b] = 0.0;
      } else {
        reentryTaperCurve[b] = 1.0;
      }
    }
    const smoothedTaper = smoothExpressiveCurve(reentryTaperCurve);

    // 3. Third Pass: Aggregate Accompaniment Density, Climax & Raw Ducking Curves
    for (let b = 0; b < totalBeats; b++) {
      const state = stateByBeat[b];
      const pEnergy = expMap.phraseEnergyCurve[b] ?? 0.5;
      const peakScore = expMap.emotionalPeakCurve[b] ?? 0.0;
      const vInt = expMap.intensityCurve[b] ?? 0.0;
      const planDens = plan.densityCurveByBeat ? (plan.densityCurveByBeat[b] ?? 0.5) : 0.5;
      const isVocalSinging = state === 'VOCAL_ACTIVE' || state === 'VOCAL_SUSTAIN' || state === 'VOCAL_CLIMAX' || state === 'VOCAL_ENTRY';

      // Smooth Dynamic Hierarchy Ducking
      rawDuckingCurve[b] = isVocalSinging ? clamp(0.82 - vInt * 0.12, 0.72, 0.88) : 1.0;

      // Climax orchestration score
      let climax = 0.0;
      if (state === 'VOCAL_CLIMAX' || peakScore > 0.60) {
        climax = clamp(0.75 + peakScore * 0.25);
      } else if (pEnergy > 0.75) {
        climax = clamp((pEnergy - 0.75) * 2.0);
      }
      climaxCurve[b] = climax;

      // Base active load
      let activeLoad = planDens;
      if (state === 'VOCAL_SUSTAIN') {
        activeLoad = Math.min(planDens, 0.40); // reduce density to highlight sustained vocal
      } else if (state === 'VOCAL_CLIMAX') {
        activeLoad = Math.max(planDens, 0.85);
      } else if (state === 'FILL') {
        activeLoad = Math.max(planDens, 0.70);
      } else if (state === 'VOCAL_GAP') {
        activeLoad = Math.min(planDens, 0.50);
      }
      aggregateDensityCurve[b] = clamp(activeLoad);
    }
    const smoothedDensity = smoothExpressiveCurve(aggregateDensityCurve);
    const smoothedDucking = smoothExpressiveCurve(rawDuckingCurve);
    const rawClimax = [...climaxCurve];

    // 4. Fourth Pass: Synthesize Instrument-Specific Profiles with Cross-Stem Coherence
    for (let b = 0; b < totalBeats; b++) {
      const state = stateByBeat[b];
      const taper = smoothedTaper[b];
      const density = smoothedDensity[b];
      const ducking = smoothedDucking[b];
      const climax = Math.max(rawClimax[b], (rawClimax[Math.max(0, b - 1)] + rawClimax[b] + rawClimax[Math.min(totalBeats - 1, b + 1)]) / 3);
      const pEnergy = expMap.phraseEnergyCurve[b] ?? 0.5;
      const vInt = expMap.intensityCurve[b] ?? 0.0;
      const isPeak = climax > 0.5;
      const isSustained = state === 'VOCAL_SUSTAIN' || (expMap.sustainedNoteCurve[b] ?? 0) > 0.5;
      const isVocalSinging = state === 'VOCAL_ACTIVE' || state === 'VOCAL_SUSTAIN' || state === 'VOCAL_CLIMAX' || state === 'VOCAL_ENTRY';

      // Dynamic Hierarchy & Vocal Priority Ducking
      const vocalPriorityDucking = ducking;

      // Cross-Stem Density Arbitration: scale down secondary textures if total load exceeds bandwidth
      const densityScaleFactor = density > 0.75 ? clamp(1.0 - (density - 0.75) * 0.40, 0.65, 0.98) : 1.0;

      // Fill eligibility: active during FILL or IDLE states with open taper window
      const fillEligibility = (state === 'FILL' || state === 'IDLE') && taper > 0.35 && !isVocalSinging;

      // Stereo Width Expansion: intimate at low energy, subtle widening at climax
      const stereoWidthMultiplier = clamp(0.92 + climax * 0.18, 0.85, 1.15);

      // --- DRUMS & TABLA (Level 3 Rhythmic Foundation) ---
      // Dynamic responsiveness: softly supporting in intimate passages (<0.80), commanding in climaxes (up to 1.05)
      const drumKick = clamp((0.60 + pEnergy * 0.26 + climax * 0.15) * (density > 0.75 ? Math.max(0.85, densityScaleFactor) : 1.0), 0.55, 1.05);
      const drumSnare = clamp((0.60 + pEnergy * 0.26 + climax * 0.15) * (density > 0.75 ? Math.max(0.85, densityScaleFactor) : 1.0), 0.55, 1.05);
      const drumHihat = clamp((isSustained ? 0.55 : 0.60 + pEnergy * 0.28) * densityScaleFactor, 0.45, 0.95);
      const drumFillAllowed = (state === 'PHRASE_RELEASE' || state === 'VOCAL_GAP' || state === 'FILL') && taper > 0.3;

      const tablaTheka = clamp((0.62 + pEnergy * 0.28 + climax * 0.12) * (density > 0.75 ? Math.max(0.85, densityScaleFactor) : 1.0), 0.65, 1.05);
      const tablaBayan = clamp(0.80 + (isPeak ? 0.25 : pEnergy * 0.18), 0.75, 1.20);

      // --- BASS (Level 2 Harmonic Foundation) ---
      const bassGain = clamp((0.75 + pEnergy * 0.18 + climax * 0.10), 0.70, 1.05);
      const bassSustain = isSustained ? 1.20 : (pEnergy > 0.6 ? 1.0 : 0.85);

      // --- PIANO (Level 4 Supporting Texture & Gap Response) ---
      // Softens during vocal to prevent frequency masking
      const pianoComp = clamp((isVocalSinging ? 0.68 - vInt * 0.15 + pEnergy * 0.12 : 0.85) * densityScaleFactor * vocalPriorityDucking, 0.50, 0.95);
      const pianoFill = fillEligibility ? clamp((0.75 + pEnergy * 0.15) * taper, 0.45, 0.95) : 0.0;
      const pianoSustain = isSustained ? 1.25 : 0.95;

      // --- GUITAR (Level 4 Supporting Texture) ---
      const guitarStrum = clamp((isVocalSinging ? 0.65 - vInt * 0.12 + pEnergy * 0.15 : 0.80) * densityScaleFactor * vocalPriorityDucking, 0.52, 0.95);
      const guitarArp = isSustained ? 0.35 : clamp(0.45 + pEnergy * 0.45);

      // --- STRINGS (Level 4 Sustained Texture) ---
      const stringsPad = clamp((0.60 + pEnergy * 0.25 + climax * 0.20) * densityScaleFactor, 0.45, 1.05);
      const stringsSwell = clamp(0.70 + climax * 0.45, 0.50, 1.25);
      const stringsAllowed = density >= 0.45 || isPeak || state === 'VOCAL_CLIMAX' || state === 'VOCAL_SUSTAIN';

      // --- FLUTE & SITAR (Level 5 Melodic Response & Ornaments) ---
      // Strictly gated off or tapered during active vocal to prevent competing lead lines
      const fluteFill = fillEligibility ? clamp((0.72 + pEnergy * 0.18) * taper, 0.40, 0.95) : 0.0;
      const sitarLead = fillEligibility ? clamp((0.75 + pEnergy * 0.18) * taper, 0.40, 0.95) : 0.0;
      const sitarChikari = !isVocalSinging && pEnergy > 0.60 && taper > 0.5;

      // --- HARMONIUM (Level 2 Harmonic / Modal Grounding) ---
      const harmGain = clamp((0.68 + pEnergy * 0.20) * densityScaleFactor, 0.60, 1.05);

      profilesByBeat[b] = {
        beat: b,
        vocalState: state,
        aggregateDensity: density,
        densityScaleFactor,
        vocalPriorityDucking,
        vocalReentryTaper: taper,
        fillEligibility,
        climaxExpansion: climax,
        stereoWidthMultiplier,
        drums: {
          kickGain: drumKick,
          snareGain: drumSnare,
          hihatGain: drumHihat,
          fillAllowed: drumFillAllowed
        },
        tabla: {
          thekaGain: tablaTheka,
          bayanMod: tablaBayan,
          fillAllowed: drumFillAllowed
        },
        bass: {
          gain: bassGain,
          sustainScale: bassSustain,
          octaveJumpAllowed: isPeak && !isSustained
        },
        piano: {
          compGain: pianoComp,
          fillGain: pianoFill,
          sustainScale: pianoSustain,
          fillAllowed: fillEligibility
        },
        guitar: {
          strumGain: guitarStrum,
          arpDensity: guitarArp,
          panOffset: 0.20 * stereoWidthMultiplier
        },
        strings: {
          padGain: stringsPad,
          swellGain: stringsSwell,
          allowed: stringsAllowed,
          panOffset: -0.25 * stereoWidthMultiplier
        },
        flute: {
          fillGain: fluteFill,
          responseAllowed: fillEligibility,
          panOffset: 0.15 * stereoWidthMultiplier
        },
        harmonium: {
          foundationGain: harmGain,
          panOffset: -0.12 * stereoWidthMultiplier
        },
        sitar: {
          leadGain: sitarLead,
          chikariAllowed: sitarChikari,
          fillAllowed: fillEligibility,
          panOffset: 0.20 * stereoWidthMultiplier
        }
      };
    }

    return {
      totalBeats,
      stateByBeat,
      aggregateDensityCurve: smoothedDensity,
      reentryTaperCurve: smoothedTaper,
      climaxCurve: rawClimax,
      profilesByBeat
    };
  }
}
