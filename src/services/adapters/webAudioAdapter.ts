/**
 * Phase 1 Architecture: WebAudio Platform Adapter
 * 
 * Implements IAudioEngine using browser WebAudio API & deterministic DSP algorithms.
 */

import { IAudioEngine, AudioEngineCapabilities } from '../contracts/audioEngineContract';
import { WebAudioEngine } from '../webAudioEngine';
import { ProjectTrack, PitchAnalysisResult, BpmKeyResult, DspPipelineSettings } from '../../types/audio';

export class WebAudioAdapter implements IAudioEngine {
  private static instance: WebAudioAdapter;
  private engine: WebAudioEngine;

  public readonly capabilities: AudioEngineCapabilities = {
    supportsRealtimeAnalysis: true,
    supportsMultiTrackMixing: true,
    supportsOfflineExport: true,
    supportsLowLatencyRecording: true,
    engineType: 'webaudio',
  };

  private constructor() {
    this.engine = WebAudioEngine.getInstance();
  }

  public static getInstance(): WebAudioAdapter {
    if (!WebAudioAdapter.instance) {
      WebAudioAdapter.instance = new WebAudioAdapter();
    }
    return WebAudioAdapter.instance;
  }

  public async initialize(): Promise<boolean> {
    try {
      const ctx = this.engine.getContext();
      if (ctx.state === 'suspended') {
        await ctx.resume();
      }
      return true;
    } catch {
      return false;
    }
  }

  public async record(): Promise<boolean> {
    try {
      await this.engine.startRecording();
      return true;
    } catch {
      return false;
    }
  }

  public async stopRecording(): Promise<{ blob: Blob; buffer: AudioBuffer }> {
    return await this.engine.stopRecording();
  }

  public async play(buffer?: AudioBuffer, offsetSec: number = 0): Promise<void> {
    if (buffer) {
      this.engine.playBuffer(buffer);
    }
  }

  public async pause(): Promise<void> {
    this.engine.stopAllPlayback();
  }

  public async stop(): Promise<void> {
    this.engine.stopAllPlayback();
  }

  public async analyze(buffer: AudioBuffer): Promise<{
    pitch: PitchAnalysisResult;
    bpmKey: BpmKeyResult;
    rmsDb: number;
  }> {
    const pitch = this.engine.analyzeBufferPitch(buffer);
    const bpmKey = this.engine.analyzeBufferBpmKey(buffer);
    
    // Compute RMS
    const data = buffer.getChannelData(0);
    let sum = 0;
    for (let i = 0; i < data.length; i++) {
      sum += data[i] * data[i];
    }
    const rms = Math.sqrt(sum / (data.length || 1));
    const rmsDb = rms > 0 ? 20 * Math.log10(rms) : -96;

    return { pitch, bpmKey, rmsDb };
  }

  public async process(buffer: AudioBuffer, settings: DspPipelineSettings): Promise<AudioBuffer> {
    return await this.engine.processVocalBuffer(buffer, settings);
  }

  public async mix(tracks: ProjectTrack[]): Promise<AudioBuffer> {
    const ctx = this.engine.getContext();
    let maxDuration = 0;
    tracks.forEach(t => {
      if (t.audioBuffer) {
        maxDuration = Math.max(maxDuration, t.audioBuffer.duration);
      }
    });
    if (maxDuration <= 0) {
      maxDuration = 10;
    }
    const result = this.engine.mixMasterStems(tracks, maxDuration, ctx);
    return result.masterMixBuffer;
  }

  public async render(arrangementScore: any): Promise<AudioBuffer> {
    return await this.engine.generateAccompanimentAudio(arrangementScore);
  }

  public async export(buffer: AudioBuffer, format: 'wav16' | 'wav24' | 'mp3_320'): Promise<Blob> {
    if (format === 'mp3_320') {
      return this.engine.audioBufferToMp3Blob(buffer, 320);
    }
    const bitDepth = format === 'wav24' ? 24 : 16;
    return this.engine.audioBufferToWavBlob(buffer, bitDepth);
  }

  public async dispose(): Promise<void> {
    this.engine.stopAllPlayback();
  }
}
