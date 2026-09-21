/**
 * MUSICBASE / SURGE STUDIO
 * Generative Musical Memory Engine (Phase 5 - Prompt 2)
 *
 * Deterministically records musical history and state across sections, phrases, chords,
 * motifs, and instrument activities to drive non-repeating, anti-loop musical variation.
 *
 * 100% Offline-First, Deterministic, Memory-Safe & Defensive Copy Isolated.
 */

import { GenerativeMusicalMemoryState } from '../../types/generativeDecision';

export class GenerativeMusicalMemory {
  private state: GenerativeMusicalMemoryState;

  constructor() {
    this.state = this.createInitialState();
  }

  private createInitialState(): GenerativeMusicalMemoryState {
    return {
      chordHistory: [],
      recentMotifs: [],
      phraseHistory: [],
      sectionHistory: [],
      instrumentActivityHistory: {
        drums: [],
        tabla: [],
        bass: [],
        piano: [],
        guitar: [],
        strings: [],
        flute: [],
        sitar: [],
        harmonium: []
      },
      repetitionCount: {},
      variationState: {
        verseRepetitionIndex: 0,
        chorusRepetitionIndex: 0,
        lastFillBeat: -999,
        lastCallResponseBeat: -999,
        themeVariationStep: 0
      }
    };
  }

  /**
   * Resets memory state completely for a fresh arrangement pass.
   */
  public reset(): void {
    this.state = this.createInitialState();
  }

  /**
   * Records a chosen chord into sequential history.
   */
  public recordChord(beat: number, chordName: string, rootOffset: number, chordType: string): void {
    this.state.chordHistory.push({
      beat,
      chordName,
      rootOffset,
      chordType
    });
    // Keep max 128 recent chord entries to bound memory
    if (this.state.chordHistory.length > 128) {
      this.state.chordHistory.shift();
    }
  }

  /**
   * Retrieves the most recent chord decision.
   */
  public getLastChord(): { beat: number; chordName: string; rootOffset: number; chordType: string } | null {
    if (this.state.chordHistory.length === 0) return null;
    return this.state.chordHistory[this.state.chordHistory.length - 1];
  }

  /**
   * Records a processed vocal phrase and its intent.
   */
  public recordPhrase(phraseId: number, intent: string, energy: number, endBeat: number): void {
    this.state.phraseHistory.push({
      phraseId,
      intent,
      energy,
      endBeat
    });
  }

  /**
   * Records a section entrance, incrementing repetition counters.
   */
  public recordSection(sectionType: string, averageDensity: number): void {
    const safeType = sectionType || 'section';
    const currentCount = this.state.repetitionCount[safeType] || 0;
    this.state.repetitionCount[safeType] = currentCount + 1;

    if (safeType.includes('verse')) {
      this.state.variationState.verseRepetitionIndex++;
    } else if (safeType.includes('chorus')) {
      this.state.variationState.chorusRepetitionIndex++;
    }

    this.state.sectionHistory.push({
      sectionType: safeType,
      repetitionCount: this.state.repetitionCount[safeType],
      averageDensity
    });
  }

  /**
   * Returns how many times a given section type has occurred.
   */
  public getSectionRepetitionCount(sectionType: string): number {
    const safeType = sectionType || 'section';
    return this.state.repetitionCount[safeType] || 0;
  }

  /**
   * Records instrument activity level for a given beat.
   */
  public recordInstrumentActivity(instrument: string, beat: number, density: number): void {
    if (!this.state.instrumentActivityHistory[instrument]) {
      this.state.instrumentActivityHistory[instrument] = [];
    }
    const arr = this.state.instrumentActivityHistory[instrument];
    const intBeat = Math.floor(beat);
    while (arr.length <= intBeat) {
      arr.push(0);
    }
    arr[intBeat] = Math.max(0, Math.min(1.0, density));
  }

  /**
   * Gets average recent activity of an instrument over a window of beats.
   */
  public getRecentInstrumentActivity(instrument: string, currentBeat: number, windowBeats = 8): number {
    const arr = this.state.instrumentActivityHistory[instrument];
    if (!arr || arr.length === 0) return 0;
    const start = Math.max(0, Math.floor(currentBeat) - windowBeats);
    const end = Math.min(arr.length, Math.floor(currentBeat));
    if (end <= start) return 0;
    let sum = 0;
    for (let i = start; i < end; i++) {
      sum += arr[i] || 0;
    }
    return sum / (end - start);
  }

  /**
   * Records a detected or generated motif occurrence.
   */
  public recordMotif(id: string, intervals: number[], beat: number, role: string): void {
    this.state.recentMotifs.push({
      id,
      intervals: [...intervals],
      beat,
      role
    });
    if (this.state.recentMotifs.length > 32) {
      this.state.recentMotifs.shift();
    }
  }

  /**
   * Returns how many times a given motif cluster has occurred in memory.
   */
  public getMotifRepetitionCount(id: string): number {
    return this.state.recentMotifs.filter(m => m.id === id).length;
  }

  /**
   * Retrieves recent motifs within a beat range.
   */
  public getRecentMotifs(limit = 4): Array<{ id: string; intervals: number[]; beat: number; role: string }> {
    return this.state.recentMotifs.slice(-limit).map(m => ({
      ...m,
      intervals: [...m.intervals]
    }));
  }

  /**
   * Records fill execution timestamp.
   */
  public recordFill(beat: number): void {
    this.state.variationState.lastFillBeat = beat;
  }

  /**
   * Records call-and-response execution timestamp.
   */
  public recordCallResponse(beat: number): void {
    this.state.variationState.lastCallResponseBeat = beat;
  }

  /**
   * Calculates a deterministic variation multiplier for a section based on repetition history.
   * Repetition 1: Standard foundation (1.0)
   * Repetition 2: Expanded counterpoint / rhythm syncopation (1.2)
   * Repetition 3+: Climax / High-energy variation (1.35)
   */
  public getVariationMultiplier(sectionType: string): number {
    const reps = this.getSectionRepetitionCount(sectionType);
    if (reps <= 1) return 1.0;
    if (reps === 2) return 1.2;
    return 1.35;
  }

  /**
   * Provides defensive clone of current state.
   */
  public clone(): GenerativeMusicalMemory {
    const copy = new GenerativeMusicalMemory();
    copy.state = JSON.parse(JSON.stringify(this.state));
    return copy;
  }

  /**
   * Returns read-only snapshot of current memory state.
   */
  public getState(): Readonly<GenerativeMusicalMemoryState> {
    return this.state;
  }
}
