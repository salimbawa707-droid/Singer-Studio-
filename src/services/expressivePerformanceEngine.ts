/**
 * MUSICBASE / SURGE STUDIO
 * Expressive Performance Intelligence Engine (Phase 24 - Part 4A)
 *
 * Deterministic, sample-accurate, vocal-performance-driven expressive mapping.
 * Translates human vocal nuances (intensity, sustained holds, onsets, phrase energy,
 * emotional peaks, silence gaps, ornaments) into cohesive, instrument-specific
 * performance profiles without altering Part 1 timing or Part 2 harmonic authority.
 *
 * 100% Offline-First, Deterministic, Zero-Math.random(), Bounded [0.0, 1.0].
 */

import { VocalSongMap, DetectedVocalNote, DeepVocalPhrase, VocalSilenceGap, VocalEmotionalPeak } from './vocalUnderstandingEngine';

export interface ExpressiveVocalPerformanceMap {
  intensityCurve: number[];           // 0.0 to 1.0 per beat (normalized vocal RMS/energy)
  attackStrengths: number[];          // 0.0 to 1.0 per beat (note onset & articulation sharpness)
  sustainedNoteCurve: number[];       // 0.0 to 1.0 per beat (sustained vocal hold strength)
  phraseEnergyCurve: number[];        // 0.0 to 1.0 per beat (phrase dynamic arc: start -> peak -> release)
  emotionalPeakCurve: number[];       // 0.0 to 1.0 per beat (multi-signal emotional climax score)
  articulationDensity: number[];      // 0.0 to 1.0 per beat (density of rapid note transitions)
  silenceGapEnergy: number[];         // 0.0 to 1.0 per beat (instrumental fill/response capacity)
  ornamentDensityCurve: number[];     // 0.0 to 1.0 per beat (Meend/Murki microtonal movement)
  pitchMovementIntensity: number[];   // 0.0 to 1.0 per beat (pitch delta velocity)
  phraseEndingEnergy: number[];       // 0.0 to 1.0 per beat (phrase resolution/cadence landing)
  accompanimentDensityCurve: number[];// 0.0 to 1.0 per beat (vocal-aware accompaniment density)
  confidence: number;                 // 0.0 to 1.0 overall expressive analysis confidence
}

export interface DrumsExpressiveProfile {
  kickVel: number;        // [0.45, 1.0]
  snareVel: number;       // [0.45, 1.0]
  hihatVel: number;       // [0.30, 0.85]
  fillIntensity: number;  // [0.0, 1.0]
  allowGhostNotes: boolean;
}

export interface BassExpressiveProfile {
  velocity: number;       // [0.50, 1.0]
  sustainScale: number;   // [0.60, 1.25]
  octaveJumpAllowed: boolean;
  approachEmphasis: number; // [0.0, 1.0]
}

export interface PianoExpressiveProfile {
  velocity: number;       // [0.45, 1.0]
  sustainScale: number;   // [0.70, 1.30]
  chordArpDensity: number;// [0.0, 1.0]
  fillVelocity: number;   // [0.55, 0.95]
}

export interface GuitarExpressiveProfile {
  strumVelocity: number;  // [0.45, 1.0]
  arpeggioDensity: number;// [0.0, 1.0]
  accentStrength: number; // [0.0, 1.0]
}

export interface StringsExpressiveProfile {
  velocity: number;       // [0.40, 0.95]
  swellGain: number;      // [0.30, 1.20]
  densityAllowed: boolean;
}

export interface FluteExpressiveProfile {
  fillVelocity: number;   // [0.50, 0.95]
  responseGain: number;   // [0.0, 1.0]
  allowActiveComping: boolean;
}

export interface HarmoniumExpressiveProfile {
  velocity: number;       // [0.40, 0.85]
  dynamicGain: number;    // [0.50, 1.10]
}

export interface SitarExpressiveProfile {
  leadVelocity: number;   // [0.50, 0.95]
  fillGain: number;       // [0.0, 1.0]
  chikariAllowed: boolean;
  resonanceBoost: number; // [0.8, 1.3]
}

/**
 * Deterministic helper to clamp values strictly to [min, max]
 */
function clamp(val: number, min: number = 0.0, max: number = 1.0): number {
  if (Number.isNaN(val) || !Number.isFinite(val)) return min;
  return Math.max(min, Math.min(max, val));
}

/**
 * Deterministic micro-variation generator
 * Replaces Math.random() with a hash-based deterministic pseudo-random float in [-range, range].
 */
export function getDeterministicVariation(beat: number, seed: number = 0, range: number = 0.04): number {
  const n = Math.sin(beat * 12.9898 + seed * 78.233 + 43758.5453) * 43758.5453;
  const frac = (n - Math.floor(n)) * 2 - 1; // [-1.0, 1.0]
  return clamp(frac * range, -range, range);
}

/**
 * Smooth a 1D curve using a 3-tap normalized triangle kernel [0.25, 0.5, 0.25]
 * Guarantees zero NaN, zero Infinity, and preserves boundary clamping [0.0, 1.0].
 */
export function smoothExpressiveCurve(arr: number[]): number[] {
  const len = arr.length;
  if (len <= 1) return arr.map(v => clamp(v));
  const out = new Array(len);
  for (let i = 0; i < len; i++) {
    const prev = i > 0 ? arr[i - 1] : arr[0];
    const curr = arr[i];
    const next = i < len - 1 ? arr[i + 1] : arr[len - 1];
    out[i] = clamp(prev * 0.25 + curr * 0.5 + next * 0.25);
  }
  return out;
}

export class ExpressivePerformanceEngine {
  private static instance: ExpressivePerformanceEngine;

  public static getInstance(): ExpressivePerformanceEngine {
    if (!ExpressivePerformanceEngine.instance) {
      ExpressivePerformanceEngine.instance = new ExpressivePerformanceEngine();
    }
    return ExpressivePerformanceEngine.instance;
  }

  /**
   * Build the complete ExpressiveVocalPerformanceMap deterministically from canonical VocalSongMap
   */
  public buildExpressivePerformanceMap(vocalMap: VocalSongMap, totalBeatsCount?: number): ExpressiveVocalPerformanceMap {
    const totalBeats = Math.max(1, totalBeatsCount || vocalMap.rmsEnvelopeByBeat?.length || Math.floor(vocalMap.totalDuration / (60 / (vocalMap.bpm || 120))));
    const secondsPerBeat = 60 / (vocalMap.bpm || 120);

    const intensityCurve = new Array(totalBeats).fill(0.0);
    const attackStrengths = new Array(totalBeats).fill(0.0);
    const sustainedNoteCurve = new Array(totalBeats).fill(0.0);
    const phraseEnergyCurve = new Array(totalBeats).fill(0.0);
    const emotionalPeakCurve = new Array(totalBeats).fill(0.0);
    const articulationDensity = new Array(totalBeats).fill(0.0);
    const silenceGapEnergy = new Array(totalBeats).fill(0.0);
    const ornamentDensityCurve = new Array(totalBeats).fill(0.0);
    const pitchMovementIntensity = new Array(totalBeats).fill(0.0);
    const phraseEndingEnergy = new Array(totalBeats).fill(0.0);
    const accompanimentDensityCurve = new Array(totalBeats).fill(0.5);

    const notes = vocalMap.notes || [];
    const phrases = vocalMap.phrases || [];
    const gaps = vocalMap.silenceGaps || [];
    const peaks = vocalMap.emotionalPeaks || [];

    // Calculate max vocal RMS energy safely
    let maxRms = 0.001;
    for (const note of notes) {
      if (note.rmsEnergy && Number.isFinite(note.rmsEnergy) && note.rmsEnergy > maxRms) {
        maxRms = note.rmsEnergy;
      }
    }
    for (const p of phrases) {
      if (p.peakEnergy && Number.isFinite(p.peakEnergy) && p.peakEnergy > maxRms) {
        maxRms = p.peakEnergy;
      }
    }

    // 1. Intensity Curve (Normalized RMS/Energy per beat)
    if (vocalMap.rmsEnvelopeByBeat && vocalMap.rmsEnvelopeByBeat.length > 0) {
      for (let b = 0; b < totalBeats; b++) {
        const raw = vocalMap.rmsEnvelopeByBeat[b] ?? 0.0;
        intensityCurve[b] = clamp(raw <= 1.0 ? raw : raw / maxRms);
      }
    } else {
      for (let b = 0; b < totalBeats; b++) {
        const t = b * secondsPerBeat;
        const activeNote = notes.find(n => t >= n.startTime && t < n.endTime);
        const activePhrase = phrases.find(p => t >= p.startTime && t <= p.endTime);
        if (activeNote) {
          intensityCurve[b] = clamp(activeNote.rmsEnergy / maxRms);
        } else if (activePhrase) {
          intensityCurve[b] = clamp(activePhrase.avgEnergy / maxRms);
        } else {
          intensityCurve[b] = 0.0;
        }
      }
    }

    // 2. Attack / Articulation Strengths & Articulation Density
    for (const note of notes) {
      const startB = Math.floor(note.startTime / secondsPerBeat);
      const endB = Math.floor(note.endTime / secondsPerBeat);
      const noteEnergy = clamp(note.rmsEnergy / maxRms);
      const isAccented = note.isHighNote || noteEnergy > 0.75;
      const attackStrength = isAccented ? clamp(0.7 + noteEnergy * 0.3) : clamp(0.4 + noteEnergy * 0.4);

      if (startB >= 0 && startB < totalBeats) {
        attackStrengths[startB] = Math.max(attackStrengths[startB], attackStrength);
      }

      // Notes per beat density
      for (let b = Math.max(0, startB); b <= Math.min(totalBeats - 1, endB); b++) {
        const noteDurationBeats = Math.max(0.25, (note.endTime - note.startTime) / secondsPerBeat);
        articulationDensity[b] = clamp(articulationDensity[b] + (1.0 / noteDurationBeats) * 0.25);
      }
    }

    // 3. Sustained Note Hold Strength
    for (const note of notes) {
      if (note.isSustained || note.duration >= 1.2) {
        const startB = Math.floor(note.startTime / secondsPerBeat);
        const endB = Math.floor(note.endTime / secondsPerBeat);
        const holdStrength = clamp(0.6 + (note.duration / 3.0) * 0.4);
        for (let b = Math.max(0, startB); b <= Math.min(totalBeats - 1, endB); b++) {
          sustainedNoteCurve[b] = Math.max(sustainedNoteCurve[b], holdStrength);
        }
      }
    }

    // 4. Phrase Energy Model & Phrase Ending / Landing Energy
    for (const phrase of phrases) {
      const startB = phrase.startBeat;
      const endB = phrase.endBeat;
      const pLen = Math.max(1, endB - startB);
      const baseEnergy = clamp(phrase.avgEnergy / maxRms);
      const peakEnergy = clamp(phrase.peakEnergy / maxRms);

      for (let b = Math.max(0, startB); b <= Math.min(totalBeats - 1, endB); b++) {
        const progress = (b - startB) / pLen; // 0.0 to 1.0
        // Parabolic phrase energy arc: builds up to 60-70%, releases at landing
        let arc = 0.0;
        if (progress < 0.65) {
          arc = baseEnergy + (peakEnergy - baseEnergy) * (progress / 0.65);
        } else {
          arc = peakEnergy - (peakEnergy - baseEnergy * 0.6) * ((progress - 0.65) / 0.35);
        }
        phraseEnergyCurve[b] = clamp(Math.max(phraseEnergyCurve[b], arc));

        // Phrase ending energy (last 20% of phrase)
        if (progress >= 0.80) {
          const endingResolution = clamp((1.0 - progress) / 0.20 * baseEnergy + 0.2);
          phraseEndingEnergy[b] = clamp(Math.max(phraseEndingEnergy[b], endingResolution));
        }
      }
    }

    // 5. Emotional Peak Detection (Multi-Signal Composite Score)
    for (const peak of peaks) {
      const centerB = peak.beat;
      const durBeats = Math.max(1, Math.round(peak.duration / secondsPerBeat));
      const halfDur = Math.max(1, Math.floor(durBeats / 2));
      for (let b = Math.max(0, centerB - halfDur); b <= Math.min(totalBeats - 1, centerB + halfDur); b++) {
        const dist = Math.abs(b - centerB) / halfDur;
        const peakVal = clamp(peak.intensity * (1.0 - dist * 0.4));
        emotionalPeakCurve[b] = clamp(Math.max(emotionalPeakCurve[b], peakVal));
      }
    }
    // Also synthesize peak score from high notes + high energy + sustained hold
    for (let b = 0; b < totalBeats; b++) {
      const comp = (intensityCurve[b] * 0.4) + (sustainedNoteCurve[b] * 0.3) + (phraseEnergyCurve[b] * 0.3);
      if (comp > 0.72) {
        emotionalPeakCurve[b] = clamp(Math.max(emotionalPeakCurve[b], comp));
      }
    }

    // 6. Silence Gap Energy & Instrumental Response Potential
    for (const gap of gaps) {
      const startB = gap.startBeat;
      const endB = gap.endBeat;
      const gapDur = Math.max(1, endB - startB);
      let capacityFactor = 0.5;
      if (gap.fillCapacity === 'two_bar_phrase') capacityFactor = 0.95;
      else if (gap.fillCapacity === 'one_bar_response') capacityFactor = 0.80;
      else if (gap.fillCapacity === 'short_pickup') capacityFactor = 0.55;

      for (let b = Math.max(0, startB); b <= Math.min(totalBeats - 1, endB); b++) {
        const prog = (b - startB) / gapDur;
        // Bell-shaped response curve peaking in the middle of the gap
        const bell = Math.sin(prog * Math.PI);
        silenceGapEnergy[b] = clamp(Math.max(silenceGapEnergy[b], bell * capacityFactor));
      }
    }

    // 7. Ornament Density Curve & Pitch Movement Intensity (Meend/Murki)
    if (vocalMap.pitchContourByBeat && vocalMap.pitchContourByBeat.length > 0) {
      for (let b = 0; b < totalBeats; b++) {
        const contour = vocalMap.pitchContourByBeat[b];
        if (contour && contour.length > 1) {
          let deltaSum = 0;
          for (let i = 1; i < contour.length; i++) {
            deltaSum += Math.abs(contour[i] - contour[i - 1]);
          }
          const avgDelta = deltaSum / contour.length;
          pitchMovementIntensity[b] = clamp(avgDelta / 4.0); // 4 semitones delta = 1.0
          ornamentDensityCurve[b] = clamp(contour.length >= 8 ? 0.85 : contour.length / 10.0);
        }
      }
    }

    // 8. Accompaniment Density Controller (0.0 to 1.0)
    for (let b = 0; b < totalBeats; b++) {
      const isSustained = sustainedNoteCurve[b] > 0.5;
      const isPeak = emotionalPeakCurve[b] > 0.7;
      const isGap = silenceGapEnergy[b] > 0.3;
      const pEnergy = phraseEnergyCurve[b];

      let density = 0.5;
      if (isGap) {
        // High density allowed for instrumental call-and-response during vocal gaps
        density = 0.75 + silenceGapEnergy[b] * 0.20;
      } else if (isSustained) {
        // Low density: reduce rhythmic clutter to support sustained vocal hold
        density = 0.35 + (1.0 - sustainedNoteCurve[b]) * 0.20;
      } else if (isPeak) {
        // Controlled high support for emotional climax without cluttering
        density = 0.65 + pEnergy * 0.25;
      } else {
        // Normal phrase tracking
        density = 0.40 + pEnergy * 0.35;
      }
      accompanimentDensityCurve[b] = clamp(density);
    }

    // Smooth all curves for click-free musical transitions
    const smoothedIntensity = smoothExpressiveCurve(intensityCurve);
    const smoothedAttacks = smoothExpressiveCurve(attackStrengths);
    const smoothedSustained = smoothExpressiveCurve(sustainedNoteCurve);
    const smoothedPhraseEnergy = smoothExpressiveCurve(phraseEnergyCurve);
    const smoothedPeaks = smoothExpressiveCurve(emotionalPeakCurve);
    const smoothedDensity = smoothExpressiveCurve(accompanimentDensityCurve);

    return {
      intensityCurve: smoothedIntensity,
      attackStrengths: smoothedAttacks,
      sustainedNoteCurve: smoothedSustained,
      phraseEnergyCurve: smoothedPhraseEnergy,
      emotionalPeakCurve: smoothedPeaks,
      articulationDensity: smoothExpressiveCurve(articulationDensity),
      silenceGapEnergy: smoothExpressiveCurve(silenceGapEnergy),
      ornamentDensityCurve: smoothExpressiveCurve(ornamentDensityCurve),
      pitchMovementIntensity: smoothExpressiveCurve(pitchMovementIntensity),
      phraseEndingEnergy: smoothExpressiveCurve(phraseEndingEnergy),
      accompanimentDensityCurve: smoothedDensity,
      confidence: clamp(vocalMap.confidenceScores?.overall ?? 0.90)
    };
  }

  // =========================================================================
  // INSTRUMENT EXPRESSIVE PROFILES (Coordinated, Instrument-Specific Curves)
  // =========================================================================

  /**
   * Drums & Tabla: Rhythmic energy and dynamic accents driven by phrase energy & vocal activity
   */
  public getDrumsProfile(beat: number, exp: ExpressiveVocalPerformanceMap, secType: string): DrumsExpressiveProfile {
    const b = Math.max(0, Math.min(exp.intensityCurve.length - 1, Math.floor(beat)));
    const pEnergy = exp.phraseEnergyCurve[b] ?? 0.5;
    const isPeak = (exp.emotionalPeakCurve[b] ?? 0) > 0.65;
    const isSustained = (exp.sustainedNoteCurve[b] ?? 0) > 0.6;
    const isClimax = secType === 'chorus_hook' || secType === 'chorus_climax';

    // Base velocities scaled smoothly by phrase energy
    let kick = 0.65 + pEnergy * 0.25;
    let snare = 0.65 + pEnergy * 0.28;
    let hihat = 0.40 + pEnergy * 0.30;

    if (isClimax) {
      kick += 0.08;
      snare += 0.08;
      hihat += 0.06;
    }
    if (isPeak) {
      snare += 0.06;
      hihat += 0.08;
    }
    if (isSustained) {
      // Lighten hihat accents during sustained vocal hold
      hihat = Math.max(0.35, hihat - 0.12);
    }

    return {
      kickVel: clamp(kick, 0.45, 1.0),
      snareVel: clamp(snare, 0.45, 1.0),
      hihatVel: clamp(hihat, 0.30, 0.88),
      fillIntensity: clamp(pEnergy * 0.7 + (isPeak ? 0.3 : 0.0)),
      allowGhostNotes: !isSustained && pEnergy > 0.5
    };
  }

  /**
   * Bassline: Velocity & sustain scaled by phrase dynamics while preserving voicing.bassOffset
   */
  public getBassProfile(beat: number, exp: ExpressiveVocalPerformanceMap, secType: string): BassExpressiveProfile {
    const b = Math.max(0, Math.min(exp.intensityCurve.length - 1, Math.floor(beat)));
    const pEnergy = exp.phraseEnergyCurve[b] ?? 0.5;
    const isSustained = (exp.sustainedNoteCurve[b] ?? 0) > 0.5;
    const isClimax = secType === 'chorus_hook' || secType === 'chorus_climax';

    let vel = 0.72 + pEnergy * 0.20;
    if (isClimax) vel += 0.06;

    // Sustain longer during sustained vocal notes to provide deep grounding
    const sustainScale = isSustained ? 1.15 : (pEnergy > 0.6 ? 1.0 : 0.85);

    return {
      velocity: clamp(vel, 0.50, 1.0),
      sustainScale: clamp(sustainScale, 0.60, 1.25),
      octaveJumpAllowed: isClimax && !isSustained,
      approachEmphasis: clamp(pEnergy * 0.8)
    };
  }

  /**
   * Piano: Supportive chordal foundation during vocal holds, dynamic lift at climax
   */
  public getPianoProfile(beat: number, exp: ExpressiveVocalPerformanceMap, secType: string): PianoExpressiveProfile {
    const b = Math.max(0, Math.min(exp.intensityCurve.length - 1, Math.floor(beat)));
    const vInt = exp.intensityCurve[b] ?? 0.0;
    const pEnergy = exp.phraseEnergyCurve[b] ?? 0.5;
    const isSustained = (exp.sustainedNoteCurve[b] ?? 0) > 0.5;
    const isClimax = secType === 'chorus_hook' || secType === 'chorus_climax';
    const isGap = (exp.silenceGapEnergy[b] ?? 0) > 0.3;

    // Soften piano when singer is active to avoid masking vocal
    let vel = isGap ? 0.85 : Math.max(0.55, 0.82 - vInt * 0.30 + pEnergy * 0.15);
    if (isClimax) vel += 0.05;

    // Longer sustain during vocal hold; reduced arp density
    const sustainScale = isSustained ? 1.20 : 0.95;
    const arpDensity = isSustained ? 0.30 : clamp(0.40 + pEnergy * 0.50);

    return {
      velocity: clamp(vel, 0.45, 1.0),
      sustainScale: clamp(sustainScale, 0.70, 1.30),
      chordArpDensity: clamp(arpDensity, 0.0, 1.0),
      fillVelocity: clamp(0.75 + exp.silenceGapEnergy[b] * 0.15, 0.55, 0.95)
    };
  }

  /**
   * Guitar: Strum and arpeggio dynamics derived from expressive state
   */
  public getGuitarProfile(beat: number, exp: ExpressiveVocalPerformanceMap, secType: string): GuitarExpressiveProfile {
    const b = Math.max(0, Math.min(exp.intensityCurve.length - 1, Math.floor(beat)));
    const vInt = exp.intensityCurve[b] ?? 0.0;
    const pEnergy = exp.phraseEnergyCurve[b] ?? 0.5;
    const isClimax = secType === 'chorus_hook' || secType === 'chorus_climax';

    let vel = Math.max(0.52, 0.80 - vInt * 0.32 + pEnergy * 0.18);
    if (isClimax) vel += 0.08;

    return {
      strumVelocity: clamp(vel, 0.45, 1.0),
      arpeggioDensity: clamp(0.4 + pEnergy * 0.5),
      accentStrength: clamp(pEnergy * 0.75)
    };
  }

  /**
   * Strings: Expressive pad swells, gradual crescendo during phrase buildup, gentle release
   */
  public getStringsProfile(beat: number, exp: ExpressiveVocalPerformanceMap, secType: string): StringsExpressiveProfile {
    const b = Math.max(0, Math.min(exp.intensityCurve.length - 1, Math.floor(beat)));
    const pEnergy = exp.phraseEnergyCurve[b] ?? 0.5;
    const isPeak = (exp.emotionalPeakCurve[b] ?? 0) > 0.6;
    const isClimax = secType === 'chorus_climax' || secType === 'chorus_hook';

    let vel = 0.65 + pEnergy * 0.22;
    let swell = 0.70 + pEnergy * 0.40;

    if (isPeak || isClimax) {
      vel += 0.08;
      swell += 0.15;
    }

    return {
      velocity: clamp(vel, 0.40, 0.95),
      swellGain: clamp(swell, 0.30, 1.20),
      densityAllowed: pEnergy >= 0.35 || isClimax || isPeak
    };
  }

  /**
   * Flute / Woodwind: Responsive call-and-response during gaps, backing off during active singing
   */
  public getFluteProfile(beat: number, exp: ExpressiveVocalPerformanceMap, secType: string): FluteExpressiveProfile {
    const b = Math.max(0, Math.min(exp.intensityCurve.length - 1, Math.floor(beat)));
    const isGap = (exp.silenceGapEnergy[b] ?? 0) > 0.25;
    const isVocalActive = (exp.intensityCurve[b] ?? 0) > 0.15;

    const fillVel = clamp(0.70 + exp.silenceGapEnergy[b] * 0.20, 0.50, 0.95);
    const responseGain = isGap ? clamp(exp.silenceGapEnergy[b] * 1.1) : 0.0;

    return {
      fillVelocity: fillVel,
      responseGain,
      allowActiveComping: !isVocalActive || secType === 'intro' || secType === 'interlude'
    };
  }

  /**
   * Harmonium: Grounded reed support following phrase dynamics without pumping
   */
  public getHarmoniumProfile(beat: number, exp: ExpressiveVocalPerformanceMap): HarmoniumExpressiveProfile {
    const b = Math.max(0, Math.min(exp.intensityCurve.length - 1, Math.floor(beat)));
    const pEnergy = exp.phraseEnergyCurve[b] ?? 0.5;
    const vel = 0.55 + pEnergy * 0.18;
    const dynamicGain = 0.75 + pEnergy * 0.25;

    return {
      velocity: clamp(vel, 0.40, 0.85),
      dynamicGain: clamp(dynamicGain, 0.50, 1.10)
    };
  }

  /**
   * Sitar: Nuanced Indian lead responses, Tarab resonance boost at climax
   */
  public getSitarProfile(beat: number, exp: ExpressiveVocalPerformanceMap, secType: string): SitarExpressiveProfile {
    const b = Math.max(0, Math.min(exp.intensityCurve.length - 1, Math.floor(beat)));
    const isGap = (exp.silenceGapEnergy[b] ?? 0) > 0.25;
    const isPeak = (exp.emotionalPeakCurve[b] ?? 0) > 0.65;
    const pEnergy = exp.phraseEnergyCurve[b] ?? 0.5;

    const leadVel = clamp(0.70 + pEnergy * 0.20, 0.50, 0.95);
    const fillGain = isGap ? clamp(exp.silenceGapEnergy[b] * 1.15) : 0.0;
    const resonanceBoost = isPeak ? 1.25 : (pEnergy > 0.6 ? 1.10 : 1.0);

    return {
      leadVelocity: leadVel,
      fillGain,
      chikariAllowed: !isGap && pEnergy > 0.65,
      resonanceBoost: clamp(resonanceBoost, 0.8, 1.3)
    };
  }
}
