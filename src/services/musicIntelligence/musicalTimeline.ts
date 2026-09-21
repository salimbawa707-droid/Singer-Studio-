/**
 * MUSICBASE / SURGE STUDIO — PHASE 5 CANONICAL MUSICAL TIMELINE
 * 
 * The single authoritative timing service for all musical conversions:
 * - Seconds ↔ Beats ↔ Bars ↔ Ticks
 * - Sample-accurate conversions across tempos (60 BPM, 120 BPM, fractional BPM)
 * - Time signature awareness (4/4, 3/4, 6/8, 7/8)
 * - Deterministic Grid Snapping (Quarter, 8th, 16th, 32nd, Triplets)
 * 
 * 100% Offline-First, Zero Math.random(), Pure Deterministic Math.
 */

import { MusicalTimelinePoint } from '../../types/musicPlan';

export const STANDARD_TICKS_PER_BEAT = 480; // 480 PPQ

export class MusicalTimeline {
  private tempo: number;
  private numerator: number;
  private denominator: number;
  private sampleRate: number;

  constructor(tempo: number = 120, numerator: number = 4, denominator: number = 4, sampleRate: number = 44100) {
    this.tempo = Math.max(20, Math.min(300, tempo));
    this.numerator = Math.max(1, Math.min(16, numerator));
    this.denominator = Math.max(1, Math.min(16, denominator));
    this.sampleRate = sampleRate;
  }

  public getTempo(): number {
    return this.tempo;
  }

  public setTempo(newTempo: number): void {
    this.tempo = Math.max(20, Math.min(300, newTempo));
  }

  public getTimeSignature(): { numerator: number; denominator: number } {
    return { numerator: this.numerator, denominator: this.denominator };
  }

  /**
   * Seconds per quarter-note beat
   */
  public getSecondsPerBeat(): number {
    return 60.0 / this.tempo;
  }

  /**
   * Beats per bar based on time signature
   */
  public getBeatsPerBar(): number {
    return (this.numerator * 4.0) / this.denominator;
  }

  /**
   * Seconds per full bar
   */
  public getSecondsPerBar(): number {
    return this.getBeatsPerBar() * this.getSecondsPerBeat();
  }

  /**
   * Convert absolute seconds to absolute beats (0-indexed)
   */
  public secondsToBeats(seconds: number): number {
    return (Math.max(0, seconds) * this.tempo) / 60.0;
  }

  /**
   * Convert absolute beats (0-indexed) to absolute seconds
   */
  public beatsToSeconds(beats: number): number {
    return (Math.max(0, beats) * 60.0) / this.tempo;
  }

  /**
   * Convert absolute beats to bars (1-indexed floating point or bar number)
   */
  public beatsToBar(beats: number): number {
    return 1.0 + beats / this.getBeatsPerBar();
  }

  /**
   * Convert bar and beat within bar (1-indexed) to absolute beats (0-indexed)
   */
  public barBeatToTotalBeats(bar: number, beatWithinBar: number = 1.0): number {
    const barZero = Math.max(0, bar - 1);
    const beatZero = Math.max(0, beatWithinBar - 1);
    return barZero * this.getBeatsPerBar() + beatZero;
  }

  /**
   * Convert absolute beats to standard MIDI ticks (480 PPQ)
   */
  public beatsToTicks(beats: number): number {
    return Math.round(beats * STANDARD_TICKS_PER_BEAT);
  }

  /**
   * Convert MIDI ticks to absolute beats
   */
  public ticksToBeats(ticks: number): number {
    return ticks / STANDARD_TICKS_PER_BEAT;
  }

  /**
   * Convert audio sample index to absolute seconds
   */
  public samplesToSeconds(samples: number): number {
    return samples / this.sampleRate;
  }

  /**
   * Convert seconds to audio sample count
   */
  public secondsToSamples(seconds: number): number {
    return Math.round(seconds * this.sampleRate);
  }

  /**
   * Resolves a full comprehensive Timeline Point from seconds
   */
  public getPointFromSeconds(seconds: number): MusicalTimelinePoint {
    const totalBeats = this.secondsToBeats(seconds);
    const beatsPerBar = this.getBeatsPerBar();
    const bar = Math.floor(totalBeats / beatsPerBar) + 1;
    const beat = (totalBeats % beatsPerBar) + 1;
    const ticks = this.beatsToTicks(totalBeats);

    return {
      bar,
      beat,
      totalBeats,
      ticks,
      seconds
    };
  }

  /**
   * Resolves a full comprehensive Timeline Point from absolute beats
   */
  public getPointFromBeats(totalBeats: number): MusicalTimelinePoint {
    const seconds = this.beatsToSeconds(totalBeats);
    const beatsPerBar = this.getBeatsPerBar();
    const bar = Math.floor(totalBeats / beatsPerBar) + 1;
    const beat = (totalBeats % beatsPerBar) + 1;
    const ticks = this.beatsToTicks(totalBeats);

    return {
      bar,
      beat,
      totalBeats,
      ticks,
      seconds
    };
  }

  /**
   * Snap beat position to musical grid (e.g. 1/16th note = 0.25 beats)
   */
  public snapBeatToGrid(beat: number, subdivision: '1/4' | '1/8' | '1/16' | '1/32' | '1/8t' | '1/16t' = '1/16'): number {
    let step = 0.25; // default 1/16
    switch (subdivision) {
      case '1/4': step = 1.0; break;
      case '1/8': step = 0.5; break;
      case '1/16': step = 0.25; break;
      case '1/32': step = 0.125; break;
      case '1/8t': step = 1.0 / 3.0; break;
      case '1/16t': step = 0.5 / 3.0; break;
    }
    return Math.round(beat / step) * step;
  }
}
