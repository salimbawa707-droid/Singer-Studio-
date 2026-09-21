/**
 * MUSICBASE / SURGE STUDIO
 * Modular Intelligent Bollywood-Style Song Arrangement Engine (Phase 4)
 * 
 * Powered by Deep Vocal Understanding & Musical Intent:
 * - Vocal Song Map integration (Phrases, Notes, Silence Gaps, Emotional Peaks, Motifs, Tension & Resolution maps)
 * - Musical Intent Engine integration (Emotional character, harmonic tension, instrument roles, space/fills)
 * - Advanced Melody-Aware Harmony Engine (Diatonic, harmonic minor, borrowed, secondary dominants, sus2/4, 7ths, add9, slash chords & inversions)
 * - Intelligent Dynamic Bass Engine (Root, walking, passing notes, approach notes, octave bounce, sustained/rhythmic textures)
 * - Dynamic Drum Groove Engine (Style-specific kicks, snares, hats, percussion, phrase fills & section transition hits)
 * - Melody-Aware Call-and-Response (Analyzing preceding vocal intervals & generating motivic counterpoint)
 * - Hook & Recurring Motif Re-use (SongMotifMap across Intro, Interlude, Chorus, Outro)
 * - Continuous Evolving Arrangement Density Curves
 * - 3-Stage Song-Specific Musical Intro (10s / 12s / 15s)
 * - Musical Humanization (Micro-timing jitter +/- 4ms, velocity humanization, alternate voicings)
 * - Vocal-First Dynamic Ducking & Balancing
 * 
 * 100% Offline-First, Deterministic & Web Audio API Powered.
 */

import { ProjectTrack, PitchAnalysisResult, StructuredRenderEvent, StructuredPerformanceScore } from '../types/audio';
import { InstrumentSoundEngine } from './instrumentSoundEngine';
import { AcousticRealismEngine } from './acousticRealismEngine';
import { 
  VocalUnderstandingEngine, 
  VocalSongMap, 
  DeepVocalPhrase, 
  VocalSilenceGap, 
  VocalEmotionalPeak, 
  DetectedVocalNote,
  SongMotifMap 
} from './vocalUnderstandingEngine';
import { 
  MusicalIntentEngine, 
  MusicalIntentResult, 
  PhraseMusicalIntent, 
  SongArrangementMemory 
} from './musicalIntentEngine';
import { LyricalSemanticAnalysis } from './languageUnderstandingEngine';
import { 
  ExpressivePerformanceEngine, 
  ExpressiveVocalPerformanceMap, 
  getDeterministicVariation 
} from './expressivePerformanceEngine';
import {
  CrossStemCoordinator,
  CrossStemCoherenceMap,
  CoordinatedStemProfile
} from './crossStemCoordinator';
import { GenerativeArrangementPlan } from '../types/generativeArrangement';

export type ArrangementStyle = 
  | 'romantic' 
  | 'acoustic' 
  | 'emotional' 
  | 'modern' 
  | 'dance' 
  | 'cinematic'
  | 'indian';

export type EnergyLevel = 
  | 'soft' 
  | 'balanced' 
  | 'powerful' 
  | 'cinematic';

export type SectionType = 
  | 'intro' 
  | 'verse_mukhda' 
  | 'pre_chorus' 
  | 'chorus_hook' 
  | 'interlude' 
  | 'verse_antara' 
  | 'chorus_climax' 
  | 'outro';

export interface ChordVoicing {
  rootOffset: number; // semitone from key root
  chordType: 'maj' | 'min' | 'dim' | 'aug' | 'sus2' | 'sus4' | 'maj7' | 'min7' | 'dom7' | 'add9' | 'm7b5' | '6' | 'min6' | 'sus2add11';
  inversion: number; // 0 = root, 1 = 1st, 2 = 2nd, 3 = 3rd
  bassOffset?: number; // slash chord bass note offset
  chordName?: string;
  midiNotes?: number[]; // Actual voice-led MIDI notes in target register
  voiceLeadingDistance?: number;
}

export interface SongSection {
  type: SectionType;
  name: string;
  startBeat: number;
  endBeat: number;
  startTime: number;
  endTime: number;
  density: number; // 0.0 (sparse) to 1.0 (full)
  chordProgression: number[]; // semitone offsets from root
  isVocalActive: boolean;
  roleDescriptions: Record<string, string>;
}

export interface ArrangementPlan {
  sections: SongSection[];
  vocalMap: VocalSongMap;
  musicalIntent: MusicalIntentResult;
  bpm: number;
  key: string;
  scale: 'major' | 'minor';
  meter: '4/4' | '3/4' | '6/8' | '7/8'; // Added in Phase 8
  style: ArrangementStyle;
  energy: EnergyLevel;
  totalDuration: number;
  introSeconds: number;
  vocalDuration: number;
  rootMidi: number;
  scaleIntervals: number[];
  averageDensity: number;
  chordMapByBeat: number[]; // semitone offset for each beat
  chordVoicingsByBeat: ChordVoicing[]; // rich chord voicings
  densityCurveByBeat: number[]; // continuous density value 0.0 to 1.0 per beat
  meterMapByBeat: ('4/4' | '3/4' | '6/8' | '7/8')[]; // Added in Phase 9
  semanticAnalysis?: LyricalSemanticAnalysis;
  timeline?: MusicalTimeline;
  generativeArrangementPlan?: GenerativeArrangementPlan;
}

export class MusicalTimeline {
  public readonly bpm: number;
  public readonly sampleRate: number;
  public readonly totalBeats: number;
  public readonly totalDuration: number;
  public readonly totalSamples: number;
  public readonly secondsPerBeat: number;
  private readonly cumulativeSecondsAtBeat: Float64Array;

  constructor(
    bpm: number,
    totalBeats: number,
    sampleRate: number,
    tempoDeviationCurve?: number[]
  ) {
    this.bpm = Math.max(30, Math.min(300, bpm));
    this.sampleRate = sampleRate;
    this.totalBeats = Math.max(1, totalBeats);
    this.secondsPerBeat = 60 / this.bpm;

    this.cumulativeSecondsAtBeat = new Float64Array(this.totalBeats + 1);
    this.cumulativeSecondsAtBeat[0] = 0;

    // Monotonic, cumulative integration of dt = secondsPerBeat / tempoMultiplier
    for (let b = 0; b < this.totalBeats; b++) {
      const rawMult = tempoDeviationCurve && tempoDeviationCurve[b] ? tempoDeviationCurve[b] : 1.0;
      // Clamp tempo multiplier safely between 0.70x and 1.40x
      const mult = Math.max(0.70, Math.min(1.40, rawMult));
      const beatDurationSec = this.secondsPerBeat / mult;
      this.cumulativeSecondsAtBeat[b + 1] = this.cumulativeSecondsAtBeat[b] + beatDurationSec;
    }

    this.totalDuration = this.cumulativeSecondsAtBeat[this.totalBeats];
    this.totalSamples = Math.floor(this.totalDuration * sampleRate);
  }

  /**
   * Monotonic mapping from musical beat (fractional or integer) to time in seconds.
   */
  public getTimeAtBeat(beat: number): number {
    if (beat <= 0) return 0;
    if (beat >= this.totalBeats) {
      const extraBeats = beat - this.totalBeats;
      return this.cumulativeSecondsAtBeat[this.totalBeats] + extraBeats * this.secondsPerBeat;
    }

    const integerBeat = Math.floor(beat);
    const frac = beat - integerBeat;
    const t0 = this.cumulativeSecondsAtBeat[integerBeat];
    const t1 = this.cumulativeSecondsAtBeat[integerBeat + 1];
    return t0 + frac * (t1 - t0);
  }

  /**
   * Monotonic mapping from time in seconds to musical beat (fractional).
   */
  public getBeatAtTime(seconds: number): number {
    if (seconds <= 0) return 0;
    if (seconds >= this.totalDuration) return this.totalBeats;

    let low = 0;
    let high = this.totalBeats;
    while (low < high) {
      const mid = (low + high) >> 1;
      if (this.cumulativeSecondsAtBeat[mid + 1] <= seconds) {
        low = mid + 1;
      } else {
        high = mid;
      }
    }
    const t0 = this.cumulativeSecondsAtBeat[low];
    const t1 = this.cumulativeSecondsAtBeat[low + 1] || (t0 + this.secondsPerBeat);
    const frac = t1 > t0 ? (seconds - t0) / (t1 - t0) : 0;
    return low + frac;
  }

  /**
   * Monotonic, sample-accurate mapping from musical beat to audio sample index.
   */
  public getSampleAtBeat(beat: number): number {
    const sec = this.getTimeAtBeat(beat);
    return Math.max(0, Math.min(this.totalSamples - 1, Math.floor(sec * this.sampleRate)));
  }

  /**
   * Monotonic mapping from sample index to fractional beat.
   */
  public getBeatAtSample(sampleIndex: number): number {
    return this.getBeatAtTime(sampleIndex / this.sampleRate);
  }

  /**
   * Duration in audio samples between two beats.
   */
  public getDurationSamples(startBeat: number, endBeat: number): number {
    const s0 = this.getSampleAtBeat(startBeat);
    const s1 = this.getSampleAtBeat(endBeat);
    return Math.max(1, s1 - s0);
  }
}

/**
 * Resamples vocal microtonal pitch contour into sample-accurate pitch bend values (in semitones)
 */
export function generatePitchBendCurve(
  vocalPitchContour: number[] | undefined,
  noteLengthSamples: number
): number[] | undefined {
  if (!vocalPitchContour || vocalPitchContour.length === 0) return undefined;
  
  // Filter valid voiced pitch entries (MIDI 30 to 100)
  const validPitches = vocalPitchContour.filter(p => p >= 30 && p <= 100);
  if (validPitches.length < 2) return undefined;

  const startPitch = validPitches[0];
  const bends = new Array<number>(noteLengthSamples);
  const numPoints = validPitches.length;

  for (let i = 0; i < noteLengthSamples; i++) {
    const fraction = i / noteLengthSamples;
    const floatIdx = fraction * (numPoints - 1);
    const lowIdx = Math.floor(floatIdx);
    const highIdx = Math.min(numPoints - 1, lowIdx + 1);
    const alpha = floatIdx - lowIdx;
    const interpolatedPitch = validPitches[lowIdx] * (1 - alpha) + validPitches[highIdx] * alpha;
    
    // Relative pitch bend in semitones (-6 to +6 max clamp)
    const semitoneBend = Math.max(-6, Math.min(6, interpolatedPitch - startPitch));
    bends[i] = semitoneBend;
  }

  return bends;
}

export function getChordIntervals(chordType: string): number[] {
  switch (chordType) {
    case 'maj': return [0, 4, 7];
    case 'min': return [0, 3, 7];
    case 'dim': return [0, 3, 6];
    case 'aug': return [0, 4, 8];
    case 'sus2': return [0, 2, 7];
    case 'sus4': return [0, 5, 7];
    case 'maj7': return [0, 4, 7, 11];
    case 'min7': return [0, 3, 7, 10];
    case 'dom7': return [0, 4, 7, 10];
    case 'add9': return [0, 4, 7, 14];
    case 'm7b5': return [0, 3, 6, 10];
    case '6': return [0, 4, 7, 9];
    case 'min6': return [0, 3, 7, 9];
    case 'sus2add11': return [0, 2, 5, 7];
    default: return [0, 4, 7];
  }
}

export function buildInvertedVoicingMidi(
  rootMidi: number,
  rootOffset: number,
  chordType: string,
  inversion: number = 0,
  targetRegister: number = 60
): number[] {
  const baseRoot = rootMidi + rootOffset;
  const intervals = getChordIntervals(chordType);
  const numNotes = intervals.length;
  
  // Create base pitches
  const rawPitches = intervals.map(iv => baseRoot + iv);
  
  // Apply inversion: shift the lowest `inv % numNotes` notes up by an octave
  const inv = Math.max(0, inversion) % numNotes;
  for (let i = 0; i < inv; i++) {
    rawPitches[i] += 12;
  }
  
  rawPitches.sort((a, b) => a - b);
  
  // Register centering: center the chord voicing near targetRegister (e.g. 58-68)
  const avgPitch = rawPitches.reduce((a, b) => a + b, 0) / rawPitches.length;
  const octaveShift = Math.round((targetRegister - avgPitch) / 12) * 12;
  
  return rawPitches.map(p => p + octaveShift);
}

export function calculateVoiceLeadingDistance(
  prevNotes: number[] | undefined,
  currNotes: number[]
): number {
  if (!prevNotes || prevNotes.length === 0) return 0;
  
  // Sum of minimal voice movement
  let totalDistance = 0;
  for (const n of currNotes) {
    let minD = Infinity;
    for (const p of prevNotes) {
      const d = Math.abs(n - p);
      if (d < minD) minD = d;
    }
    totalDistance += minD;
  }
  
  // Soprano movement penalty (highest note)
  const prevSoprano = prevNotes[prevNotes.length - 1];
  const currSoprano = currNotes[currNotes.length - 1];
  const sopranoLeap = Math.abs(currSoprano - prevSoprano);
  if (sopranoLeap > 4) {
    totalDistance += (sopranoLeap - 4) * 1.5;
  }
  
  // Common-tone bonus: reward retaining pitch classes in similar register
  let commonTones = 0;
  for (const n of currNotes) {
    if (prevNotes.some(p => (p % 12 + 12) % 12 === (n % 12 + 12) % 12)) {
      commonTones++;
    }
  }
  totalDistance -= commonTones * 2.5;
  
  return Math.max(0, totalDistance);
}

const KEY_OFFSETS: Record<string, number> = {
  'C': 60, 'C#': 61, 'Db': 61, 'D': 62, 'D#': 63, 'Eb': 63,
  'E': 64, 'F': 65, 'F#': 66, 'Gb': 66, 'G': 67, 'G#': 68,
  'Ab': 68, 'A': 69, 'A#': 70, 'Bb': 70, 'B': 71
};

export class IntelligentArrangementEngine {
  private static instance: IntelligentArrangementEngine;

  public static getInstance(): IntelligentArrangementEngine {
    if (!IntelligentArrangementEngine.instance) {
      IntelligentArrangementEngine.instance = new IntelligentArrangementEngine();
    }
    return IntelligentArrangementEngine.instance;
  }

  /**
   * Generates a structured musical performance score for accompaniment previews.
   * This owns all musical decisions: key offsets, chord progressions, harmonic voicings,
   * rhythmic drum patterns, dynamic velocities, stereo panning, and bassline movement.
   * Downstream rendering engines (WebAudioEngine) consume this score as an execution contract.
   */
  public generatePreviewScore(
    genre: string,
    durationSec: number = 30,
    bpm: number = 120,
    rootKey: string = 'C'
  ): StructuredPerformanceScore {
    const rootMidi = KEY_OFFSETS[rootKey] || 60;
    const secondsPerBeat = 60 / bpm;
    const totalBeats = Math.floor(durationSec / secondsPerBeat);
    const events: StructuredRenderEvent[] = [];

    // 1. Determine Harmonic Progression based on musical style/genre
    const lowerGenre = genre.toLowerCase();
    const isMinor = lowerGenre.includes('minor') || 
                    lowerGenre.includes('lo-fi') || 
                    lowerGenre.includes('dark') ||
                    lowerGenre.includes('sad');
    const isIndian = lowerGenre.includes('indian') || 
                     lowerGenre.includes('bollywood') || 
                     lowerGenre.includes('sufi') || 
                     lowerGenre.includes('ghazal');
    
    // Musical chord progressions
    const progressions: number[][] = isIndian ? [
      [0, 5, 7, 5],     // Indian Yaman/Bilawal cadential motion
      [0, 7, 5, 0],     // Folk / Classical Return
      [0, 2, 7, 5],     // Bhairavi modal shift
    ] : (isMinor ? [
      [0, 3, 7, 5],     // i - III - VII - v
      [0, 8, 3, 7],     // i - VI - III - VII
      [0, 5, 8, 7],     // i - iv - VI - V
    ] : [
      [0, 7, 9, 5],     // I - V - vi - IV (Pop Ballad / Romantic)
      [0, 5, 7, 5],     // I - IV - V - IV (Rock / Folk)
      [0, 9, 2, 7],     // I - vi - ii - V (Jazz / RnB)
      [0, 4, 7, 5],     // I - iii - V - IV
    ]);

    let hash = 0;
    for (let i = 0; i < genre.length; i++) {
      hash = (hash << 5) - hash + genre.charCodeAt(i);
      hash |= 0;
    }
    const prog = progressions[Math.abs(hash) % progressions.length];

    // 2. Compose Rhythmic Drum Events
    for (let beat = 0; beat < totalBeats; beat++) {
      const beatTime = beat * secondsPerBeat;
      const barPosition = beat % 4;

      if (barPosition === 0 || barPosition === 2) {
        events.push({
          instrument: 'kick',
          startTime: beatTime,
          duration: 0.35,
          velocity: barPosition === 0 ? 0.95 : 0.85,
          pan: 0
        });
      }
      if (barPosition === 1 || barPosition === 3) {
        events.push({
          instrument: 'snare',
          startTime: beatTime,
          duration: 0.25,
          velocity: barPosition === 3 ? 0.9 : 0.8,
          pan: 0
        });
      }
      events.push({
        instrument: 'hihat',
        startTime: beatTime,
        duration: 0.08,
        velocity: barPosition === 0 ? 0.6 : 0.45,
        pan: -0.15
      });
      const eighthTime = beatTime + (secondsPerBeat * 0.5);
      if (eighthTime < durationSec) {
        events.push({
          instrument: 'hihat',
          startTime: eighthTime,
          duration: 0.08,
          velocity: 0.4,
          pan: 0.15
        });
      }
    }

    // 3. Compose Harmonic Progression & Bassline
    const beatsPerChord = 4;
    for (let beat = 0; beat < totalBeats; beat += beatsPerChord) {
      const chordIdx = Math.floor(beat / beatsPerChord) % prog.length;
      const chordRoot = rootMidi + prog[chordIdx];
      const chordStartTime = beat * secondsPerBeat;
      const chordDuration = beatsPerChord * secondsPerBeat;

      // Bassline note
      events.push({
        instrument: 'bass',
        startTime: chordStartTime,
        duration: chordDuration * 0.95,
        midiNote: chordRoot - 24,
        velocity: 0.85,
        pan: 0
      });

      // Harmonic voicings (Triad with root, third, fifth)
      const third = isMinor ? 3 : 4;
      const notes = [chordRoot, chordRoot + third, chordRoot + 7];
      for (const noteMidi of notes) {
        events.push({
          instrument: 'pad',
          startTime: chordStartTime,
          duration: chordDuration,
          midiNote: noteMidi,
          velocity: 0.7,
          pan: noteMidi === chordRoot ? -0.2 : (noteMidi === chordRoot + 7 ? 0.2 : 0)
        });
      }
    }

    return {
      totalDurationSec: durationSec,
      bpm,
      rootKey,
      events
    };
  }

  // --- 1. VOCAL ANALYSIS & VOCAL-AWARE SONG STRUCTURE PLANNING ---
  public planArrangement(
    vocalBuffer: AudioBuffer | null,
    bpm: number = 120,
    rootKey: string = 'C',
    scale: 'major' | 'minor' = 'major',
    introSeconds: number = 12,
    style: ArrangementStyle = 'romantic',
    energy: EnergyLevel = 'balanced',
    pitchData?: PitchAnalysisResult | null,
    selectedInstruments: string[] = ['Piano', 'Acoustic Guitar', 'Bass', 'Drums', 'Strings', 'Flute'],
    semanticAnalysis?: LyricalSemanticAnalysis | null,
    semanticArrangementSheet?: any | null
  ): ArrangementPlan {
    const activeInstruments = [...selectedInstruments];
    if (style === 'indian' || semanticAnalysis?.dominantEmotion === 'devotion') {
      if (!activeInstruments.includes('Tabla') && !activeInstruments.includes('tabla')) activeInstruments.push('Tabla');
      if (!activeInstruments.includes('Sitar') && !activeInstruments.includes('sitar')) activeInstruments.push('Sitar');
      if (!activeInstruments.includes('Harmonium') && !activeInstruments.includes('harmonium')) activeInstruments.push('Harmonium');
    }

    const rootMidi = KEY_OFFSETS[rootKey] || 60;
    const secondsPerBeat = 60 / bpm;

    // 1. Deep Vocal Understanding Engine Analysis
    const vocalEngine = VocalUnderstandingEngine.getInstance();
    const vocalMap = vocalEngine.analyzeVocalPerformance(
      vocalBuffer,
      bpm,
      rootKey,
      scale,
      introSeconds,
      pitchData
    );

    const totalDuration = vocalMap.totalDuration;
    const totalBeats = Math.floor(totalDuration / secondsPerBeat);
    const introBeats = Math.floor(introSeconds / secondsPerBeat);

    // Scale intervals
    const scaleIntervals = scale === 'minor' 
      ? [0, 2, 3, 5, 7, 8, 10] 
      : [0, 2, 4, 5, 7, 9, 11];

    // 2. Musical Intent Engine Analysis (incorporating lyrical semantic understanding)
    const intentEngine = MusicalIntentEngine.getInstance();
    const musicalIntent = intentEngine.analyzeMusicalIntent(
      vocalMap,
      style,
      energy,
      activeInstruments,
      semanticAnalysis
    );

    // 3. Dynamic Section Planning adapting to vocal motifs & phrase grouping
    const sections = this.buildDynamicSongSections(
      totalBeats,
      introBeats,
      secondsPerBeat,
      scale,
      style,
      energy,
      vocalMap,
      musicalIntent
    );

    // 4. Melody-Aware Harmony Engine: Evaluates vocal notes, voice-leading & chord extensions
    const { chordMapByBeat, chordVoicingsByBeat } = this.generateMelodyAwareChordMap(
      sections,
      totalBeats,
      scale,
      style,
      rootMidi,
      vocalMap,
      musicalIntent
    );

    // 5. Continuous Dynamic Arrangement Density Curve
    const densityCurveByBeat = this.calculateContinuousDensityCurve(
      sections,
      totalBeats,
      energy,
      vocalMap,
      musicalIntent
    );

    const avgDensity = densityCurveByBeat.reduce((a, b) => a + b, 0) / densityCurveByBeat.length;

    return {
      sections,
      vocalMap,
      musicalIntent,
      bpm,
      key: rootKey,
      scale,
      meter: vocalMap.meter || '4/4',
      style,
      energy,
      totalDuration,
      introSeconds,
      vocalDuration: vocalMap.vocalDuration,
      rootMidi,
      scaleIntervals,
      averageDensity: avgDensity,
      chordMapByBeat,
      chordVoicingsByBeat,
      densityCurveByBeat,
      meterMapByBeat: vocalMap.meterMapByBeat || new Array(totalBeats).fill(vocalMap.meter || '4/4'),
      semanticAnalysis: semanticAnalysis || undefined
    };
  }

  /**
   * Section 3: Melody-Aware Harmony Engine
   * Generates candidate chords (diatonic, harmonic minor, borrowed, secondary dominants, sus2/4, 7ths, add9, inversions)
   * and scores them against active vocal melody notes and harmonic voice-leading.
   */
  private generateMelodyAwareChordMap(
    sections: SongSection[],
    totalBeats: number,
    scale: 'major' | 'minor',
    style: ArrangementStyle,
    rootMidi: number,
    vocalMap: VocalSongMap,
    musicalIntent: MusicalIntentResult
  ): { chordMapByBeat: number[]; chordVoicingsByBeat: ChordVoicing[] } {
    const chordMap = new Array(totalBeats * 2).fill(0);
    const voicingsMap = new Array<ChordVoicing>(totalBeats * 2);

    // Expanded Harmonic Candidates:
    const majorCandidates: { rootOffset: number; chordType: ChordVoicing['chordType']; chordName: string }[] = [
      { rootOffset: 0, chordType: 'maj', chordName: 'I' },
      { rootOffset: 0, chordType: 'maj7', chordName: 'Imaj7' },
      { rootOffset: 0, chordType: 'add9', chordName: 'Iadd9' },
      { rootOffset: 0, chordType: 'sus2', chordName: 'Isus2' },
      { rootOffset: 0, chordType: 'sus4', chordName: 'Isus4' },
      { rootOffset: 0, chordType: '6', chordName: 'I6' },
      { rootOffset: 2, chordType: 'min', chordName: 'ii' },
      { rootOffset: 2, chordType: 'min7', chordName: 'ii7' },
      { rootOffset: 2, chordType: 'sus2', chordName: 'iisus2' },
      { rootOffset: 4, chordType: 'min', chordName: 'iii' },
      { rootOffset: 4, chordType: 'min7', chordName: 'iii7' },
      { rootOffset: 5, chordType: 'maj', chordName: 'IV' },
      { rootOffset: 5, chordType: 'maj7', chordName: 'IVmaj7' },
      { rootOffset: 5, chordType: 'add9', chordName: 'IVadd9' },
      { rootOffset: 5, chordType: 'sus2', chordName: 'IVsus2' },
      { rootOffset: 5, chordType: 'min', chordName: 'iv (Borrowed Minor)' },
      { rootOffset: 7, chordType: 'maj', chordName: 'V' },
      { rootOffset: 7, chordType: 'dom7', chordName: 'V7' },
      { rootOffset: 7, chordType: 'sus4', chordName: 'Vsus4' },
      { rootOffset: 7, chordType: 'add9', chordName: 'Vadd9' },
      { rootOffset: 9, chordType: 'min', chordName: 'vi' },
      { rootOffset: 9, chordType: 'min7', chordName: 'vi7' },
      { rootOffset: 9, chordType: 'add9', chordName: 'vi(add9)' },
      { rootOffset: 10, chordType: 'maj', chordName: 'bVII (Mixolydian)' },
      { rootOffset: 8, chordType: 'maj', chordName: 'bVI (Chromatic Mediant)' },
      { rootOffset: 11, chordType: 'm7b5', chordName: 'viiø7' },
      { rootOffset: 6, chordType: 'dim', chordName: '#IVdim (Yaman)' }
    ];

    const minorCandidates: { rootOffset: number; chordType: ChordVoicing['chordType']; chordName: string }[] = [
      { rootOffset: 0, chordType: 'min', chordName: 'i' },
      { rootOffset: 0, chordType: 'min7', chordName: 'i7' },
      { rootOffset: 0, chordType: 'add9', chordName: 'i(add9)' },
      { rootOffset: 0, chordType: 'sus2', chordName: 'isus2' },
      { rootOffset: 0, chordType: 'min6', chordName: 'imin6' },
      { rootOffset: 1, chordType: 'maj', chordName: 'bII (Neapolitan / Bhairav)' },
      { rootOffset: 2, chordType: 'm7b5', chordName: 'iiø7' },
      { rootOffset: 3, chordType: 'maj', chordName: 'III' },
      { rootOffset: 3, chordType: 'maj7', chordName: 'IIImaj7' },
      { rootOffset: 3, chordType: 'add9', chordName: 'IIIadd9' },
      { rootOffset: 5, chordType: 'min', chordName: 'iv' },
      { rootOffset: 5, chordType: 'min7', chordName: 'iv7' },
      { rootOffset: 5, chordType: 'maj', chordName: 'IV (Dorian)' },
      { rootOffset: 7, chordType: 'min', chordName: 'v' },
      { rootOffset: 7, chordType: 'dom7', chordName: 'V7 (Harmonic Minor)' },
      { rootOffset: 7, chordType: 'sus4', chordName: 'Vsus4' },
      { rootOffset: 8, chordType: 'maj', chordName: 'VI' },
      { rootOffset: 8, chordType: 'maj7', chordName: 'VImaj7' },
      { rootOffset: 8, chordType: 'add9', chordName: 'VIadd9' },
      { rootOffset: 10, chordType: 'maj', chordName: 'VII (Subtonic)' },
      { rootOffset: 10, chordType: 'dom7', chordName: 'VII7' },
      { rootOffset: 11, chordType: 'dim', chordName: 'vii°7' }
    ];

    const baseCandidates = scale === 'minor' ? minorCandidates : majorCandidates;
    let previousChosenVoicing: ChordVoicing | undefined = undefined;

    for (let beat = 0; beat < totalBeats; ) {
      // Variable harmonic resolution based on musical intensity and density
      let resolution = 2; // Default 2 beats (half bar in 4/4)
      const intensity = vocalMap.intensityCurve[Math.floor(beat)] || 0.5;
      const isPeak = vocalMap.emotionalPeaks.some(p => Math.abs(p.beat - beat) <= 1);
      const isDenseVocal = (vocalMap.vocalDensityByBeat[Math.floor(beat)] || 0) > 0.8;
      
      if (style === 'indian') resolution = 4; // Stable drone/raga anchors
      
      if (intensity > 0.85 && isPeak && isDenseVocal) {
        resolution = 0.5; // Half-beat fast resolution for intense passing cadences
      } else if (intensity > 0.8 || isPeak) {
        resolution = 1;
      } else if (intensity < 0.3) {
        resolution = 4;
      }
      
      const section = sections.find(s => beat >= s.startBeat && beat < s.endBeat) || sections[0];
      const sectionBeatsPassed = beat - section.startBeat;
      const defaultChordIdx = Math.floor(sectionBeatsPassed / 4) % section.chordProgression.length;
      const baseProgressionOffset = section.chordProgression[defaultChordIdx] || 0;

      // Extract active vocal notes during this harmonic window
      const barStartTime = beat * (60 / vocalMap.bpm);
      const barEndTime = (beat + resolution) * (60 / vocalMap.bpm);
      const activeNotes = vocalMap.notes.filter(n => 
        (n.startTime >= barStartTime && n.startTime < barEndTime) ||
        (n.endTime > barStartTime && n.endTime <= barEndTime) ||
        (n.startTime <= barStartTime && n.endTime >= barEndTime)
      );

      // Detect active phrase and phrase landing/cadence context
      const currentPhrase = vocalMap.phrases.find(p => 
        (p.startBeat <= beat && p.endBeat >= beat) ||
        (Math.abs(p.endBeat - beat) <= resolution)
      );
      const isPhraseEnding = currentPhrase ? Math.abs(currentPhrase.endBeat - (beat + resolution)) <= 1.0 : false;
      const phraseLandingPitchClass = currentPhrase ? (currentPhrase.landingMidi % 12 + 12) % 12 : -1;
      const keyRootPitchClass = (rootMidi % 12 + 12) % 12;
      const relativeLandingClass = phraseLandingPitchClass >= 0 
        ? ((phraseLandingPitchClass - keyRootPitchClass) % 12 + 12) % 12 
        : -1;

      const prevOffset = previousChosenVoicing ? previousChosenVoicing.rootOffset : (beat > 0 ? chordMap[Math.floor(beat * 2) - 1] : 0);

      // Default fallback voicing in root position
      const defaultType = scale === 'minor' && (baseProgressionOffset === 0 || baseProgressionOffset === 5) ? 'min' : 'maj';
      const defaultMidi = buildInvertedVoicingMidi(rootMidi, baseProgressionOffset, defaultType, 0, 60);
      const defaultVoicing: ChordVoicing = {
        rootOffset: baseProgressionOffset,
        chordType: defaultType,
        inversion: 0,
        chordName: scale === 'minor' ? (baseProgressionOffset === 0 ? 'i' : 'VI') : (baseProgressionOffset === 0 ? 'I' : 'V'),
        midiNotes: defaultMidi,
        voiceLeadingDistance: calculateVoiceLeadingDistance(previousChosenVoicing?.midiNotes, defaultMidi)
      };

      if (activeNotes.length === 0 || section.type === 'intro' || (section.type === 'outro' && beat >= totalBeats - 4)) {
        // In intro or outro tail: follow stable functional progression resolving to Tonic
        const targetOffset = (section.type === 'outro' && beat >= totalBeats - 4) ? 0 : baseProgressionOffset;
        const targetType = scale === 'minor' && (targetOffset === 0 || targetOffset === 5) ? 'min' : 'maj';
        
        // Pick best voice-led inversion for the default chord
        let bestDefaultVoicing = defaultVoicing;
        let bestDistance = Infinity;
        for (let inv = 0; inv <= 2; inv++) {
          const vMidi = buildInvertedVoicingMidi(rootMidi, targetOffset, targetType, inv, 60);
          const dist = calculateVoiceLeadingDistance(previousChosenVoicing?.midiNotes, vMidi);
          if (dist < bestDistance) {
            bestDistance = dist;
            bestDefaultVoicing = {
              rootOffset: targetOffset,
              chordType: targetType,
              inversion: inv,
              chordName: targetOffset === 0 ? (scale === 'minor' ? 'i' : 'I') : 'Progression Chord',
              midiNotes: vMidi,
              voiceLeadingDistance: dist
            };
          }
        }

        for (let sub = Math.floor(beat * 2); sub < Math.floor((beat + resolution) * 2) && sub < totalBeats * 2; sub++) {
          chordMap[sub] = bestDefaultVoicing.rootOffset;
          voicingsMap[sub] = bestDefaultVoicing;
        }
        previousChosenVoicing = bestDefaultVoicing;
        beat += resolution;
        continue;
      }

      // 6-TIER HARMONIC AUTHORITY SCORING:
      let bestVoicing = defaultVoicing;
      let highestScore = -9999;

      baseCandidates.forEach(cand => {
        const intervals = getChordIntervals(cand.chordType);
        const maxInversions = cand.chordType.includes('7') || cand.chordType === 'add9' ? 3 : 2;

        for (let inv = 0; inv <= maxInversions; inv++) {
          const candidateMidiNotes = buildInvertedVoicingMidi(rootMidi, cand.rootOffset, cand.chordType, inv, 60);
          const vlDistance = calculateVoiceLeadingDistance(previousChosenVoicing?.midiNotes, candidateMidiNotes);
          
          let score = 0;

          // ----------------------------------------------------
          // HIERARCHY TIER 1: VOCAL MELODY COMPATIBILITY
          // ----------------------------------------------------
          const candRootPitchClass = ((rootMidi + cand.rootOffset) % 12 + 12) % 12;
          const candPitchClasses = intervals.map(iv => (candRootPitchClass + iv) % 12);
          const candThirdPitchClass = candPitchClasses[1];
          const candFifthPitchClass = candPitchClasses[2];
          const candSeventhPitchClass = cand.chordType.includes('7') ? candPitchClasses[3] : -1;
          const candNinthPitchClass = cand.chordType === 'add9' ? (candRootPitchClass + 2) % 12 : -1;

          activeNotes.forEach(note => {
            const mainNoteClass = (note.midiNote % 12 + 12) % 12;
            const noteDur = note.duration || (note.endTime - note.startTime);
            const isLongSustained = noteDur >= 0.8 || note.isSustained;
            const isAccented = (note.rmsEnergy || 0) > 0.65;
            const isStrongBeat = (note.startBeat % 1.0) < 0.15;
            const isPhraseLanding = currentPhrase ? note.midiNote === currentPhrase.landingMidi : false;

            // Weighted note importance: Long Sustained (3.5) > Phrase Landing (3.0) > Strong Beat (2.0) > Accented (1.8) > Short Passing (0.8)
            let noteWeight = 1.0;
            if (isLongSustained) noteWeight = 3.5;
            else if (isPhraseLanding) noteWeight = 3.0;
            else if (isStrongBeat) noteWeight = 2.0;
            else if (isAccented) noteWeight = 1.8;
            else if (noteDur < 0.35) noteWeight = 0.8;

            noteWeight *= Math.max(0.5, note.confidence || 0.8);

            const allPitches = [mainNoteClass, ...(note.polyphonicMidiNotes || []).map(m => (m % 12 + 12) % 12)];

            allPitches.forEach((noteClass, pIdx) => {
              const pWeight = pIdx === 0 ? noteWeight : noteWeight * 0.55;

              if (noteClass === candThirdPitchClass) {
                score += 32 * pWeight; // Rich expressive third
              } else if (noteClass === candRootPitchClass) {
                score += 24 * pWeight; // Solid root foundation
              } else if (noteClass === candFifthPitchClass) {
                score += 20 * pWeight; // Stable fifth anchor
              } else if (noteClass === candSeventhPitchClass || noteClass === candNinthPitchClass) {
                score += 18 * pWeight; // Lush harmonic extension
              } else if (candPitchClasses.includes(noteClass)) {
                score += 16 * pWeight; // Other chord tone (sus2/sus4/6th)
              } else {
                // Dissonance & clash protection:
                const semitoneClash = candPitchClasses.some(cp => {
                  const diff = Math.abs(cp - noteClass);
                  return diff === 1 || diff === 11;
                });
                const tritoneClash = Math.abs(candRootPitchClass - noteClass) === 6;

                if (semitoneClash) {
                  // Heavy penalty against sustained or landing notes
                  score -= (isLongSustained || isPhraseLanding ? 55 : 20) * pWeight;
                } else if (tritoneClash && !cand.chordType.includes('dom7')) {
                  score -= 28 * pWeight;
                } else {
                  score -= 6 * pWeight; // Mild non-chord tone passing penalty
                }
              }
            });
          });

          // ----------------------------------------------------
          // HIERARCHY TIER 2: PHRASE LANDING & CADENCE RESOLUTION
          // ----------------------------------------------------
          if (isPhraseEnding && relativeLandingClass >= 0) {
            if (relativeLandingClass === 0) {
              // Singer lands on Tonic (Sa)
              if (cand.rootOffset === 0) {
                score += 48; // Overwhelming priority for Tonic harmony
                if (prevOffset === 7 || prevOffset === 10) score += 32; // Authentic V->I / VII->I cadence
                if (prevOffset === 5) score += 24; // Plagal IV->I cadence
              }
            } else if (relativeLandingClass === 7) {
              // Singer lands on Dominant (Pa)
              if (cand.rootOffset === 7 || cand.rootOffset === 0 || cand.rootOffset === 3) {
                score += 36; // Dominant or Tonic harmonic support
              }
            } else if (relativeLandingClass === 4 || relativeLandingClass === 3) {
              // Singer lands on Mediante / Third (Ga)
              if (candPitchClasses.includes(phraseLandingPitchClass)) {
                score += 32;
              }
            } else if (relativeLandingClass === 5) {
              // Singer lands on Subdominant (Ma)
              if (cand.rootOffset === 5 || cand.rootOffset === 2) {
                score += 28;
              }
            }
          }

          // ----------------------------------------------------
          // HIERARCHY TIER 3: VOICE LEADING & SMOOTH MOTION
          // ----------------------------------------------------
          const vlBonus = Math.max(0, 18 - vlDistance * 1.5);
          score += vlBonus;
          if (previousChosenVoicing && cand.rootOffset === previousChosenVoicing.rootOffset && inv === previousChosenVoicing.inversion) {
            score -= 6; // Discourage static drone unless vocal is holding pedal
          }

          // ----------------------------------------------------
          // HIERARCHY TIER 4: MUSICAL INTENT & EMOTIONAL PEAKS
          // ----------------------------------------------------
          const isCurrentPeak = vocalMap.emotionalPeaks.some(p => Math.abs(p.beat - beat) <= 2);
          if (isCurrentPeak) {
            if (cand.rootOffset === (scale === 'minor' ? 8 : 9) || cand.rootOffset === 5) {
              score += 22; // Emotional VI / IV harmonic expansion
            }
            if (cand.chordType.includes('7') || cand.chordType === 'add9') {
              score += 14;
            }
          }

          // ----------------------------------------------------
          // HIERARCHY TIER 5: STYLE & INDIAN MODAL COLORING
          // ----------------------------------------------------
          if (style === 'indian') {
            if (cand.rootOffset === 0) score += 18; // Grounding tonic root anchor
            if (cand.chordType === 'sus2' || cand.chordType === 'add9') score += 12; // Open tambura sonorities
          }

          // ----------------------------------------------------
          // HIERARCHY TIER 6: GENERIC PROGRESSION (BOUNDED PRIOR)
          // ----------------------------------------------------
          if (cand.rootOffset === baseProgressionOffset) {
            score += 10; // Stylistic prior, never overrides vocal melody compatibility
          }

          // Naturalness bonus for clean triads
          if (cand.chordType === 'maj' || cand.chordType === 'min') {
            score += 4;
          }

          if (score > highestScore) {
            highestScore = score;
            bestVoicing = {
              rootOffset: cand.rootOffset,
              chordType: cand.chordType,
              inversion: inv,
              chordName: cand.chordName,
              midiNotes: candidateMidiNotes,
              voiceLeadingDistance: vlDistance
            };
          }
        }
      });

      for (let sub = Math.floor(beat * 2); sub < Math.floor((beat + resolution) * 2) && sub < totalBeats * 2; sub++) {
        chordMap[sub] = bestVoicing.rootOffset;
        voicingsMap[sub] = bestVoicing;
      }
      previousChosenVoicing = bestVoicing;
      beat += resolution;
    }

    return { chordMapByBeat: chordMap, chordVoicingsByBeat: voicingsMap };
  }

  /**
   * Continuous dynamic arrangement density curve across all beats
   */
  private calculateContinuousDensityCurve(
    sections: SongSection[],
    totalBeats: number,
    energy: EnergyLevel,
    vocalMap: VocalSongMap,
    musicalIntent: MusicalIntentResult
  ): number[] {
    const curve = new Array(totalBeats).fill(0.5);
    const energyMult = energy === 'powerful' ? 1.15 : energy === 'soft' ? 0.85 : 1.0;

    for (let b = 0; b < totalBeats; b++) {
      const sec = sections.find(s => b >= s.startBeat && b < s.endBeat) || sections[0];
      const secProgress = (b - sec.startBeat) / Math.max(1, sec.endBeat - sec.startBeat);

      let baseDensity = sec.density;

      if (sec.type === 'intro') {
        baseDensity = 0.18 + secProgress * 0.32;
      } else if (sec.type === 'verse_mukhda' || sec.type === 'verse_antara') {
        baseDensity = 0.32 + Math.sin(secProgress * Math.PI) * -0.06 + secProgress * 0.14;
      } else if (sec.type === 'pre_chorus') {
        baseDensity = 0.45 + secProgress * 0.35;
      } else if (sec.type === 'chorus_hook') {
        baseDensity = 0.82 + secProgress * 0.1;
      } else if (sec.type === 'chorus_climax') {
        baseDensity = 0.92 + secProgress * 0.08;
      } else if (sec.type === 'interlude') {
        baseDensity = 0.52 + Math.sin(secProgress * Math.PI) * 0.12;
      } else if (sec.type === 'outro') {
        baseDensity = Math.max(0.1, 0.55 * (1 - secProgress));
      }

      // Emotional Peak & Vocal Tension modulation
      const isPeak = vocalMap.emotionalPeaks.some(p => Math.abs(p.beat - b) <= 2);
      if (isPeak) {
        baseDensity = Math.min(1.0, baseDensity + 0.14);
      }

      const vocalTension = vocalMap.tensionMap[b] || 0.2;
      baseDensity = Math.min(1.0, baseDensity + (vocalTension - 0.2) * 0.2);

      curve[b] = Math.min(1.0, Math.max(0.1, baseDensity * energyMult));
    }

    return curve;
  }

  /**
   * Builds song sections adapting to vocal motifs, phrases & musical intent
   */
  private buildDynamicSongSections(
    totalBeats: number,
    introBeats: number,
    secondsPerBeat: number,
    scale: 'major' | 'minor',
    style: ArrangementStyle,
    energy: EnergyLevel,
    vocalMap: VocalSongMap,
    musicalIntent: MusicalIntentResult
  ): SongSection[] {
    const sections: SongSection[] = [];
    const chordLib = this.getBollywoodChordLibrary(scale, style);

    // 1. INTRO
    sections.push({
      type: 'intro',
      name: 'Musical Intro (Acoustic Build)',
      startBeat: 0,
      endBeat: introBeats,
      startTime: 0,
      endTime: introBeats * secondsPerBeat,
      density: 0.32,
      chordProgression: chordLib.intro,
      isVocalActive: false,
      roleDescriptions: {
        piano: 'Flowing arpeggiated foundation establishing key tonality',
        flute: 'Signature melodic theme motif (0-7s)',
        drums: '3-stage build: Atmosphere -> Hat pulse -> Snare riser into drop',
        bass: 'Deep root note entrance on final 4 bars',
        strings: 'Warm ambient pad creating expansive acoustic space'
      }
    });

    const remainingBeats = totalBeats - introBeats;
    let currBeat = introBeats;

    // Detect actual hook locations from vocal map to align Chorus
    const hookStarts = (vocalMap.likelyHookSections || []).map(h => h.startBeat);
    const primaryHookStart = hookStarts.length > 0 ? hookStarts[0] : introBeats + Math.floor(remainingBeats * 0.45);

    // 2. VERSE 1 / MUKHDA
    // Dynamic length: Ends when the hook starts
    const verse1End = Math.min(introBeats + 48, Math.max(introBeats + 16, primaryHookStart));
    const verse1Beats = verse1End - introBeats;

    sections.push({
      type: 'verse_mukhda',
      name: 'Verse 1 (Mukhda)',
      startBeat: currBeat,
      endBeat: currBeat + verse1Beats,
      startTime: currBeat * secondsPerBeat,
      endTime: (currBeat + verse1Beats) * secondsPerBeat,
      density: 0.42,
      chordProgression: chordLib.verse,
      isVocalActive: true,
      roleDescriptions: {
        piano: 'Subtle chord foundation leaving clear space for the vocalist',
        guitar: 'Delicate fingerpicked rhythmic texture',
        bass: 'Deep sustained root pulses',
        drums: 'Gentle groove with kick on 1, rim/snare on 3, steady hats',
        flute: 'Melody-aware call-and-response answers during vocal pause gaps'
      }
    });
    currBeat += verse1Beats;

    // 3. CHORUS / HOOK (Aligned with Vocal Intelligence)
    const chorusBeats = Math.min(32, Math.max(16, Math.floor(remainingBeats * 0.3)));
    sections.push({
      type: 'chorus_hook',
      name: 'Chorus (Hook)',
      startBeat: currBeat,
      endBeat: currBeat + chorusBeats,
      startTime: currBeat * secondsPerBeat,
      endTime: (currBeat + chorusBeats) * secondsPerBeat,
      density: 0.88,
      chordProgression: chordLib.chorus,
      isVocalActive: true,
      roleDescriptions: {
        drums: 'Full acoustic studio groove with syncopated kicks and crisp snares',
        bass: 'Root & 5th melodic groove supporting the hook',
        piano: '2-handed grand chords with low octave reinforcement',
        guitar: 'Rhythmic acoustic strumming adding sheen and body',
        strings: 'Grand symphonic ensemble sustaining emotional power'
      }
    });
    currBeat += chorusBeats;

    // 4. INTERLUDE / CLIMAX (Listening for peak emotional intensity)
    if (currBeat < totalBeats - 8) {
      const leftover = totalBeats - currBeat;
      const interludeBeats = Math.min(16, Math.floor(leftover * 0.4));
      
      sections.push({
        type: 'interlude',
        name: 'Instrumental Interlude',
        startBeat: currBeat,
        endBeat: currBeat + interludeBeats,
        startTime: currBeat * secondsPerBeat,
        endTime: (currBeat + interludeBeats) * secondsPerBeat,
        density: 0.58,
        chordProgression: chordLib.interlude,
        isVocalActive: false,
        roleDescriptions: {
          flute: 'Expressive lyrical woodwind solo carrying the main motif',
          guitar: 'Acoustic fingerpicked counterpoint',
          piano: 'Flowing arpeggiated accompaniment',
          drums: 'Light rhythmic swing groove'
        }
      });
      currBeat += interludeBeats;

      // Identify Climax from emotional peaks
      const peakBeats = (vocalMap.emotionalPeaks || []).filter(p => p.intensity > 0.85).map(p => p.beat);
      const primaryClimaxBeat = peakBeats.length > 0 ? Math.floor(peakBeats[peakBeats.length - 1]) : currBeat;

      const climaxBeats = Math.max(8, totalBeats - currBeat - 8);
      sections.push({
        type: 'chorus_climax',
        name: 'Grand Climax',
        startBeat: currBeat,
        endBeat: currBeat + climaxBeats,
        startTime: currBeat * secondsPerBeat,
        endTime: (currBeat + climaxBeats) * secondsPerBeat,
        density: 0.98,
        chordProgression: chordLib.climax,
        isVocalActive: true,
        roleDescriptions: {
          all: 'Peak arrangement density with all selected instruments playing at maximum harmonic depth'
        }
      });
      currBeat += climaxBeats;
    }

    // 5. OUTRO
    if (currBeat < totalBeats) {
      sections.push({
        type: 'outro',
        name: 'Musical Outro (Fade)',
        startBeat: currBeat,
        endBeat: totalBeats,
        startTime: currBeat * secondsPerBeat,
        endTime: totalBeats * secondsPerBeat,
        density: 0.28,
        chordProgression: chordLib.outro,
        isVocalActive: false,
        roleDescriptions: {
          piano: 'Slow, gentle chord resolution on the root tonic',
          flute: 'Fading melodic farewell motif',
          strings: 'Quiet sustained pad decrescendo'
        }
      });
    }

    return sections;
  }

  /**
   * Bollywood Harmonic Library
   */
  private getBollywoodChordLibrary(
    scale: 'major' | 'minor',
    style: ArrangementStyle
  ) {
    if (scale === 'minor') {
      switch (style) {
        case 'romantic':
          return {
            intro: [0, 8, 3, 10],      // i - VI - III - VII
            verse: [0, 10, 8, 10],     // i - VII - VI - VII
            preChorus: [8, 10, 0, 7],  // VI - VII - i - v
            chorus: [0, 8, 3, 10],     // i - VI - III - VII
            interlude: [3, 10, 0, 8],  // III - VII - i - VI
            climax: [0, 8, 10, 7],     // i - VI - VII - v
            outro: [8, 10, 0, 0]       // VI - VII - i
          };
        case 'emotional':
          return {
            intro: [0, 8, 5, 7],       // i - VI - iv - v
            verse: [0, 8, 3, 7],       // i - VI - III - v
            preChorus: [5, 7, 8, 10],  // iv - v - VI - VII
            chorus: [0, 8, 10, 7],     // i - VI - VII - v
            interlude: [0, 5, 7, 8],   // i - iv - v - VI
            climax: [0, 3, 8, 10],     // i - III - VI - VII
            outro: [0, 8, 7, 0]        // i - VI - v - i
          };
        case 'cinematic':
        case 'modern':
          return {
            intro: [0, 5, 8, 10],      // i - iv - VI - VII
            verse: [0, 8, 5, 7],       // i - VI - iv - v
            preChorus: [8, 10, 0, 7],  // VI - VII - i - v
            chorus: [0, 8, 3, 10],     // i - VI - III - VII
            interlude: [0, 5, 7, 8],   // i - iv - v - VI
            climax: [0, 8, 10, 7],     // i - VI - VII - v
            outro: [8, 10, 0, 0]       // VI - VII - i
          };
        default:
          return {
            intro: [0, 8, 3, 10],
            verse: [0, 10, 8, 10],
            preChorus: [8, 10, 0, 7],
            chorus: [0, 8, 3, 10],
            interlude: [3, 10, 0, 8],
            climax: [0, 8, 10, 7],
            outro: [8, 10, 0, 0]
          };
      }
    } else {
      switch (style) {
        case 'romantic':
        case 'acoustic':
          return {
            intro: [0, 7, 9, 5],       // I - V - vi - IV
            verse: [0, 9, 5, 7],       // I - vi - IV - V
            preChorus: [2, 5, 0, 7],   // ii - IV - I - V
            chorus: [0, 7, 9, 5],      // I - V - vi - IV
            interlude: [9, 5, 0, 7],   // vi - IV - I - V
            climax: [0, 7, 9, 5],      // I - V - vi - IV
            outro: [5, 7, 0, 0]        // IV - V - I
          };
        case 'dance':
        case 'modern':
          return {
            intro: [9, 5, 0, 7],       // vi - IV - I - V
            verse: [0, 7, 9, 5],       // I - V - vi - IV
            preChorus: [9, 7, 5, 7],   // vi - V - IV - V
            chorus: [9, 5, 0, 7],      // vi - IV - I - V
            interlude: [5, 7, 9, 7],   // IV - V - vi - V
            climax: [9, 5, 0, 7],      // vi - IV - I - V
            outro: [9, 5, 0, 0]        // vi - IV - I
          };
        case 'cinematic':
          return {
            intro: [0, 5, 9, 7],       // I - IV - vi - V
            verse: [0, 9, 5, 7],       // I - vi - IV - V
            preChorus: [5, 7, 9, 7],   // IV - V - vi - V
            chorus: [0, 7, 9, 5],      // I - V - vi - IV
            interlude: [9, 5, 0, 7],   // vi - IV - I - V
            climax: [0, 7, 9, 5],      // I - V - vi - IV
            outro: [5, 7, 0, 0]        // IV - V - I
          };
        default:
          return {
            intro: [0, 7, 9, 5],
            verse: [0, 9, 5, 7],
            preChorus: [2, 5, 0, 7],
            chorus: [0, 7, 9, 5],
            interlude: [9, 5, 0, 7],
            climax: [0, 7, 9, 5],
            outro: [5, 7, 0, 0]
          };
      }
    }
  }

  // --- 2. MULTI-TRACK STEM GENERATOR (Vocal-Aware Scheduling, Unified Timeline & Melodic Coherence) ---
  public generateArrangementStems(
    plan: ArrangementPlan,
    selectedInstruments: string[],
    vocalBuffer: AudioBuffer | null,
    audioContext: AudioContext
  ): { tracks: ProjectTrack[]; totalDuration: number } {
    const sampleRate = audioContext.sampleRate;
    const secondsPerBeat = 60 / plan.bpm;
    const totalBeats = Math.max(1, Math.floor(plan.totalDuration / secondsPerBeat));
    const introBeats = Math.floor(plan.introSeconds / secondsPerBeat);

    // CANONICAL MONOTONIC MUSICAL TIMELINE (P0.1 & P0.2)
    const timeline = new MusicalTimeline(
      plan.bpm,
      totalBeats,
      sampleRate,
      plan.vocalMap.tempoDeviationCurve
    );
    plan.timeline = timeline;
    const totalSamples = timeline.totalSamples;
    const totalDuration = timeline.totalDuration;
    const introSamples = timeline.getSampleAtBeat(introBeats);

    const instEngine = InstrumentSoundEngine.getInstance();
    const instSet = new Set(selectedInstruments.map(s => s.toLowerCase()));
    const tracks: ProjectTrack[] = [];

    const createTrackBuffer = () => audioContext.createBuffer(2, totalSamples, sampleRate);
    
    // Melodic Excitation Buffers for Inter-Track Sitar Resonance
    const melodicExcitationL = new Float32Array(totalSamples);
    const melodicExcitationR = new Float32Array(totalSamples);
    const addExcitation = (buf: AudioBuffer, weight: number = 1.0) => {
      const bL = buf.getChannelData(0);
      const bR = buf.numberOfChannels > 1 ? buf.getChannelData(1) : bL;
      const len = Math.min(bL.length, totalSamples);
      for (let i = 0; i < len; i++) {
        melodicExcitationL[i] += bL[i] * weight;
        melodicExcitationR[i] += bR[i] * weight;
      }
    };

    // Meter-aware bar helper
    const getBeatsPerBar = (beat: number): number => {
      const m = plan.meterMapByBeat[Math.floor(beat)] || plan.meter || '4/4';
      return m === '3/4' ? 3 : m === '6/8' ? 6 : m === '7/8' ? 7 : 4;
    };

    // 1. LEAD VOCAL TRACK
    if (vocalBuffer) {
      const vocalAlignedBuffer = createTrackBuffer();
      const vL = vocalAlignedBuffer.getChannelData(0);
      const vR = vocalAlignedBuffer.getChannelData(1);
      const srcL = vocalBuffer.getChannelData(0);
      const srcR = vocalBuffer.numberOfChannels > 1 ? vocalBuffer.getChannelData(1) : srcL;

      const copyLen = Math.min(srcL.length, Math.max(0, totalSamples - introSamples));
      for (let i = 0; i < copyLen; i++) {
        vL[introSamples + i] = srcL[i];
        vR[introSamples + i] = srcR[i];
      }

      addExcitation(vocalAlignedBuffer, 0.8);
      tracks.push({
        id: `trk-vocal-${Date.now()}`,
        name: 'Lead Vocal (Cleaned)',
        type: 'vocal',
        volume: 0.95,
        pan: 0,
        isMuted: false,
        isSolo: false,
        audioBuffer: vocalAlignedBuffer,
        duration: totalDuration,
        color: '#6366f1'
      });
    }

    // Helper functions
    const getSectionAtBeat = (beat: number): SongSection => {
      return plan.sections.find(s => beat >= s.startBeat && beat < s.endBeat) || plan.sections[0];
    };

    const getChordRootAtBeat = (beat: number): number => {
      const idx = Math.max(0, Math.min(plan.chordMapByBeat.length - 1, Math.floor(beat * 2)));
      const offset = plan.chordMapByBeat[idx] ?? 0;
      return plan.rootMidi + offset;
    };

    const getVoicingAtBeat = (beat: number): ChordVoicing => {
      const idx = Math.max(0, Math.min(plan.chordVoicingsByBeat.length - 1, Math.floor(beat * 2)));
      return plan.chordVoicingsByBeat[idx] || { rootOffset: 0, chordType: 'maj', inversion: 0 };
    };

    const getDensityAtBeat = (beat: number): number => {
      return plan.densityCurveByBeat[Math.floor(beat)] ?? 0.5;
    };

    const isVocalActiveBeat = (beat: number): boolean => {
      return (plan.vocalMap.vocalDensityByBeat[Math.floor(beat)] ?? 0) > 0.1;
    };

    const isVocalPauseBeat = (beat: number): VocalSilenceGap | undefined => {
      return plan.vocalMap.silenceGaps.find(g => beat >= g.startBeat && beat < g.endBeat);
    };

    const isEmotionalPeakBeat = (beat: number): boolean => {
      return plan.vocalMap.emotionalPeaks.some(m => Math.abs(beat - m.beat) <= 2);
    };

    // Expressive Performance Intelligence Engine (Phase 24 - Part 4A)
    const expEngine = ExpressivePerformanceEngine.getInstance();
    const expressiveMap = plan.vocalMap.expressiveMap || expEngine.buildExpressivePerformanceMap(plan.vocalMap, totalBeats);

    // Cross-Stem Expressive Coherence & Vocal Priority Coordinator (Phase 24 - Part 4B)
    const coordinator = CrossStemCoordinator.getInstance();
    const coherenceMap = coordinator.coordinateArrangement(plan, expressiveMap, timeline, totalBeats);
    const getCoordProfile = (b: number): CoordinatedStemProfile => {
      const idx = Math.max(0, Math.min(totalBeats - 1, Math.floor(b)));
      return coherenceMap.profilesByBeat[idx];
    };

    // ----------------------------------------------------
    // STEM 2: ACOUSTIC STUDIO DRUMS / TABLA (Sample-Accurate Groove & Expressive Response)
    // ----------------------------------------------------
    if (instSet.has('drums') || instSet.has('percussion')) {
      const drumBuffer = createTrackBuffer();
      const dL = drumBuffer.getChannelData(0);
      const dR = drumBuffer.getChannelData(1);
      
      const isIndianPercussion = plan.style === 'indian';

      let barPos = 0;
      let lastMeter = plan.meterMapByBeat[0] || plan.meter || '4/4';

      for (let beat = 0; beat < totalBeats; beat++) {
        const sec = getSectionAtBeat(beat);
        const density = getDensityAtBeat(beat);
        const beatsPerBar = getBeatsPerBar(beat);
        const currentMeter = plan.meterMapByBeat[beat] || plan.meter || '4/4';

        if (beat > 0 && currentMeter !== lastMeter) {
          barPos = 0;
        }
        lastMeter = currentMeter;
        
        const localMeter = currentMeter;
        const beatSample = timeline.getSampleAtBeat(beat);
        const isFirstBeatOfSection = plan.sections.some(s => s.startBeat === beat);
        const drumsProfile = expEngine.getDrumsProfile(beat, expressiveMap, sec.type);

        // Section Start: Crash Cymbal
        if (isFirstBeatOfSection && beat > 0) {
          instEngine.renderAcousticHiHat(dL, dR, beatSample, true, sampleRate, Math.min(1.0, drumsProfile.hihatVel * 1.15));
        }
        const isSectionEndBar = (beat % 4 === 3) && ((beat + 1) % 16 === 0 || beat === sec.endBeat - 1);
        const phraseVariation = Math.floor(beat / 4) % 2;

        if (isIndianPercussion) {
          // --- TABLA RHYTHMIC & ENSEMBLE ENGINE (Coordinated Theka & Tihai) ---
          const isEmotionalClimax = plan.vocalMap.overallVocalDynamicArc === 'peaked' || density > 0.8 || drumsProfile.kickVel > 0.85;
          const strokeVelocity = drumsProfile.kickVel;
          const isKhali = (localMeter === '4/4' && barPos === 2) || (localMeter === '7/8' && barPos < 3);

          // 1. Context-Aware Theka Orchestration with Sam / Khali Awareness
          if (localMeter === '4/4') {
            // Teental / Keherwa canonical theka with section variation
            if (barPos === 0) {
              // Sam (First beat - accented Dha with Dayun + Bayun resonant sweep)
              instEngine.renderTabla(dL, dR, beatSample, 'dha', sampleRate, strokeVelocity * 1.08);
            } else if (barPos === 1) {
              // Second matra: Na or Dhin support based on density
              const stroke = (density > 0.65 && phraseVariation === 1) ? 'dhin' : 'na';
              instEngine.renderTabla(dL, dR, beatSample, stroke, sampleRate, drumsProfile.snareVel * 0.9);
            } else if (barPos === 2) {
              // Khali / Third matra: Tin (dry open Dayun) or Dha in climax
              const stroke = isEmotionalClimax ? 'dha' : (density < 0.4 ? 'tin' : 'tin');
              instEngine.renderTabla(dL, dR, beatSample, stroke, sampleRate, strokeVelocity * 0.95);
            } else if (barPos === 3) {
              // Fourth matra: Na resolution before next bar
              instEngine.renderTabla(dL, dR, beatSample, 'na', sampleRate, drumsProfile.snareVel * 0.85);
            }
          } else if (localMeter === '3/4') {
            // Dadra / Rupak 6-matra / 3-matra framework
            if (barPos === 0) instEngine.renderTabla(dL, dR, beatSample, 'dha', sampleRate, strokeVelocity * 1.05);
            else if (barPos === 1) instEngine.renderTabla(dL, dR, beatSample, (phraseVariation === 1 ? 'dhin' : 'tin'), sampleRate, drumsProfile.snareVel * 0.85);
            else if (barPos === 2) instEngine.renderTabla(dL, dR, beatSample, 'na', sampleRate, drumsProfile.snareVel * 0.9);
          } else if (localMeter === '7/8') {
            // Rupak Tala (3+2+2): Tin Tin Na | Dha Dha | Dha Dha
            if (barPos === 0) instEngine.renderTabla(dL, dR, beatSample, 'tin', sampleRate, drumsProfile.snareVel * 0.85);
            else if (barPos === 1) instEngine.renderTabla(dL, dR, beatSample, 'tin', sampleRate, drumsProfile.snareVel * 0.8);
            else if (barPos === 2) instEngine.renderTabla(dL, dR, beatSample, 'na', sampleRate, drumsProfile.snareVel * 0.9);
            else if (barPos === 3) instEngine.renderTabla(dL, dR, beatSample, 'dha', sampleRate, strokeVelocity * 1.1);
            else if (barPos === 4) instEngine.renderTabla(dL, dR, beatSample, 'dha', sampleRate, strokeVelocity * 0.95); 
            else if (barPos === 5) instEngine.renderTabla(dL, dR, beatSample, 'dha', sampleRate, strokeVelocity * 1.0);
            else if (barPos === 6) instEngine.renderTabla(dL, dR, beatSample, 'dha', sampleRate, strokeVelocity * 0.9);
          }

          // 2. Tirakit / Rolls / Fills / Tihai Cadences (Vocal phrase boundaries & section transitions)
          const isEndOfPhrase = (plan.vocalMap.pitchContourByBeat[beat + 1]?.length ?? 0) === 0 && (plan.vocalMap.pitchContourByBeat[beat]?.length ?? 0) > 0;
          
          if (isSectionEndBar || (isEndOfPhrase && drumsProfile.fillIntensity > 0.45)) {
            const subdivCount = localMeter === '7/8' ? 3 : 4;
            for (let s = 0; s < subdivCount; s++) {
              const tFrac = beat + 0.5 + (s / subdivCount) * 0.5;
              const t = timeline.getSampleAtBeat(tFrac);
              if (t >= totalSamples) break;
              
              const stroke = s % 4 === 0 ? 'ti' : s % 4 === 1 ? 'ra' : s % 4 === 2 ? 'ki' : 'ta';
              instEngine.renderTabla(dL, dR, t, stroke as any, sampleRate, drumsProfile.snareVel * (0.6 + s * 0.1));
            }
            
            if (barPos === beatsPerBar - 1) {
              const tClimax = timeline.getSampleAtBeat(beat + 0.75);
              if (tClimax < totalSamples) instEngine.renderTabla(dL, dR, tClimax, 'dha', sampleRate, strokeVelocity * 1.2);
            }
          }

          // 3. Rhythmic Bayun Meend & Syncopation (Controlled dynamics during high energy)
          if (density > 0.6 && barPos % 2 === 1 && !isKhali) {
            const syncopatedOffset = timeline.getSampleAtBeat(beat + 0.75);
            if (syncopatedOffset < totalSamples) {
              instEngine.renderTabla(dL, dR, syncopatedOffset, 'ge', sampleRate, strokeVelocity * 0.65);
            }
          }
          
          instEngine.renderAcousticHiHat(dL, dR, beatSample, false, sampleRate, drumsProfile.hihatVel * 0.6);
          
        } else if (sec.type === 'verse_mukhda' || sec.type === 'verse_antara' || sec.type === 'intro' || sec.type === 'outro') {
          if (barPos === 0) {
            instEngine.renderAcousticKick(dL, dR, beatSample, sampleRate, drumsProfile.kickVel);
          }
          
          const isSyncopatedKickBeat = localMeter === '4/4' ? barPos === 2 : (barPos === 2 || barPos === 3);
          if (phraseVariation === 1 && isSyncopatedKickBeat) {
            const syncopatedKick = timeline.getSampleAtBeat(beat + 0.5);
            if (syncopatedKick < totalSamples) {
              instEngine.renderAcousticKick(dL, dR, syncopatedKick, sampleRate, drumsProfile.kickVel * 0.8);
            }
          }
          
          const snarePos = localMeter === '3/4' ? 2 : (localMeter === '6/8' ? 3 : 2);
          if (barPos === snarePos) {
            instEngine.renderAcousticSnare(dL, dR, beatSample, sampleRate, drumsProfile.snareVel);
          }
          instEngine.renderAcousticHiHat(dL, dR, beatSample, false, sampleRate, drumsProfile.hihatVel);
          const eighth = timeline.getSampleAtBeat(beat + 0.5);
          if (eighth < totalSamples && (density >= 0.35 || drumsProfile.hihatVel > 0.6)) {
            instEngine.renderAcousticHiHat(dL, dR, eighth, false, sampleRate, drumsProfile.hihatVel * 0.75);
          }
        } else if (sec.type === 'pre_chorus') {
          if (barPos === 0 || barPos === 2) {
            instEngine.renderAcousticKick(dL, dR, beatSample, sampleRate, drumsProfile.kickVel);
          }
          if (barPos === 1 || barPos === 3) {
            instEngine.renderAcousticSnare(dL, dR, beatSample, sampleRate, drumsProfile.snareVel);
          }
          instEngine.renderAcousticHiHat(dL, dR, beatSample, false, sampleRate, drumsProfile.hihatVel);
        } else if (sec.type === 'chorus_hook' || sec.type === 'chorus_climax') {
          if (barPos === 0 || barPos === Math.floor(beatsPerBar / 2)) {
            instEngine.renderAcousticKick(dL, dR, beatSample, sampleRate, drumsProfile.kickVel);
          }
          const chorusSnarePos = localMeter === '3/4' ? 2 : (beatsPerBar === 4 ? (barPos === 1 || barPos === 3) : (barPos % 3 === 0 && barPos !== 0));
          if (chorusSnarePos) {
            instEngine.renderAcousticSnare(dL, dR, beatSample, sampleRate, drumsProfile.snareVel);
          }
          instEngine.renderAcousticHiHat(dL, dR, beatSample, false, sampleRate, drumsProfile.hihatVel);
          const eighth = timeline.getSampleAtBeat(beat + 0.5);
          if (eighth < totalSamples) {
            instEngine.renderAcousticHiHat(dL, dR, eighth, false, sampleRate, drumsProfile.hihatVel * 0.8);
          }
        } else if (sec.type === 'interlude') {
          if (barPos === 0 || barPos === 2) {
            instEngine.renderAcousticKick(dL, dR, beatSample, sampleRate, drumsProfile.kickVel);
          }
          if (barPos === 2) {
            instEngine.renderAcousticSnare(dL, dR, beatSample, sampleRate, drumsProfile.snareVel);
          }
          instEngine.renderAcousticHiHat(dL, dR, beatSample, true, sampleRate, drumsProfile.hihatVel);
        } else {
          if (barPos === 0) {
            instEngine.renderAcousticKick(dL, dR, beatSample, sampleRate, drumsProfile.kickVel * 0.85);
          }
          instEngine.renderAcousticHiHat(dL, dR, beatSample, false, sampleRate, drumsProfile.hihatVel * 0.7);
        }

        // Section Transition Fills
        if (isSectionEndBar && (density >= 0.5 || drumsProfile.fillIntensity > 0.4)) {
          instEngine.renderAcousticSnare(dL, dR, beatSample, sampleRate, Math.min(1.0, drumsProfile.snareVel * 1.1));
          const fill1 = timeline.getSampleAtBeat(beat + 0.5);
          const fill2 = timeline.getSampleAtBeat(beat + 0.75);
          if (fill1 < totalSamples) instEngine.renderAcousticSnare(dL, dR, fill1, sampleRate, drumsProfile.snareVel);
          if (fill2 < totalSamples) instEngine.renderAcousticKick(dL, dR, fill2, sampleRate, drumsProfile.kickVel);
        }

        barPos = (barPos + 1) % beatsPerBar;
      }

      tracks.push({
        id: `trk-drums-${Date.now()}`,
        name: 'Acoustic Studio Drums',
        type: 'drums',
        volume: 0.82,
        pan: 0,
        isMuted: false,
        isSolo: false,
        audioBuffer: drumBuffer,
        duration: totalDuration,
        color: '#f43f5e'
      });
    }

    // ----------------------------------------------------
    // STEM 3: ACOUSTIC & SUB BASSLINE (Sample-Accurate Harmonic Timing & Dynamic Articulation)
    // ----------------------------------------------------
    if (instSet.has('bass')) {
      const bassBuffer = createTrackBuffer();
      const bL = bassBuffer.getChannelData(0);
      const bR = bassBuffer.getChannelData(1);

      let bassPos = 0;
      let lastBassMeter = plan.meterMapByBeat[0] || plan.meter || '4/4';

      for (let beat = 0; beat < totalBeats; ) {
        const sec = getSectionAtBeat(beat);
        const chordRoot = getChordRootAtBeat(beat);
        const voicing = getVoicingAtBeat(beat);
        const currentMeter = plan.meterMapByBeat[Math.floor(beat)] || plan.meter || '4/4';
        const beatsPerBar = getBeatsPerBar(beat);

        if (beat > 0 && currentMeter !== lastBassMeter) {
          bassPos = 0;
        }
        lastBassMeter = currentMeter;

        // Determine contiguous harmonic segment (0.5 to 2.0 beats)
        let nextBeat = beat + 0.5;
        while (
          nextBeat < totalBeats &&
          (nextBeat - beat) < 2.0 &&
          getChordRootAtBeat(nextBeat) === chordRoot &&
          getVoicingAtBeat(nextBeat).chordType === voicing.chordType &&
          getSectionAtBeat(nextBeat).type === sec.type
        ) {
          nextBeat += 0.5;
        }
        const chordDurationBeats = nextBeat - beat;
        const chordSample = timeline.getSampleAtBeat(beat);
        const chordLenSamples = timeline.getDurationSamples(beat, nextBeat);
        const bassMidi = (voicing.bassOffset !== undefined ? plan.rootMidi + voicing.bassOffset : chordRoot) - 24;

        const bassProfile = expEngine.getBassProfile(beat, expressiveMap, sec.type);
        const v = Math.min(1.0, Math.max(0.4, bassProfile.velocity + getDeterministicVariation(beat, 2, 0.03)));

        if (sec.type === 'chorus_hook' || sec.type === 'chorus_climax') {
          const eighthLen = timeline.getDurationSamples(beat, beat + 0.5);
          
          if (bassPos === 0) {
            // Beat 1: Root
            instEngine.renderBassNote(bL, bR, chordSample, Math.floor(eighthLen * bassProfile.sustainScale * 0.9), bassMidi, v, sampleRate);
            
            // Beat 1-and (Syncopation): Octave jump
            if (chordDurationBeats >= 1.0) {
              const syncopatedSample = timeline.getSampleAtBeat(beat + 0.5);
              const syncLen = timeline.getDurationSamples(beat + 0.5, beat + 1.0);
              if (syncopatedSample < totalSamples) {
                instEngine.renderBassNote(bL, bR, syncopatedSample, Math.floor(syncLen * bassProfile.sustainScale * 0.8), bassMidi + 12, v * 0.82, sampleRate);
              }
            }
          } else {
            const isMidBar = bassPos === Math.floor(beatsPerBar / 2);
            instEngine.renderBassNote(bL, bR, chordSample, Math.floor(eighthLen * bassProfile.sustainScale * (isMidBar ? 1.5 : 1.0)), bassMidi, v * 0.9, sampleRate);
            
            if (bassPos === beatsPerBar - 2 && chordDurationBeats >= 2.0) {
              const approachSample = timeline.getSampleAtBeat(beat + 1.5);
              if (approachSample < totalSamples) {
                const nextRoot = beat + 2 < totalBeats ? getChordRootAtBeat(beat + 2) : chordRoot;
                const approachMidi = nextRoot > chordRoot ? (nextRoot - 24) - 1 : (nextRoot - 24) + 1;
                instEngine.renderBassNote(bL, bR, approachSample, Math.floor(eighthLen * bassProfile.sustainScale), approachMidi, v * 0.8, sampleRate);
              }
            }
          }
        } else if (sec.type === 'pre_chorus') {
          for (let b = 0; b < chordDurationBeats; b += 1.0) {
            const pBeat = beat + b;
            const pSample = timeline.getSampleAtBeat(pBeat);
            const pLen = timeline.getDurationSamples(pBeat, pBeat + 0.4);
            if (pSample < totalSamples) {
              instEngine.renderBassNote(bL, bR, pSample, Math.floor(pLen * bassProfile.sustainScale), bassMidi, v, sampleRate);
              const pushSample = timeline.getSampleAtBeat(pBeat + 0.75);
              const pushLen = timeline.getDurationSamples(pBeat + 0.75, pBeat + 1.0);
              if (pushSample < totalSamples) {
                instEngine.renderBassNote(bL, bR, pushSample, Math.floor(pushLen * bassProfile.sustainScale), bassMidi, v * 0.9, sampleRate);
              }
            }
          }
        } else {
          instEngine.renderBassNote(bL, bR, chordSample, Math.floor(chordLenSamples * bassProfile.sustainScale * 0.75), bassMidi, v, sampleRate);
          if (chordDurationBeats >= 2.0 && sec.type !== 'outro' && (bassPos === 2)) {
            const dropSample = timeline.getSampleAtBeat(beat + 1.5);
            const dropLen = timeline.getDurationSamples(beat + 1.5, beat + 2.0);
            if (dropSample < totalSamples) {
              instEngine.renderBassNote(bL, bR, dropSample, Math.floor(dropLen * bassProfile.sustainScale), bassMidi - 5, v * 0.85, sampleRate);
            }
          }
        }

        bassPos = (bassPos + chordDurationBeats) % beatsPerBar;
        beat = nextBeat;
      }

      tracks.push({
        id: `trk-bass-${Date.now()}`,
        name: 'Bassline (Acoustic & Sub)',
        type: 'bass',
        volume: 0.8,
        pan: 0,
        isMuted: false,
        isSolo: false,
        audioBuffer: bassBuffer,
        duration: totalDuration,
        color: '#10b981'
      });
    }

    // ----------------------------------------------------
    // STEM 4: ACOUSTIC GRAND PIANO (Sample-Accurate Harmonic Timing & Dynamic Articulation)
    // ----------------------------------------------------
    if (instSet.has('piano')) {
      const pianoBuffer = createTrackBuffer();
      const pL = pianoBuffer.getChannelData(0);
      const pR = pianoBuffer.getChannelData(1);

      for (let beat = 0; beat < totalBeats; ) {
        const sec = getSectionAtBeat(beat);
        const chordRoot = getChordRootAtBeat(beat);
        const voicing = getVoicingAtBeat(beat);
        
        let nextBeat = beat + 0.5;
        while (
          nextBeat < totalBeats &&
          (nextBeat - beat) < 2.0 &&
          getChordRootAtBeat(nextBeat) === chordRoot &&
          getVoicingAtBeat(nextBeat).chordType === voicing.chordType &&
          getSectionAtBeat(nextBeat).type === sec.type
        ) {
          nextBeat += 0.5;
        }
        const chordDurationBeats = nextBeat - beat;
        const chordSample = timeline.getSampleAtBeat(beat);
        const chordLenSamples = timeline.getDurationSamples(beat, nextBeat);

        const isMinor = voicing.chordType.includes('min') || (plan.scale === 'minor' && voicing.rootOffset === 0);
        const third = isMinor ? 3 : 4;
        
        const chordNotes = (voicing.midiNotes && voicing.midiNotes.length >= 3)
          ? voicing.midiNotes
          : [chordRoot, chordRoot + third, chordRoot + 7];
        const pianoBassMidi = voicing.bassOffset !== undefined
          ? plan.rootMidi + voicing.bassOffset - 12
          : (chordNotes[0] ? chordNotes[0] - 12 : chordRoot - 12);

        const pianoProfile = expEngine.getPianoProfile(beat, expressiveMap, sec.type);
        const pianoVel = Math.min(1.0, Math.max(0.4, pianoProfile.velocity + getDeterministicVariation(beat, 3, 0.03)));

        if (sec.type === 'intro') {
          chordNotes.forEach((nMidi, idx) => {
            const noteBeat = beat + idx * 0.5;
            if (noteBeat < nextBeat) {
              const nSample = timeline.getSampleAtBeat(noteBeat);
              const nLen = timeline.getDurationSamples(noteBeat, nextBeat);
              instEngine.renderPianoNote(pL, pR, nSample, Math.floor(nLen * pianoProfile.sustainScale), nMidi, pianoVel * 0.95, sampleRate, -0.15);
            }
          });
        } else if (sec.type === 'chorus_hook' || sec.type === 'chorus_climax') {
          instEngine.renderPianoNote(pL, pR, chordSample, Math.floor(chordLenSamples * pianoProfile.sustainScale), pianoBassMidi, pianoVel * 1.05, sampleRate, -0.2);
          chordNotes.forEach((nMidi, idx) => {
            const noteBeat = beat + idx * 0.33;
            if (noteBeat < nextBeat) {
              const nSample = timeline.getSampleAtBeat(noteBeat);
              const nLen = timeline.getDurationSamples(noteBeat, nextBeat);
              instEngine.renderPianoNote(pL, pR, nSample, Math.floor(nLen * pianoProfile.sustainScale), nMidi, pianoVel, sampleRate, -0.1);
            }
          });
        } else {
          chordNotes.forEach((nMidi, idx) => {
            const noteBeat = beat + idx * 0.5;
            if (noteBeat < nextBeat) {
              const nSample = timeline.getSampleAtBeat(noteBeat);
              const nLen = timeline.getDurationSamples(noteBeat, nextBeat);
              instEngine.renderPianoNote(pL, pR, nSample, Math.floor(nLen * pianoProfile.sustainScale), nMidi, pianoVel * 0.95, sampleRate, -0.15);
            }
          });
        }

        // Melody-Aware Piano Fill during silence gaps
        const pauseGap = isVocalPauseBeat(beat + chordDurationBeats);
        if (pauseGap && pauseGap.fillCapacity !== 'none' && sec.type !== 'intro') {
          const matchingIntent = plan.musicalIntent.phraseIntents.find(i => i.phraseId === pauseGap.afterPhraseId);
          const fillNotes = matchingIntent?.responseMotif || [chordRoot + 12 + 7, chordRoot + 12 + third, chordRoot + 12];
          
          fillNotes.forEach((fMidi, fIdx) => {
            const fBeat = beat + chordDurationBeats + fIdx * 0.45;
            const fSample = timeline.getSampleAtBeat(fBeat);
            const fLen = timeline.getDurationSamples(fBeat, fBeat + 1.5);
            if (fSample < totalSamples) {
              instEngine.renderPianoNote(pL, pR, fSample, fLen, fMidi, pianoProfile.fillVelocity, sampleRate, 0.1);
            }
          });
        }

        beat = nextBeat;
      }

      addExcitation(pianoBuffer, 0.6);
      AcousticRealismEngine.getInstance().applyAcousticBodyResonance(pL, pR, sampleRate, 0.55);
      tracks.push({
        id: `trk-piano-${Date.now()}`,
        name: 'Acoustic Grand Piano',
        type: 'piano',
        volume: 0.78,
        pan: -0.15,
        isMuted: false,
        isSolo: false,
        audioBuffer: pianoBuffer,
        duration: totalDuration,
        color: '#3b82f6'
      });
    }

    // ----------------------------------------------------
    // STEM 5: ACOUSTIC / ELECTRIC GUITAR (Sample-Accurate Texture & Dynamic Strumming)
    // ----------------------------------------------------
    if (instSet.has('guitar') || instSet.has('acoustic_guitar') || instSet.has('electric_guitar')) {
      const guitarBuffer = createTrackBuffer();
      const gL = guitarBuffer.getChannelData(0);
      const gR = guitarBuffer.getChannelData(1);
      const isElectric = instSet.has('electric_guitar');

      for (let beat = 0; beat < totalBeats; ) {
        const sec = getSectionAtBeat(beat);
        const chordRoot = getChordRootAtBeat(beat);
        const voicing = getVoicingAtBeat(beat);
        
        let nextBeat = beat + 0.5;
        while (
          nextBeat < totalBeats &&
          (nextBeat - beat) < 2.0 &&
          getChordRootAtBeat(nextBeat) === chordRoot &&
          getVoicingAtBeat(nextBeat).chordType === voicing.chordType &&
          getSectionAtBeat(nextBeat).type === sec.type
        ) {
          nextBeat += 0.5;
        }
        const chordDurationBeats = nextBeat - beat;
        const chordSample = timeline.getSampleAtBeat(beat);
        const chordLenSamples = timeline.getDurationSamples(beat, nextBeat);

        const isMinor = voicing.chordType.includes('min') || (plan.scale === 'minor' && voicing.rootOffset === 0);
        const third = isMinor ? 3 : 4;
        const guitarVoicing = (voicing.midiNotes && voicing.midiNotes.length >= 3)
          ? voicing.midiNotes
          : [chordRoot, chordRoot + third, chordRoot + 7];

        const guitarProfile = expEngine.getGuitarProfile(beat, expressiveMap, sec.type);
        const gVel = Math.min(1.0, Math.max(0.4, guitarProfile.strumVelocity + getDeterministicVariation(beat, 4, 0.03)));

        if (sec.type === 'intro' || sec.type === 'verse_mukhda' || sec.type === 'verse_antara') {
          if (isElectric) {
            instEngine.renderElectricGuitarNote(gL, gR, chordSample, chordLenSamples, guitarVoicing[0], gVel, sampleRate, 0.2);
          } else {
            instEngine.renderAcousticGuitarNote(gL, gR, chordSample, chordLenSamples, guitarVoicing[1] || guitarVoicing[0], gVel, sampleRate, 0.2);
            if (chordDurationBeats >= 1.5 && guitarVoicing.length > 1) {
              const eighth = timeline.getSampleAtBeat(beat + 1.5);
              const eighthLen = timeline.getDurationSamples(beat + 1.5, nextBeat);
              if (eighth < totalSamples) {
                instEngine.renderAcousticGuitarNote(gL, gR, eighth, eighthLen, guitarVoicing[guitarVoicing.length - 1], gVel * 0.9, sampleRate, 0.2);
              }
            }
          }
        } else if (sec.type === 'chorus_hook' || sec.type === 'chorus_climax') {
          if (isElectric) {
            instEngine.renderElectricGuitarNote(gL, gR, chordSample, chordLenSamples, guitarVoicing[0] + 12, gVel * 1.05, sampleRate, 0.25);
          } else {
            instEngine.renderAcousticGuitarNote(gL, gR, chordSample, chordLenSamples, guitarVoicing[0], gVel * 1.05, sampleRate, 0.22);
            if (chordDurationBeats >= 1.0 && guitarVoicing.length > 1) {
              const beat2Sample = timeline.getSampleAtBeat(beat + 1.0);
              const beat2Len = timeline.getDurationSamples(beat + 1.0, nextBeat);
              if (beat2Sample < totalSamples) {
                instEngine.renderAcousticGuitarNote(gL, gR, beat2Sample, beat2Len, guitarVoicing[1] || guitarVoicing[0], gVel, sampleRate, 0.22);
              }
            }
          }
        }

        beat = nextBeat;
      }

      addExcitation(guitarBuffer, 0.5);
      if (!isElectric) {
        AcousticRealismEngine.getInstance().applyAcousticBodyResonance(gL, gR, sampleRate, 0.65);
      }
      tracks.push({
        id: `trk-guitar-${Date.now()}`,
        name: isElectric ? 'Electric Lead Guitar' : 'Acoustic Folk Guitar',
        type: 'guitar',
        volume: 0.74,
        pan: 0.2,
        isMuted: false,
        isSolo: false,
        audioBuffer: guitarBuffer,
        duration: totalDuration,
        color: '#f59e0b'
      });
    }

    // ----------------------------------------------------
    // STEM 6: SYMPHONIC STRINGS ENSEMBLE (Sample-Accurate Pads & Dynamic Swells)
    // ----------------------------------------------------
    if (instSet.has('strings') || instSet.has('violin') || instSet.has('pad')) {
      const stringsBuffer = createTrackBuffer();
      const sL = stringsBuffer.getChannelData(0);
      const sR = stringsBuffer.getChannelData(1);

      for (let beat = 0; beat < totalBeats; ) {
        const sec = getSectionAtBeat(beat);
        const chordRoot = getChordRootAtBeat(beat);
        const voicing = getVoicingAtBeat(beat);
        
        let nextBeat = beat + 0.5;
        while (
          nextBeat < totalBeats &&
          (nextBeat - beat) < 2.0 &&
          getChordRootAtBeat(nextBeat) === chordRoot &&
          getVoicingAtBeat(nextBeat).chordType === voicing.chordType &&
          getSectionAtBeat(nextBeat).type === sec.type
        ) {
          nextBeat += 0.5;
        }
        const chordSample = timeline.getSampleAtBeat(beat);
        const chordLenSamples = timeline.getDurationSamples(beat, nextBeat);

        const isMinor = voicing.chordType.includes('min') || (plan.scale === 'minor' && voicing.rootOffset === 0);
        const third = isMinor ? 3 : 4;
        const stringTriad = (voicing.midiNotes && voicing.midiNotes.length >= 3)
          ? voicing.midiNotes.map(n => n + 12)
          : [chordRoot + 12, chordRoot + 12 + third, chordRoot + 19];

        const isPeak = isEmotionalPeakBeat(beat);
        const density = getDensityAtBeat(beat);
        const stringsProfile = expEngine.getStringsProfile(beat, expressiveMap, sec.type);

        if (stringsProfile.densityAllowed && (density >= 0.55 || sec.type === 'pre_chorus' || sec.type === 'chorus_hook' || sec.type === 'chorus_climax' || isPeak)) {
          const stringVelocity = Math.min(1.0, Math.max(0.35, (stringsProfile.velocity * stringsProfile.swellGain) + getDeterministicVariation(beat, 5, 0.02)));
          stringTriad.forEach(nMidi => {
            instEngine.renderStringsNote(
              sL,
              sR,
              chordSample,
              chordLenSamples,
              nMidi,
              stringVelocity,
              sampleRate,
              -0.25
            );
          });
        }

        beat = nextBeat;
      }

      addExcitation(stringsBuffer, 0.4);
      tracks.push({
        id: `trk-strings-${Date.now()}`,
        name: 'Symphonic Strings Ensemble',
        type: 'strings',
        volume: 0.72,
        pan: -0.25,
        isMuted: false,
        isSolo: false,
        audioBuffer: stringsBuffer,
        duration: totalDuration,
        color: '#8b5cf6'
      });
    }

    // ----------------------------------------------------
    // STEM 7: WOODWIND FLUTE / SYNTH (Microtonal Call-and-Response & Interludes)
    // ----------------------------------------------------
    if (instSet.has('flute') || instSet.has('synth') || instSet.has('lead')) {
      const leadBuffer = createTrackBuffer();
      const lL = leadBuffer.getChannelData(0);
      const lR = leadBuffer.getChannelData(1);
      const isFlute = instSet.has('flute');
      const hookMotif = plan.musicalIntent.hookMotif;

      for (let beat = 0; beat < totalBeats; ) {
        const sec = getSectionAtBeat(beat);
        const chordRoot = getChordRootAtBeat(beat);
        const voicing = getVoicingAtBeat(beat);
        
        let nextBeat = beat + 0.5;
        while (
          nextBeat < totalBeats &&
          (nextBeat - beat) < 2.0 &&
          getChordRootAtBeat(nextBeat) === chordRoot &&
          getVoicingAtBeat(nextBeat).chordType === voicing.chordType &&
          getSectionAtBeat(nextBeat).type === sec.type
        ) {
          nextBeat += 0.5;
        }
        const chordDurationBeats = nextBeat - beat;
        const isMinor = voicing.chordType.includes('min') || (plan.scale === 'minor' && voicing.rootOffset === 0);
        const third = isMinor ? 3 : 4;
        const fluteProfile = expEngine.getFluteProfile(beat, expressiveMap, sec.type);

        if (sec.type === 'intro' && beat < introBeats - 2) {
          const introMotif = hookMotif?.pitchSequenceMidi && hookMotif.pitchSequenceMidi.length >= 3
            ? hookMotif.pitchSequenceMidi
            : [chordRoot + 12, chordRoot + 12 + third, chordRoot + 19, chordRoot + 24];

          introMotif.forEach((mMidi, mIdx) => {
            const mBeat = beat + mIdx * 0.75;
            const mSample = timeline.getSampleAtBeat(mBeat);
            const mLen = timeline.getDurationSamples(mBeat, mBeat + 0.9);
            if (mSample < totalSamples) {
              if (isFlute) {
                instEngine.renderFluteNote(lL, lR, mSample, mLen, mMidi, fluteProfile.fillVelocity * 0.95, sampleRate, 0.15);
              } else {
                instEngine.renderSynthNote(lL, lR, mSample, mLen, mMidi, fluteProfile.fillVelocity * 0.95, sampleRate, 0.0);
              }
            }
          });
        } else if (sec.type === 'interlude') {
          const soloMotif = hookMotif?.pitchSequenceMidi && hookMotif.pitchSequenceMidi.length >= 3
            ? [hookMotif.pitchSequenceMidi[0] + 12, hookMotif.pitchSequenceMidi[1] + 12, hookMotif.pitchSequenceMidi[2] + 12, chordRoot + 12]
            : [chordRoot + 12 + 7, chordRoot + 12 + third, chordRoot + 12 + 2, chordRoot + 12];

          soloMotif.forEach((sMidi, sIdx) => {
            const sBeat = beat + sIdx * 0.8;
            const sSample = timeline.getSampleAtBeat(sBeat);
            const sLen = timeline.getDurationSamples(sBeat, sBeat + 1.1);
            if (sSample < totalSamples) {
              if (isFlute) {
                instEngine.renderFluteNote(lL, lR, sSample, sLen, sMidi, fluteProfile.fillVelocity, sampleRate, 0.15);
              } else {
                instEngine.renderSynthNote(lL, lR, sSample, sLen, sMidi, fluteProfile.fillVelocity, sampleRate, 0.0);
              }
            }
          });
        } else {
          // Melody-Aware Call-and-Response answering the singer during vocal pauses
          const pauseGap = isVocalPauseBeat(beat + 1);
          if (pauseGap && pauseGap.fillCapacity !== 'none') {
            const matchingIntent = plan.musicalIntent.phraseIntents.find(i => i.phraseId === pauseGap.afterPhraseId);
            const respNotes = matchingIntent?.responseMotif || (
              pauseGap.fillCapacity === 'two_bar_phrase' 
                ? [chordRoot + 12 + 7, chordRoot + 12 + third, chordRoot + 12 + 2, chordRoot + 12]
                : [chordRoot + 12 + third, chordRoot + 12 + 7]
            );

            // Extract microtonal contour from preceding phrase (P0.5 & P0.6)
            const precedingPhrase = plan.vocalMap.phrases.find(p => p.id === pauseGap.afterPhraseId);
            const pitchContour = precedingPhrase ? plan.vocalMap.pitchContourByBeat.slice(precedingPhrase.startBeat, precedingPhrase.endBeat).flat() : undefined;

            respNotes.forEach((rMidi, rIdx) => {
              const rBeat = beat + 1 + rIdx * 0.6;
              const rSample = timeline.getSampleAtBeat(rBeat);
              const rLen = timeline.getDurationSamples(rBeat, rBeat + 1.2);
              const noteBends = generatePitchBendCurve(pitchContour, rLen);

              if (rSample < totalSamples) {
                if (isFlute) {
                  instEngine.renderFluteNote(lL, lR, rSample, rLen, rMidi, fluteProfile.fillVelocity, sampleRate, 0.15, noteBends);
                } else {
                  instEngine.renderSynthNote(lL, lR, rSample, rLen, rMidi, fluteProfile.fillVelocity, sampleRate, 0.0);
                }
              }
            });
          }
        }

        beat = nextBeat;
      }

      addExcitation(leadBuffer, 0.7);
      tracks.push({
        id: `trk-lead-${Date.now()}`,
        name: isFlute ? 'Melodic Woodwind Flute' : 'Analog Poly Synth',
        type: isFlute ? 'flute' : 'synth',
        volume: 0.72,
        pan: 0.15,
        isMuted: false,
        isSolo: false,
        audioBuffer: leadBuffer,
        duration: totalDuration,
        color: '#06b6d4'
      });
    }

    // ----------------------------------------------------
    // STEM 8: HARMONIUM (Sample-Accurate Indian Chordal Foundation & Dynamic Expression)
    // ----------------------------------------------------
    if (instSet.has('harmonium')) {
      const harmBuffer = createTrackBuffer();
      const hL = harmBuffer.getChannelData(0);
      const hR = harmBuffer.getChannelData(1);

      for (let beat = 0; beat < totalBeats; ) {
        const chordRoot = getChordRootAtBeat(beat);
        const voicing = getVoicingAtBeat(beat);
        
        let nextBeat = beat + 0.5;
        while (
          nextBeat < totalBeats &&
          (nextBeat - beat) < 4.0 &&
          getChordRootAtBeat(nextBeat) === chordRoot &&
          getVoicingAtBeat(nextBeat).chordType === voicing.chordType
        ) {
          nextBeat += 0.5;
        }
        const chordSample = timeline.getSampleAtBeat(beat);
        const chordLenSamples = timeline.getDurationSamples(beat, nextBeat);

        const isMinor = voicing.chordType.includes('min');
        const third = isMinor ? 3 : 4;

        const harmProfile = expEngine.getHarmoniumProfile(beat, expressiveMap);
        const harmVel = Math.min(1.0, Math.max(0.3, harmProfile.velocity * harmProfile.dynamicGain));

        const notes = (voicing.midiNotes && voicing.midiNotes.length >= 3)
          ? voicing.midiNotes
          : [chordRoot, chordRoot + third, chordRoot + 7];
        notes.forEach(nMidi => {
          instEngine.renderHarmonium(
            hL,
            hR,
            chordSample,
            chordLenSamples,
            nMidi,
            harmVel,
            sampleRate
          );
        });

        beat = nextBeat;
      }

      addExcitation(harmBuffer, 0.9);
      tracks.push({
        id: `trk-harmonium-${Date.now()}`,
        name: 'Harmonium Reed Support',
        type: 'harmonium',
        volume: 0.65,
        pan: -0.15,
        isMuted: false,
        isSolo: false,
        audioBuffer: harmBuffer,
        duration: totalDuration,
        color: '#d97706'
      });
    }

    // ----------------------------------------------------
    // STEM 9: MELODIC SITAR (Microtonal Nuance & Inter-Track Resonance)
    // Rendered last to capture all melodic excitation for resonance
    // ----------------------------------------------------
    if (instSet.has('sitar')) {
      const sitarBuffer = createTrackBuffer();
      const sL = sitarBuffer.getChannelData(0);
      const sR = sitarBuffer.getChannelData(1);

      for (let beat = 0; beat < totalBeats; ) {
        const sec = getSectionAtBeat(beat);
        const chordRoot = getChordRootAtBeat(beat);
        const voicing = getVoicingAtBeat(beat);
        
        let nextBeat = beat + 0.5;
        while (
          nextBeat < totalBeats &&
          (nextBeat - beat) < 2.0 &&
          getChordRootAtBeat(nextBeat) === chordRoot &&
          getVoicingAtBeat(nextBeat).chordType === voicing.chordType &&
          getSectionAtBeat(nextBeat).type === sec.type
        ) {
          nextBeat += 0.5;
        }
        const chordSample = timeline.getSampleAtBeat(beat);
        const sitarProfile = expEngine.getSitarProfile(beat, expressiveMap, sec.type);

        const pauseGap = isVocalPauseBeat(beat + 1);
        if (sec.type === 'interlude' || (pauseGap && pauseGap.fillCapacity !== 'none')) {
          const matchingIntent = plan.musicalIntent.phraseIntents.find(i => i.phraseId === (pauseGap?.afterPhraseId ?? -1));
          const respNotes = matchingIntent?.responseMotif || [chordRoot + 12, chordRoot + 12 + 7, chordRoot + 12 + 2, chordRoot + 12];
          
          // Microtonal Expression mirroring singer (P0.5 & P0.6)
          const precedingPhrase = plan.vocalMap.phrases.find(p => p.id === pauseGap?.afterPhraseId);
          const pitchContour = precedingPhrase ? plan.vocalMap.pitchContourByBeat.slice(precedingPhrase.startBeat, precedingPhrase.endBeat).flat() : undefined;

          respNotes.forEach((rMidi, rIdx) => {
            const rBeat = beat + 1 + rIdx * 0.6;
            const noteStart = timeline.getSampleAtBeat(rBeat);
            const noteLen = timeline.getDurationSamples(rBeat, rBeat + 1.5);
            const noteBends = generatePitchBendCurve(pitchContour, noteLen);

            if (noteStart < totalSamples) {
              instEngine.renderSitar(
                sL,
                sR,
                noteStart,
                noteLen,
                rMidi,
                sitarProfile.leadVelocity,
                sampleRate,
                noteBends
              );
            }
          });
        } else if (getDensityAtBeat(beat) > 0.7 && sitarProfile.chikariAllowed) {
          // Rhythmic chikari stroke
          instEngine.renderSitar(sL, sR, chordSample, timeline.getDurationSamples(beat, beat + 0.2), chordRoot + 24, sitarProfile.leadVelocity * 0.75, sampleRate);
        }

        beat = nextBeat;
      }

      // Inter-Track Shared Sympathetic Resonance (Tarab)
      const isMinorScale = plan.vocalMap.scale === 'minor';
      const ragaScale = isMinorScale ? [0, 2, 3, 5, 7, 8, 10] : [0, 2, 4, 5, 7, 9, 11];
      const tarabMidis = ragaScale.map(offset => plan.rootMidi + offset);
      tarabMidis.push(plan.rootMidi + 12);
      
      instEngine.applySitarResonance(sL, sR, sampleRate, tarabMidis, melodicExcitationL, melodicExcitationR);

      tracks.push({
        id: `trk-sitar-${Date.now()}`,
        name: 'Classical Sitar Lead',
        type: 'sitar',
        volume: 0.75,
        pan: 0.2,
        isMuted: false,
        isSolo: false,
        audioBuffer: sitarBuffer,
        duration: totalDuration,
        color: '#f59e0b'
      });
    }

    return { tracks, totalDuration };
  }
}
