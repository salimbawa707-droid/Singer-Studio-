/**
 * MUSICBASE / SURGE STUDIO
 * Musical Intent Engine (Phase 4)
 * 
 * Determines what the vocal requires musically:
 * LISTEN → UNDERSTAND → INTERPRET → COMPOSE → ARRANGE → HUMANIZE → MIX
 * 
 * Evaluates:
 * - Emotional character per phrase/section ('intimate' | 'rising' | 'climactic' | 'resolving' | 'reflective' | 'energetic')
 * - Harmonic tension & harmonic stability
 * - Melodic importance & accompaniment density
 * - Likely chord movement (harmonic direction)
 * - Instrument roles: PIANO, GUITAR, STRINGS, FLUTE, BASS, DRUMS, SYNTH
 *   with Action: 'play' | 'rest' | 'enter' | 'exit' | 'build' | 'reduce'
 * - Melody-aware Call-and-Response deriving responses directly from vocal intervals/motifs
 * - SongArrangementMemory tracking previously introduced motifs, instrument entrances, harmonic themes, density history
 * 
 * 100% Offline-First, Deterministic & Web Audio API Powered.
 */

import { 
  VocalSongMap, 
  DeepVocalPhrase, 
  VocalSilenceGap, 
  DetectedVocalNote, 
  SongMotifMap 
} from './vocalUnderstandingEngine';
import { ArrangementStyle, EnergyLevel } from './intelligentArrangementEngine';
import { LyricalSemanticAnalysis, LyricalPhraseSemantic } from './languageUnderstandingEngine';

export type EmotionalCharacter = 
  | 'intimate' 
  | 'rising' 
  | 'climactic' 
  | 'resolving' 
  | 'reflective' 
  | 'energetic'
  | 'devotional'
  | 'melancholic'
  | 'celebratory';

export type InstrumentAction = 
  | 'play' 
  | 'rest' 
  | 'enter' 
  | 'exit' 
  | 'build' 
  | 'reduce';

export interface InstrumentRoleAssignment {
  instrument: string;
  action: InstrumentAction;
  density: number; // 0.0 to 1.0
  texture: string; // descriptive role texture
  dynamic: number; // velocity multiplier 0.0 to 1.0
  registerOffsetOctaves?: number;
}

export interface PhraseMusicalIntent {
  phraseId: number;
  startBeat: number;
  endBeat: number;
  emotionalCharacter: EmotionalCharacter;
  harmonicTension: number; // 0.0 (stable) to 1.0 (high tension)
  harmonicStability: number; // 0.0 (unresolved) to 1.0 (resolved)
  melodicImportance: number; // 0.0 to 1.0
  accompanimentDensity: number; // 0.0 (sparse) to 1.0 (full)
  likelyChordMovement: 'tonic_anchor' | 'subdominant_lift' | 'dominant_tension' | 'cadential_resolution' | 'minor_sorrow' | 'modal_shift';
  instrumentRoles: Record<string, InstrumentRoleAssignment>;
  leaveSpace: boolean;
  introduceFill: boolean;
  shouldBuild: boolean;
  shouldResolve: boolean;
  responseMotif?: number[]; // Melody-aware response MIDI note sequence
  lyricalSemantic?: LyricalPhraseSemantic; // Phase 21 Multilingual Semantic Integration
}

export interface SongArrangementMemory {
  introducedMotifs: string[];
  instrumentEntrances: { instrument: string; startBeat: number }[];
  harmonicThemes: string[];
  rhythmicThemes: string[];
  densityHistory: number[];
  previousSectionEnergy: number;
  primaryHookMotif?: SongMotifMap;
}

export interface MusicalIntentResult {
  phraseIntents: PhraseMusicalIntent[];
  arrangementMemory: SongArrangementMemory;
  dominantFeel: EmotionalCharacter;
  avgDensity: number;
  climaxBeat: number;
  hookMotif?: SongMotifMap;
  semanticAnalysis?: LyricalSemanticAnalysis;
}

const SCALE_DEGREES_MAJOR = [0, 2, 4, 5, 7, 9, 11];
const SCALE_DEGREES_MINOR = [0, 2, 3, 5, 7, 8, 10];

export class MusicalIntentEngine {
  private static instance: MusicalIntentEngine;

  public static getInstance(): MusicalIntentEngine {
    if (!MusicalIntentEngine.instance) {
      MusicalIntentEngine.instance = new MusicalIntentEngine();
    }
    return MusicalIntentEngine.instance;
  }

  /**
   * Evaluates deep musical intent for the vocal performance, fusing acoustic features with
   * multilingual semantic lyrical understanding
   */
  public analyzeMusicalIntent(
    vocalMap: VocalSongMap,
    style: ArrangementStyle = 'romantic',
    energy: EnergyLevel = 'balanced',
    selectedInstruments: string[] = ['Piano', 'Acoustic Guitar', 'Bass', 'Drums', 'Strings', 'Flute'],
    semanticAnalysis?: LyricalSemanticAnalysis | null
  ): MusicalIntentResult {
    const instList = selectedInstruments.map(i => i.toLowerCase());
    const phraseIntents: PhraseMusicalIntent[] = [];
    const memory: SongArrangementMemory = {
      introducedMotifs: [],
      instrumentEntrances: [],
      harmonicThemes: [],
      rhythmicThemes: [],
      densityHistory: [],
      previousSectionEnergy: 0.3
    };

    // Find Primary Hook Motif if present
    const hookMotif = vocalMap.motifs.find(m => m.confidence >= 0.8) || vocalMap.motifs[0];
    if (hookMotif) {
      memory.primaryHookMotif = hookMotif;
      memory.introducedMotifs.push(hookMotif.motifId);
    }

    let climaxBeat = 0;
    let maxIntensity = 0;

    // Track instrument states
    const activeInstruments = new Set<string>();

    const numPhrases = vocalMap.phrases.length;

    for (let pIdx = 0; pIdx < numPhrases; pIdx++) {
      const phrase = vocalMap.phrases[pIdx];
      const isFirstPhrase = pIdx === 0;
      const isLastPhrase = pIdx === numPhrases - 1;
      const isPeak = vocalMap.emotionalPeaks.some(peak => Math.abs(peak.beat - phrase.startBeat) <= 4);

      // Find matching semantic phrase if available
      const semanticPhrase = semanticAnalysis?.phrases ? semanticAnalysis.phrases[Math.min(pIdx, semanticAnalysis.phrases.length - 1)] : undefined;

      if (phrase.peakEnergy > maxIntensity) {
        maxIntensity = phrase.peakEnergy;
        climaxBeat = phrase.startBeat;
      }

      // 1. Determine Emotional Character (Combining Acoustic + Semantic evidence)
      let emotionalCharacter: EmotionalCharacter = 'intimate';

      if (semanticPhrase && semanticPhrase.primaryEmotion === 'devotion') {
        emotionalCharacter = 'devotional';
      } else if (semanticPhrase && (semanticPhrase.primaryEmotion === 'celebration' || semanticPhrase.primaryEmotion === 'happiness')) {
        emotionalCharacter = 'celebratory';
      } else if (semanticPhrase && (semanticPhrase.primaryEmotion === 'heartbreak' || semanticPhrase.primaryEmotion === 'sadness' || semanticPhrase.primaryEmotion === 'melancholy')) {
        emotionalCharacter = 'melancholic';
      } else if (phrase.isHighPitch && phrase.isHighIntensity) {
        emotionalCharacter = 'climactic';
      } else if (phrase.hasCrescendo || phrase.melodicDirection === 'rising') {
        emotionalCharacter = 'rising';
      } else if (phrase.landingMidi % 12 === 0 || phrase.hasDecrescendo) {
        emotionalCharacter = 'resolving';
      } else if (phrase.avgEnergy > 0.6) {
        emotionalCharacter = 'energetic';
      } else if (phrase.avgEnergy < 0.35) {
        emotionalCharacter = 'intimate';
      } else {
        emotionalCharacter = 'reflective';
      }

      // 2. Harmonic Tension & Stability
      let harmonicTension = phrase.tensionLevel;
      let harmonicStability = phrase.resolutionLevel;

      if (semanticPhrase) {
        if (semanticPhrase.primaryEmotion === 'heartbreak' || semanticPhrase.primaryEmotion === 'intensity') {
          harmonicTension = Math.min(1.0, harmonicTension + 0.25);
          harmonicStability = Math.max(0.0, harmonicStability - 0.2);
        } else if (semanticPhrase.primaryEmotion === 'devotion' || semanticPhrase.primaryEmotion === 'calmness') {
          harmonicTension = Math.max(0.1, harmonicTension - 0.2);
          harmonicStability = Math.min(1.0, harmonicStability + 0.3);
        }
      }

      // 3. Melodic Importance (high vocal syllabic density means accompaniment must simplify)
      const syllabicPacing = semanticPhrase ? semanticPhrase.phonetics.syllableDensity : phrase.syllabicDensity;
      const melodicImportance = Math.min(1.0, syllabicPacing / 3.0 * 0.5 + phrase.avgEnergy * 0.5);

      // 4. Accompaniment Density determination
      let accompanimentDensity = 0.45;
      if (emotionalCharacter === 'intimate' || emotionalCharacter === 'reflective') {
        accompanimentDensity = 0.28;
      } else if (emotionalCharacter === 'melancholic') {
        accompanimentDensity = 0.25; // Sparse, poignant room for sorrow
      } else if (emotionalCharacter === 'devotional') {
        accompanimentDensity = 0.50; // Grounded, continuous harmonium drone support
      } else if (emotionalCharacter === 'celebratory') {
        accompanimentDensity = 0.85; // Full rhythmic percussion
      } else if (emotionalCharacter === 'rising') {
        accompanimentDensity = 0.55;
      } else if (emotionalCharacter === 'climactic') {
        accompanimentDensity = 0.88;
      } else if (emotionalCharacter === 'resolving') {
        accompanimentDensity = 0.38;
      } else {
        accompanimentDensity = 0.65;
      }

      if (energy === 'soft') accompanimentDensity *= 0.8;
      if (energy === 'powerful') accompanimentDensity = Math.min(1.0, accompanimentDensity * 1.2);

      // 5. Likely Harmonic Movement
      let likelyChordMovement: 'tonic_anchor' | 'subdominant_lift' | 'dominant_tension' | 'cadential_resolution' | 'minor_sorrow' | 'modal_shift' = 'tonic_anchor';
      
      if (emotionalCharacter === 'devotional') {
        likelyChordMovement = 'modal_shift';
      } else if (emotionalCharacter === 'melancholic') {
        likelyChordMovement = 'minor_sorrow';
      } else if (isFirstPhrase || emotionalCharacter === 'resolving') {
        likelyChordMovement = 'cadential_resolution';
      } else if (isPeak || emotionalCharacter === 'climactic' || (semanticPhrase && semanticPhrase.primaryEmotion === 'romance')) {
        likelyChordMovement = 'subdominant_lift';
      } else if (harmonicTension > 0.6) {
        likelyChordMovement = 'dominant_tension';
      } else if (vocalMap.scale === 'minor') {
        likelyChordMovement = 'minor_sorrow';
      }

      // 6. Instrument Role Assignments (PLAY / REST / ENTER / EXIT / BUILD / REDUCE)
      const instrumentRoles: Record<string, InstrumentRoleAssignment> = {};

      instList.forEach(inst => {
        let action: InstrumentAction = 'play';
        let density = accompanimentDensity;
        let texture = 'Foundation chord support';
        let dynamic = 0.75;

        if (inst.includes('piano')) {
          if (emotionalCharacter === 'intimate' || emotionalCharacter === 'reflective' || emotionalCharacter === 'melancholic') {
            action = 'play';
            texture = 'Sparse, delicate arpeggio with high register air';
            dynamic = 0.60;
            density = 0.25;
          } else if (emotionalCharacter === 'climactic' || emotionalCharacter === 'celebratory') {
            action = 'play';
            texture = 'Full two-handed grand voicing with octave bass anchors';
            dynamic = 0.92;
            density = 0.9;
          } else {
            action = 'play';
            texture = 'Rhythmic harmonic foundation leaving vocal pocket clear';
            dynamic = 0.78;
          }
        } else if (inst.includes('guitar')) {
          if (emotionalCharacter === 'intimate' || emotionalCharacter === 'melancholic') {
            action = 'play';
            texture = 'Gentle fingerpicked counter-texture';
            dynamic = 0.58;
          } else if (emotionalCharacter === 'climactic' || emotionalCharacter === 'celebratory') {
            action = 'play';
            texture = 'Full acoustic strumming body';
            dynamic = 0.85;
          } else {
            action = 'play';
            texture = 'Rhythmic muted acoustic pluck';
            dynamic = 0.72;
          }
        } else if (inst.includes('strings') || inst.includes('violin') || inst.includes('pad')) {
          if ((emotionalCharacter === 'intimate' && isFirstPhrase) || emotionalCharacter === 'devotional') {
            action = 'rest'; // Keep strings out in devotional/intimate start to preserve authentic space
            texture = 'Resting to preserve vocal and acoustic space';
            dynamic = 0;
            density = 0;
          } else if (emotionalCharacter === 'rising' || isPeak || (semanticPhrase && semanticPhrase.primaryEmotion === 'romance')) {
            action = 'enter';
            texture = 'Rising symphonic string swell supporting vocal lift';
            dynamic = 0.86;
            density = 0.75;
          } else if (emotionalCharacter === 'climactic') {
            action = 'play';
            texture = 'Grand symphonic ensemble sustaining emotional power';
            dynamic = 0.92;
            density = 0.95;
          } else if (emotionalCharacter === 'melancholic') {
            action = 'play';
            texture = 'Expressive sustained minor violin weeping line';
            dynamic = 0.65;
            density = 0.4;
          } else {
            action = 'play';
            texture = 'Warm harmonic pad supporting chord changes';
            dynamic = 0.68;
            density = 0.5;
          }
        } else if (inst.includes('flute') || inst.includes('synth') || inst.includes('lead')) {
          if (phrase.duration >= 1.5) {
            action = 'reduce';
            texture = 'Subtle background counterpoint avoiding vocal collision';
            dynamic = 0.45;
            density = 0.2;
          } else {
            action = 'play';
            texture = emotionalCharacter === 'melancholic' 
              ? 'Lyrical sorrowful flute response' 
              : 'Warm lyrical call-and-response lead';
            dynamic = 0.7;
          }
        } else if (inst.includes('sitar')) {
          if (emotionalCharacter === 'climactic' || isPeak) {
            action = 'play';
            texture = 'Fast, virtuosic melodic runs (Taans) mirroring vocal peaks';
            dynamic = 0.9;
            density = 0.85;
          } else if (emotionalCharacter === 'devotional' || emotionalCharacter === 'melancholic') {
            action = 'play';
            texture = 'Meend microtonal glissandos and Tarab sympathetic resonance';
            dynamic = 0.78;
            density = 0.6;
          } else {
            action = 'play';
            texture = 'Gentle melodic ornamentation and sympathetic string resonance';
            dynamic = 0.7;
            density = 0.45;
          }
        } else if (inst.includes('harmonium')) {
          if (emotionalCharacter === 'devotional') {
            action = 'play';
            texture = 'Rich continuous reed drone and sacred modal harmonium chords';
            dynamic = 0.82;
            density = 0.85;
          } else {
            action = 'play';
            texture = 'Warm reedy drone and chordal support';
            dynamic = 0.65;
            density = 0.6;
          }
        } else if (inst.includes('tabla')) {
          if (emotionalCharacter === 'intimate' || emotionalCharacter === 'melancholic') {
            action = 'reduce';
            texture = 'Subtle soft Theka strokes with gentle Bayun pitch modulations';
            dynamic = 0.55;
            density = 0.35;
          } else if (emotionalCharacter === 'celebratory') {
            action = 'play';
            texture = 'Energetic Dha-Ge-Na-Ti-Na-Ka-Dhi-Na Bollywood Bhangra/Folk Theka';
            dynamic = 0.92;
            density = 0.9;
          } else {
            action = 'play';
            texture = 'Authentic Keherwa / Dadra Theka groove with active Bayun bass drops';
            dynamic = 0.78;
            density = 0.65;
          }
        } else if (inst.includes('bass')) {
          if (emotionalCharacter === 'intimate' && isFirstPhrase) {
            action = 'reduce';
            texture = 'Deep gentle sub pulse';
            dynamic = 0.6;
          } else if (emotionalCharacter === 'climactic' || emotionalCharacter === 'celebratory') {
            action = 'play';
            texture = 'Active walking bassline moving root to 5th';
            dynamic = 0.9;
          } else {
            action = 'play';
            texture = 'Sustained root pulse anchoring harmonic key';
            dynamic = 0.8;
          }
        } else if (inst.includes('drums') || inst.includes('percussion')) {
          if (emotionalCharacter === 'intimate' || emotionalCharacter === 'melancholic' || isFirstPhrase) {
            action = 'reduce';
            texture = 'Minimal soft hi-hat pulse only, no heavy kicks';
            dynamic = 0.5;
            density = 0.2;
          } else if (emotionalCharacter === 'rising') {
            action = 'build';
            texture = 'Building 8th-note kick and snare crescendo into drop';
            dynamic = 0.85;
            density = 0.75;
          } else if (emotionalCharacter === 'climactic' || emotionalCharacter === 'celebratory') {
            action = 'play';
            texture = 'Full acoustic studio groove with syncopated kicks';
            dynamic = 0.95;
            density = 0.9;
          } else {
            action = 'play';
            texture = 'Clean acoustic pocket groove';
            dynamic = 0.75;
            density = 0.5;
          }
        }

        // Track entrance in memory
        if (action === 'enter' && !activeInstruments.has(inst)) {
          memory.instrumentEntrances.push({ instrument: inst, startBeat: phrase.startBeat });
          activeInstruments.add(inst);
        }

        instrumentRoles[inst] = {
          instrument: inst,
          action,
          density,
          texture,
          dynamic
        };
      });

      // 7. Melody-Aware Call-and-Response generation for subsequent silence gap
      const matchingGap = vocalMap.silenceGaps.find(g => g.afterPhraseId === phrase.id);
      let responseMotif: number[] | undefined;
      if (matchingGap && matchingGap.duration >= 0.7) {
        responseMotif = this.generateMelodyAwareResponse(
          phrase,
          vocalMap.key,
          vocalMap.scale,
          matchingGap.duration
        );
      }

      const intent: PhraseMusicalIntent = {
        phraseId: phrase.id,
        startBeat: phrase.startBeat,
        endBeat: phrase.endBeat,
        emotionalCharacter,
        harmonicTension,
        harmonicStability,
        melodicImportance,
        accompanimentDensity,
        likelyChordMovement,
        instrumentRoles,
        leaveSpace: phrase.syllabicDensity > 2.5 || (semanticPhrase?.phonetics.consonantDensity || 0) > 0.6,
        introduceFill: matchingGap ? matchingGap.duration >= 1.2 : false,
        shouldBuild: emotionalCharacter === 'rising' || (phrase.hasCrescendo && !isLastPhrase),
        shouldResolve: emotionalCharacter === 'resolving' || isLastPhrase,
        responseMotif,
        lyricalSemantic: semanticPhrase
      };

      phraseIntents.push(intent);
      memory.densityHistory.push(accompanimentDensity);
    }

    const avgDensity = memory.densityHistory.length > 0 
      ? memory.densityHistory.reduce((a, b) => a + b, 0) / memory.densityHistory.length 
      : 0.5;

    let dominantFeel: EmotionalCharacter = 'intimate';
    if (semanticAnalysis?.dominantEmotion === 'devotion') dominantFeel = 'devotional';
    else if (semanticAnalysis?.dominantEmotion === 'celebration' || semanticAnalysis?.dominantEmotion === 'happiness') dominantFeel = 'celebratory';
    else if (semanticAnalysis?.dominantEmotion === 'heartbreak' || semanticAnalysis?.dominantEmotion === 'sadness') dominantFeel = 'melancholic';
    else if (maxIntensity > 0.8) dominantFeel = 'climactic';

    return {
      phraseIntents,
      arrangementMemory: memory,
      dominantFeel,
      avgDensity,
      climaxBeat,
      hookMotif,
      semanticAnalysis: semanticAnalysis || undefined
    };
  }

  /**
   * Section 7: Melody-Aware Call-and-Response
   * Generates a musical response that:
   * - References the vocal phrase's exact pitch intervals
   * - Provides harmonic resolution or motivic inversion
   * - Avoids random scale runs
   * - Perfectly fits the silence duration without overlapping next phrase
   */
  public generateMelodyAwareResponse(
    precedingPhrase: DeepVocalPhrase,
    rootKey: string,
    scale: 'major' | 'minor',
    gapDurationSeconds: number
  ): number[] {
    const notes = precedingPhrase.notes;
    if (notes.length === 0) return [60, 64, 67];

    const rootPitchClass = this.getKeyPitchClass(rootKey);
    const scaleIntervals = scale === 'minor' ? SCALE_DEGREES_MINOR : SCALE_DEGREES_MAJOR;
    const landingNote = precedingPhrase.landingMidi;
    const firstNote = notes[0].midiNote;

    // Extract intervals from vocal phrase (e.g. C -> E -> G = [+4, +3])
    const intervals: number[] = [];
    for (let i = 1; i < notes.length; i++) {
      intervals.push(notes[i].midiNote - notes[i - 1].midiNote);
    }

    const availableNotesCount = gapDurationSeconds >= 2.5 ? 4 : gapDurationSeconds >= 1.4 ? 3 : 2;
    const response: number[] = [];

    // Motivic Intelligence: Invert or mirror the vocal pattern
    // Case 1: Vocal was rising (e.g., C -> E -> G) -> Response descends mirroring the intervals
    if (landingNote > firstNote) {
      // Start response at a perfect 5th or octave above landing note
      let currentPitch = landingNote + 7;
      response.push(currentPitch);

      if (availableNotesCount >= 2 && intervals.length > 0) {
        // Apply inverted last interval
        currentPitch -= Math.abs(intervals[intervals.length - 1]);
        response.push(this.quantizeToScale(currentPitch, rootPitchClass, scaleIntervals));
      }
      if (availableNotesCount >= 3 && intervals.length > 1) {
        currentPitch -= Math.abs(intervals[intervals.length - 2]);
        response.push(this.quantizeToScale(currentPitch, rootPitchClass, scaleIntervals));
      }
      if (availableNotesCount >= 4) {
        // Resolve to tonic
        response.push(this.quantizeToScale(landingNote - 12, rootPitchClass, scaleIntervals));
      }
    } 
    // Case 2: Vocal was falling (e.g., G -> E -> C) -> Response lifts mirroring the intervals
    else if (firstNote > landingNote) {
      let currentPitch = landingNote + 2; // start slightly above landing
      response.push(currentPitch);

      if (availableNotesCount >= 2 && intervals.length > 0) {
        // Apply inverted (upward) last interval
        currentPitch += Math.abs(intervals[intervals.length - 1]);
        response.push(this.quantizeToScale(currentPitch, rootPitchClass, scaleIntervals));
      }
      if (availableNotesCount >= 3 && intervals.length > 1) {
        currentPitch += Math.abs(intervals[intervals.length - 2]);
        response.push(this.quantizeToScale(currentPitch, rootPitchClass, scaleIntervals));
      }
      if (availableNotesCount >= 4) {
        // Lift to 5th or octave
        response.push(this.quantizeToScale(landingNote + 12, rootPitchClass, scaleIntervals));
      }
    }
    // Case 3: Steady / Arched phrase -> Motivic echo with vocal landing tone reinforcement
    else {
      response.push(landingNote + 7);
      if (availableNotesCount >= 2) {
        response.push(this.quantizeToScale(landingNote + 4, rootPitchClass, scaleIntervals));
      }
      if (availableNotesCount >= 3) {
        response.push(this.quantizeToScale(landingNote + 2, rootPitchClass, scaleIntervals));
      }
      if (availableNotesCount >= 4) {
        response.push(landingNote);
      }
    }

    return response;
  }

  /**
   * Quantize semitone offset to closest diatonic scale note
   */
  private quantizeToScale(midiNote: number, rootPitchClass: number, scaleIntervals: number[]): number {
    const pitchClass = ((midiNote % 12) + 12) % 12;
    const relClass = ((pitchClass - rootPitchClass) + 12) % 12;

    let closestInterval = scaleIntervals[0];
    let minDiff = 99;

    scaleIntervals.forEach(interval => {
      const diff = Math.abs(relClass - interval);
      if (diff < minDiff) {
        minDiff = diff;
        closestInterval = interval;
      }
    });

    const octave = Math.floor(midiNote / 12);
    return octave * 12 + ((rootPitchClass + closestInterval) % 12);
  }

  private getKeyPitchClass(key: string): number {
    const map: Record<string, number> = {
      'C': 0, 'C#': 1, 'Db': 1, 'D': 2, 'D#': 3, 'Eb': 3,
      'E': 4, 'F': 5, 'F#': 6, 'Gb': 6, 'G': 7, 'G#': 8,
      'Ab': 8, 'A': 9, 'A#': 10, 'Bb': 10, 'B': 11
    };
    return map[key] || 0;
  }
}
