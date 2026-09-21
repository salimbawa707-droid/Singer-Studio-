/**
 * Phase 1 Architecture Contract: Canonical Audio Engine Interface
 * 
 * Standardizes audio operations across WebAudio (Browser/PWA) and Native C++ (Android/iOS Phase 3).
 * UI and Domain Services interact with this interface, maintaining platform decoupling.
 */

import { ProjectTrack, PitchAnalysisResult, BpmKeyResult, DspPipelineSettings } from '../../types/audio';

export interface AudioEngineCapabilities {
  supportsRealtimeAnalysis: boolean;
  supportsMultiTrackMixing: boolean;
  supportsOfflineExport: boolean;
  supportsLowLatencyRecording: boolean;
  engineType: 'webaudio' | 'native_cpp' | 'hybrid';
}

export interface IAudioEngine {
  readonly capabilities: AudioEngineCapabilities;
  
  /**
   * Initializes the audio context / native audio subsystem.
   */
  initialize(): Promise<boolean>;

  /**
   * Starts live microphone recording.
   */
  record(): Promise<boolean>;

  /**
   * Stops microphone recording and returns the captured buffer and blob.
   */
  stopRecording(): Promise<{ blob: Blob; buffer: AudioBuffer }>;

  /**
   * Plays a single buffer or multi-track stem setup.
   */
  play(buffer?: AudioBuffer, offsetSec?: number): Promise<void>;

  /**
   * Pauses active playback.
   */
  pause(): Promise<void>;

  /**
   * Stops playback and resets playhead.
   */
  stop(): Promise<void>;

  /**
   * Analyzes vocal audio for pitch, BPM, key, and mood contours.
   */
  analyze(buffer: AudioBuffer): Promise<{
    pitch: PitchAnalysisResult;
    bpmKey: BpmKeyResult;
    rmsDb: number;
  }>;

  /**
   * Applies non-destructive DSP cleaning / restoration pipeline.
   */
  process(buffer: AudioBuffer, settings: DspPipelineSettings): Promise<AudioBuffer>;

  /**
   * Mixes multi-track stems with level, pan, EQ, and vocal ducking.
   */
  mix(tracks: ProjectTrack[]): Promise<AudioBuffer>;

  /**
   * Renders full song arrangement into master AudioBuffer.
   */
  render(arrangementScore: any): Promise<AudioBuffer>;

  /**
   * Converts AudioBuffer into final deliverable format (WAV/MP3).
   */
  export(buffer: AudioBuffer, format: 'wav16' | 'wav24' | 'mp3_320'): Promise<Blob>;

  /**
   * Disposes audio context, worklets, or native engine memory.
   */
  dispose(): Promise<void>;
}
