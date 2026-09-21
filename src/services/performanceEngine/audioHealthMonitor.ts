/**
 * MUSICBASE / SURGE STUDIO — PHASE 10
 * AUDIO HEALTH & REAL-TIME DROPOUT DIAGNOSTICS MONITOR
 * 
 * Concept:
 * Audio CPU Load = DSP processing time / available callback budget
 * Monitors buffer starvation, underruns, overruns, and callback duration spikes.
 */

import { AudioHealthReport } from './types';

export class AudioHealthMonitor {
  private static instance: AudioHealthMonitor;

  private sampleRate = 44100;
  private bufferSize = 1024; // ~23.2ms budget at 44.1kHz
  private availableBudgetMs = (1024 / 44100) * 1000;

  private lastProcessingDurationMs = 0;
  private dropoutCount = 0;
  private underrunCount = 0;
  private overrunCount = 0;
  private discontinuityCount = 0;
  private maxDurationRecordedMs = 0;
  private overloadThresholdRatio = 0.85; // 85% of callback budget

  private constructor() {}

  public static getInstance(): AudioHealthMonitor {
    if (!AudioHealthMonitor.instance) {
      AudioHealthMonitor.instance = new AudioHealthMonitor();
    }
    return AudioHealthMonitor.instance;
  }

  /**
   * Configures audio stream parameters for budget calculation
   */
  public configure(sampleRate: number, bufferSize: number): void {
    this.sampleRate = sampleRate;
    this.bufferSize = bufferSize;
    this.availableBudgetMs = (bufferSize / sampleRate) * 1000;
  }

  /**
   * Called at end of audio processing callback (non-blocking, deterministic timer record)
   */
  public recordCallbackExecution(processingDurationMs: number, timestampDiscontinuity: boolean = false): void {
    this.lastProcessingDurationMs = processingDurationMs;

    if (processingDurationMs > this.maxDurationRecordedMs) {
      this.maxDurationRecordedMs = processingDurationMs;
    }

    if (processingDurationMs > this.availableBudgetMs) {
      this.underrunCount++;
      this.dropoutCount++;
    }

    if (timestampDiscontinuity) {
      this.discontinuityCount++;
    }
  }

  /**
   * Generates audio health report
   */
  public getHealthReport(): AudioHealthReport {
    const ratio = this.availableBudgetMs > 0 ? this.lastProcessingDurationMs / this.availableBudgetMs : 0;

    return {
      callbackIntervalMs: this.availableBudgetMs,
      processingDurationMs: this.lastProcessingDurationMs,
      availableBudgetMs: this.availableBudgetMs,
      audioCpuLoadRatio: Number(ratio.toFixed(4)),
      isOverloaded: ratio >= this.overloadThresholdRatio,
      dropoutCount: this.dropoutCount,
      underrunCount: this.underrunCount,
      overrunCount: this.overrunCount,
      discontinuityCount: this.discontinuityCount
    };
  }

  public resetCounters(): void {
    this.dropoutCount = 0;
    this.underrunCount = 0;
    this.overrunCount = 0;
    this.discontinuityCount = 0;
    this.maxDurationRecordedMs = 0;
  }
}
