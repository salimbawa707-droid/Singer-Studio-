/**
 * SURGE STUDIO / MUSICBASE — PHASE 6
 * Real-Time WebAudio Mixer Adapter (Live Signal Graph)
 * 
 * Manages live WebAudio DSP graph corresponding to canonical MixPlan:
 * Track Sources → Input Gain → 3-Band Parametric EQ → Dynamics Compressor → Fader → Stereo Pan → Sends → Subgroup Buses / Aux FX Returns → Master Bus → Output
 * 
 * 100% Non-destructive, Zero Fake/Synthetic Fallbacks.
 */

import {
  MixPlan,
  MixChannel,
  MixBus,
  ChannelEq,
  ChannelCompressor,
  ReverbParams,
  DelayParams
} from '../../types/mixPlan';
import { MixerDspMath } from './mixerEngine';

export interface ChannelAudioNodes {
  inputGain: GainNode;
  eqFilters: BiquadFilterNode[];
  compressor: DynamicsCompressorNode;
  faderGain: GainNode;
  panner: StereoPannerNode | null;
  sends: Map<string, GainNode>;
  analyser: AnalyserNode;
  sourceNode?: AudioBufferSourceNode;
}

export interface BusAudioNodes {
  busInput: GainNode;
  compressor?: DynamicsCompressorNode;
  reverbNode?: ConvolverNode;
  delayNode?: DelayNode;
  delayFeedback?: GainNode;
  faderGain: GainNode;
  panner?: StereoPannerNode;
}

export class WebMixerAdapter {
  private ctx: AudioContext;
  private mixPlan: MixPlan | null = null;
  
  private channelNodes = new Map<string, ChannelAudioNodes>();
  private busNodes = new Map<string, BusAudioNodes>();
  
  private masterGain: GainNode | null = null;
  private masterAnalyser: AnalyserNode | null = null;
  private analyserL: AnalyserNode | null = null;
  private analyserR: AnalyserNode | null = null;
  
  private isPlaying = false;
  private activeSources: AudioBufferSourceNode[] = [];
  private onPlaybackEndedCallback: (() => void) | null = null;

  constructor(ctx: AudioContext) {
    this.ctx = ctx;
  }

  /**
   * Rebuilds or initializes the WebAudio DSP Graph matching the canonical MixPlan
   */
  public setupGraph(mixPlan: MixPlan): void {
    this.stopPlayback();
    this.channelNodes.clear();
    this.busNodes.clear();
    this.mixPlan = mixPlan;

    // 1. Setup Master Bus
    this.masterGain = this.ctx.createGain();
    const masterGainLinear = mixPlan.master.mute ? 0.0 : MixerDspMath.dbToLinear(mixPlan.master.volumeDb);
    this.masterGain.gain.setValueAtTime(masterGainLinear, this.ctx.currentTime);

    this.masterAnalyser = this.ctx.createAnalyser();
    this.masterAnalyser.fftSize = 256;
    this.masterAnalyser.smoothingTimeConstant = 0.5;

    const splitter = this.ctx.createChannelSplitter(2);
    this.analyserL = this.ctx.createAnalyser();
    this.analyserR = this.ctx.createAnalyser();
    this.analyserL.fftSize = 256;
    this.analyserR.fftSize = 256;

    this.masterGain.connect(this.masterAnalyser);
    this.masterAnalyser.connect(this.ctx.destination);
    this.masterGain.connect(splitter);
    splitter.connect(this.analyserL, 0);
    splitter.connect(this.analyserR, 1);

    // 2. Setup Subgroup & Aux Buses
    mixPlan.buses.forEach(bus => {
      const busInput = this.ctx.createGain();
      const busFader = this.ctx.createGain();
      const busGainLinear = bus.mute ? 0.0 : MixerDspMath.dbToLinear(bus.volumeDb);
      busFader.gain.setValueAtTime(busGainLinear, this.ctx.currentTime);

      let lastNode: AudioNode = busInput;

      // Aux Reverb Convolution or Synthetic Impulse
      let reverbNode: ConvolverNode | undefined;
      if (bus.type === 'aux_reverb' && bus.reverb) {
        reverbNode = this.createSyntheticReverbConvolver(bus.reverb);
        busInput.connect(reverbNode);
        lastNode = reverbNode;
      }

      // Aux Delay
      let delayNode: DelayNode | undefined;
      let delayFeedback: GainNode | undefined;
      if (bus.type === 'aux_delay' && bus.delay) {
        delayNode = this.ctx.createDelay(2.0);
        delayNode.delayTime.setValueAtTime(Math.max(0.01, bus.delay.timeMs * 0.001), this.ctx.currentTime);
        delayFeedback = this.ctx.createGain();
        delayFeedback.gain.setValueAtTime(Math.min(0.9, bus.delay.feedback), this.ctx.currentTime);

        const dampFilter = this.ctx.createBiquadFilter();
        dampFilter.type = 'lowpass';
        dampFilter.frequency.setValueAtTime(5000, this.ctx.currentTime);

        busInput.connect(delayNode);
        delayNode.connect(dampFilter);
        dampFilter.connect(delayFeedback);
        delayFeedback.connect(delayNode);
        lastNode = delayNode;
      }

      // Bus Compressor
      let busCompressor: DynamicsCompressorNode | undefined;
      if (bus.compressor) {
        busCompressor = this.ctx.createDynamicsCompressor();
        busCompressor.threshold.setValueAtTime(bus.compressor.thresholdDb, this.ctx.currentTime);
        busCompressor.ratio.setValueAtTime(bus.compressor.ratio, this.ctx.currentTime);
        busCompressor.attack.setValueAtTime(bus.compressor.attackMs * 0.001, this.ctx.currentTime);
        busCompressor.release.setValueAtTime(bus.compressor.releaseMs * 0.001, this.ctx.currentTime);
        busCompressor.knee.setValueAtTime(bus.compressor.kneeDb, this.ctx.currentTime);

        lastNode.connect(busCompressor);
        lastNode = busCompressor;
      }

      lastNode.connect(busFader);

      // Bus Panner
      if (this.ctx.createStereoPanner && bus.pan !== 0) {
        const panner = this.ctx.createStereoPanner();
        panner.pan.setValueAtTime(bus.pan, this.ctx.currentTime);
        busFader.connect(panner);
        panner.connect(this.masterGain!);
      } else {
        busFader.connect(this.masterGain!);
      }

      this.busNodes.set(bus.busId, {
        busInput,
        faderGain: busFader,
        compressor: busCompressor,
        reverbNode,
        delayNode,
        delayFeedback
      });
    });

    // 3. Setup Channels
    const anySolo = mixPlan.channels.some(c => c.solo);

    mixPlan.channels.forEach(channel => {
      const inputGain = this.ctx.createGain();
      const inGainLinear = MixerDspMath.dbToLinear(channel.inputGainDb) * (channel.phaseInvert ? -1.0 : 1.0);
      inputGain.gain.setValueAtTime(inGainLinear, this.ctx.currentTime);

      let currentNode: AudioNode = inputGain;

      // 3-Band Parametric EQ Filters
      const eqFilters: BiquadFilterNode[] = [];
      if (!channel.eq.bypass && channel.eq.bands.length > 0) {
        channel.eq.bands.forEach(band => {
          const filter = this.ctx.createBiquadFilter();
          switch (band.type) {
            case 'high_pass': filter.type = 'highpass'; break;
            case 'low_pass': filter.type = 'lowpass'; break;
            case 'low_shelf': filter.type = 'lowshelf'; break;
            case 'high_shelf': filter.type = 'highshelf'; break;
            case 'peaking':
            default: filter.type = 'peaking'; break;
          }
          filter.frequency.setValueAtTime(band.frequency, this.ctx.currentTime);
          filter.gain.setValueAtTime(band.enabled ? band.gainDb : 0.0, this.ctx.currentTime);
          filter.Q.setValueAtTime(band.q, this.ctx.currentTime);

          currentNode.connect(filter);
          currentNode = filter;
          eqFilters.push(filter);
        });
      }

      // Dynamics Compressor
      const compressor = this.ctx.createDynamicsCompressor();
      if (!channel.compressor.bypass) {
        compressor.threshold.setValueAtTime(channel.compressor.thresholdDb, this.ctx.currentTime);
        compressor.ratio.setValueAtTime(channel.compressor.ratio, this.ctx.currentTime);
        compressor.attack.setValueAtTime(channel.compressor.attackMs * 0.001, this.ctx.currentTime);
        compressor.release.setValueAtTime(channel.compressor.releaseMs * 0.001, this.ctx.currentTime);
        compressor.knee.setValueAtTime(channel.compressor.kneeDb, this.ctx.currentTime);
      } else {
        compressor.ratio.setValueAtTime(1.0, this.ctx.currentTime);
      }
      currentNode.connect(compressor);
      currentNode = compressor;

      // Fader Gain
      const faderGain = this.ctx.createGain();
      const isAudible = anySolo ? (channel.solo || channel.soloSafe) && !channel.mute : !channel.mute;
      const targetFaderGain = isAudible ? MixerDspMath.dbToLinear(channel.volumeDb) : 0.0;
      faderGain.gain.setValueAtTime(targetFaderGain, this.ctx.currentTime);

      currentNode.connect(faderGain);

      // Stereo Panner
      let panner: StereoPannerNode | null = null;
      let postFaderNode: AudioNode = faderGain;
      if (this.ctx.createStereoPanner) {
        panner = this.ctx.createStereoPanner();
        panner.pan.setValueAtTime(channel.pan, this.ctx.currentTime);
        faderGain.connect(panner);
        postFaderNode = panner;
      }

      // Channel Meter Analyser
      const analyser = this.ctx.createAnalyser();
      analyser.fftSize = 128;
      postFaderNode.connect(analyser);

      // Route to assigned Subgroup Bus
      const targetBus = this.busNodes.get(channel.busAssignment);
      if (targetBus) {
        postFaderNode.connect(targetBus.busInput);
      } else if (this.masterGain) {
        postFaderNode.connect(this.masterGain);
      }

      // Route Sends (Aux Reverb / Delay)
      const sends = new Map<string, GainNode>();
      channel.sends.forEach(send => {
        const auxBus = this.busNodes.get(send.destinationBusId);
        if (auxBus) {
          const sendGain = this.ctx.createGain();
          const sLevel = send.bypass ? 0.0 : MixerDspMath.dbToLinear(send.levelDb);
          sendGain.gain.setValueAtTime(sLevel, this.ctx.currentTime);

          if (send.preFader) {
            currentNode.connect(sendGain);
          } else {
            postFaderNode.connect(sendGain);
          }
          sendGain.connect(auxBus.busInput);
          sends.set(send.sendId, sendGain);
        }
      });

      this.channelNodes.set(channel.channelId, {
        inputGain,
        eqFilters,
        compressor,
        faderGain,
        panner,
        sends,
        analyser
      });
    });
  }

  /**
   * Starts non-destructive multi-stem audio playback
   */
  public startPlayback(
    sources: Array<{ sourceTrackId: string; audioBuffer: AudioBuffer }>,
    onEnded: () => void
  ): boolean {
    if (!this.mixPlan) return false;
    this.stopPlayback();

    let startedAny = false;
    let completedCount = 0;
    const totalSources = sources.filter(s => s.audioBuffer).length;
    if (totalSources === 0) return false;

    this.onPlaybackEndedCallback = onEnded;

    sources.forEach(src => {
      const channel = this.mixPlan!.channels.find(c => c.sourceTrackId === src.sourceTrackId);
      if (!channel) return;

      const nodes = this.channelNodes.get(channel.channelId);
      if (!nodes || !src.audioBuffer) return;

      const sourceNode = this.ctx.createBufferSource();
      sourceNode.buffer = src.audioBuffer;
      sourceNode.connect(nodes.inputGain);

      sourceNode.onended = () => {
        completedCount++;
        if (completedCount >= totalSources) {
          this.isPlaying = false;
          if (this.onPlaybackEndedCallback) this.onPlaybackEndedCallback();
        }
      };

      sourceNode.start(0);
      this.activeSources.push(sourceNode);
      startedAny = true;
    });

    this.isPlaying = startedAny;
    return startedAny;
  }

  public stopPlayback(): void {
    this.activeSources.forEach(s => {
      try { s.stop(0); s.disconnect(); } catch (e) {}
    });
    this.activeSources = [];
    this.isPlaying = false;
  }

  public getIsPlaying(): boolean {
    return this.isPlaying;
  }

  public getMasterAnalyser(): AnalyserNode | null {
    return this.masterAnalyser;
  }

  public getMeterMeasurements(): { peakL: number; peakR: number; clipping: boolean } {
    if (!this.analyserL || !this.analyserR || !this.isPlaying) {
      return { peakL: 0, peakR: 0, clipping: false };
    }

    const dataL = new Float32Array(this.analyserL.fftSize);
    const dataR = new Float32Array(this.analyserR.fftSize);
    this.analyserL.getFloatTimeDomainData(dataL);
    this.analyserR.getFloatTimeDomainData(dataR);

    let maxL = 0;
    let maxR = 0;
    for (let i = 0; i < dataL.length; i++) {
      const absL = Math.abs(dataL[i]);
      if (absL > maxL) maxL = absL;
      const absR = Math.abs(dataR[i]);
      if (absR > maxR) maxR = absR;
    }

    return {
      peakL: Math.min(100, Math.round(maxL * 100)),
      peakR: Math.min(100, Math.round(maxR * 100)),
      clipping: maxL >= 1.0 || maxR >= 1.0
    };
  }

  // Real-time parameter updates
  public updateChannelVolume(channelId: string, volumeDb: number, isAudible: boolean): void {
    const nodes = this.channelNodes.get(channelId);
    if (!nodes) return;
    const targetGain = isAudible ? MixerDspMath.dbToLinear(volumeDb) : 0.0;
    nodes.faderGain.gain.setValueAtTime(targetGain, this.ctx.currentTime);
  }

  public updateChannelPan(channelId: string, pan: number): void {
    const nodes = this.channelNodes.get(channelId);
    if (!nodes || !nodes.panner) return;
    nodes.panner.pan.setValueAtTime(pan, this.ctx.currentTime);
  }

  public updateChannelMuteSoloState(mixPlan: MixPlan): void {
    const anySolo = mixPlan.channels.some(c => c.solo);
    mixPlan.channels.forEach(ch => {
      const isAudible = anySolo ? (ch.solo || ch.soloSafe) && !ch.mute : !ch.mute;
      this.updateChannelVolume(ch.channelId, ch.volumeDb, isAudible);
    });
  }

  public updateMasterVolume(volumeDb: number, mute: boolean): void {
    if (!this.masterGain) return;
    const targetGain = mute ? 0.0 : MixerDspMath.dbToLinear(volumeDb);
    this.masterGain.gain.setValueAtTime(targetGain, this.ctx.currentTime);
  }

  private createSyntheticReverbConvolver(params: ReverbParams): ConvolverNode {
    const convolver = this.ctx.createConvolver();
    const rate = this.ctx.sampleRate;
    const length = Math.floor(rate * params.decaySec);
    const impulse = this.ctx.createBuffer(2, length, rate);
    const impL = impulse.getChannelData(0);
    const impR = impulse.getChannelData(1);

    for (let i = 0; i < length; i++) {
      const decay = Math.exp(-3.0 * (i / length));
      impL[i] = (Math.random() * 2 - 1) * decay;
      impR[i] = (Math.random() * 2 - 1) * decay;
    }

    convolver.buffer = impulse;
    return convolver;
  }
}
