/**
 * SURGE STUDIO / MUSICBASE — PHASE 6
 * Canonical Mix Plan & DSP Channel Strip Models
 * 
 * Defines the single authoritative representation for:
 * - Multi-track Mix Channels (Gain staging, Polarity, 3-Band Parametric EQ, Compressor, Fader, Pan)
 * - Subgroup Buses (Vocals, Drums, Bass, Instruments)
 * - Auxiliary FX Returns (Studio Reverb, Tempo-Synced Delay)
 * - Master Output Bus & Real Metering
 * - Non-destructive routing DAG with circular dependency protection
 * 
 * 100% Deterministic, Offline-First, Zero Synthetic Audio Fallbacks.
 */

export type PanLaw = 'constant_power' | 'linear';

export type EqFilterType = 'low_shelf' | 'peaking' | 'high_shelf' | 'high_pass' | 'low_pass';

export interface EqBand {
  id: string;
  name: string;
  type: EqFilterType;
  frequency: number; // 20 Hz to 20000 Hz
  gainDb: number;    // -24.0 dB to +24.0 dB
  q: number;         // 0.1 to 18.0
  enabled: boolean;
}

export interface ChannelEq {
  bands: EqBand[];
  bypass: boolean;
}

export interface ChannelCompressor {
  thresholdDb: number;  // -60.0 dB to 0.0 dB
  ratio: number;        // 1.0 to 20.0
  attackMs: number;     // 0.1 ms to 200.0 ms
  releaseMs: number;    // 10.0 ms to 2000.0 ms
  makeupGainDb: number; // 0.0 dB to +24.0 dB
  kneeDb: number;       // 0.0 dB to 12.0 dB
  bypass: boolean;
}

export interface ReverbParams {
  roomSize: number;     // 0.0 to 1.0 (0.0 = intimate studio booth, 1.0 = concert hall)
  decaySec: number;     // 0.2s to 8.0s
  damping: number;      // 0.0 to 1.0 (HF absorption)
  preDelayMs: number;   // 0.0 to 100.0 ms
  returnGainDb: number; // -60.0 dB to +6.0 dB
  bypass: boolean;
}

export interface DelayParams {
  timeMs: number;       // 10.0 ms to 2000.0 ms
  feedback: number;     // 0.0 to 0.95
  damping: number;      // 0.0 to 1.0
  mix: number;          // 0.0 to 1.0
  bypass: boolean;
}

export interface ChannelSend {
  sendId: string;
  destinationBusId: string; // e.g. 'reverb_bus', 'delay_bus'
  levelDb: number;          // -60.0 dB to +6.0 dB (-60 dB = silent)
  preFader: boolean;
  bypass: boolean;
}

export interface PeakRmsMeasurement {
  peakL: number;      // Linear peak (0.0 to > 1.0)
  peakR: number;      // Linear peak (0.0 to > 1.0)
  peakDbL: number;    // dBFS (-Infinity to > 0 dBFS)
  peakDbR: number;    // dBFS (-Infinity to > 0 dBFS)
  rmsL: number;       // Linear RMS
  rmsR: number;       // Linear RMS
  rmsDbL: number;     // dBFS RMS
  rmsDbR: number;     // dBFS RMS
  clipping: boolean;  // True if peak > 1.0 (0 dBFS)
  peakHoldL: number;  // Peak hold value
  peakHoldR: number;
}

export interface MixChannel {
  channelId: string;
  sourceTrackId: string; // Stable ID matching ProjectTrack.id or ArrangementTrack.id
  name: string;
  type: string;          // 'vocal' | 'drums' | 'bass' | 'piano' | 'guitar' | 'strings' | etc.
  
  // Gain Staging & Polarity
  inputGainDb: number;   // -24.0 dB to +24.0 dB (Trim)
  phaseInvert: boolean;  // Polarity Inversion (180 deg)
  
  // Dynamic Inserts
  eq: ChannelEq;
  compressor: ChannelCompressor;
  
  // Fader & Panning
  volumeDb: number;      // -60.0 dB to +12.0 dB (0 dB = unity gain, -60 dB = -inf)
  linearGain: number;    // Computed 10^(volumeDb / 20)
  pan: number;           // -1.0 (hard left) to +1.0 (hard right), 0.0 = center
  
  // Routing & Solo/Mute Logic
  mute: boolean;
  solo: boolean;
  soloSafe: boolean;
  busAssignment: string; // Subgroup busId (e.g. 'vocal_bus', 'drums_bus', 'bass_bus', 'music_bus', 'master_bus')
  sends: ChannelSend[];
  
  // Metadata & Metering
  color?: string;
  dspVersion: number;
}

export type BusType = 'subgroup' | 'aux_reverb' | 'aux_delay' | 'master';

export interface MixBus {
  busId: string;
  name: string;
  type: BusType;
  
  volumeDb: number;      // -60.0 dB to +12.0 dB
  linearGain: number;
  pan: number;           // -1.0 to +1.0
  mute: boolean;
  solo: boolean;
  
  eq?: ChannelEq;
  compressor?: ChannelCompressor;
  reverb?: ReverbParams;
  delay?: DelayParams;
  
  destinationBusId: string; // e.g. 'master_bus'
  color?: string;
}

export interface MasterBus {
  busId: 'master_bus';
  name: 'Master Bus';
  volumeDb: number;      // -60.0 dB to +6.0 dB
  linearGain: number;
  pan: number;           // -1.0 to +1.0
  mute: boolean;
  limiterCeilingDb: number; // -0.3 dBFS transparent headroom safety
}

export interface RoutingNode {
  nodeId: string;
  nodeType: 'channel' | 'bus' | 'master';
  destinationNodeId: string;
}

export interface AutoBalanceProposal {
  proposalId: string;
  appliedGenre: string;
  stemBalances: Array<{
    sourceTrackId: string;
    suggestedVolumeDb: number;
    suggestedPan: number;
    suggestedEqPreset?: string;
    suggestedReverbSendDb?: number;
    reasoning: string;
  }>;
  overallTargetLoudnessRmsDb: number;
  explanation: string;
}

export interface MixPlan {
  planId: string;
  version: number;        // Schema version (e.g. 6)
  projectId: string;
  sampleRate: number;     // e.g. 44100 or 48000
  panLaw: PanLaw;
  
  channels: MixChannel[];
  buses: MixBus[];
  master: MasterBus;
  routingGraph: RoutingNode[];
  
  aiAutoMixApplied: boolean;
  lastAutoBalanceProposal?: AutoBalanceProposal;
  
  createdTimestamp: string;
  updatedTimestamp: string;
}

/**
 * Phase 6 → Phase 7 Render Contract:
 * What Phase 7 mastering/rendering consumes directly from Phase 6.
 */
export interface Phase7RenderContract {
  contractVersion: 6;
  projectId: string;
  mixPlan: MixPlan;
  channelSources: Array<{
    sourceTrackId: string;
    channelId: string;
    audioBuffer: AudioBuffer;
  }>;
  totalDurationSeconds: number;
  sampleRate: number;
  headroomDb: number; // Reserved headroom (e.g. -3.0 dBFS)
}
