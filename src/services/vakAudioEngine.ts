/**
 * VAK (Visual, Auditory, Kinesthetic) Audio Engine & Synthesizer
 * Provides real-time Tanpura/Root Drones, Drum voices, Plucked chords, 
 * Vocal monitoring with Reverb, and Meend ribbon synthesizer.
 * 100% Client-Side Web Audio API.
 */

export class VakAudioEngine {
  private static instance: VakAudioEngine;
  private ctx: AudioContext | null = null;
  
  // Drone oscillator state
  private droneGain: GainNode | null = null;
  private droneOscillators: OscillatorNode[] = [];
  private isDronePlaying = false;
  
  // Vocal monitoring state
  private micStream: MediaStream | null = null;
  private micSource: MediaStreamAudioSourceNode | null = null;
  private monitorGain: GainNode | null = null;
  private monitorReverb: ConvolverNode | null = null;
  private isMonitoring = false;

  // Ribbon synth state
  private ribbonOsc: OscillatorNode | null = null;
  private ribbonGain: GainNode | null = null;

  public static getInstance(): VakAudioEngine {
    if (!VakAudioEngine.instance) {
      VakAudioEngine.instance = new VakAudioEngine();
    }
    return VakAudioEngine.instance;
  }

  public getContext(): AudioContext {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      this.ctx = new AudioCtx();
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
    return this.ctx;
  }

  // --- HAPTIC FEEDBACK ---
  public triggerHaptic(durationMs = 15) {
    if (typeof window !== 'undefined' && 'navigator' in window && navigator.vibrate) {
      try {
        navigator.vibrate(durationMs);
      } catch (_) {}
    }
  }

  // --- AUDITORY: TANPURA / ROOT DRONE ---
  public noteToFreq(note: string, octave = 3): number {
    const notes = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
    const cleanNote = note.replace(/\d/g, '').trim();
    const noteIndex = notes.indexOf(cleanNote);
    if (noteIndex === -1) return 130.81; // C3
    // MIDI note for note in octave: 12 * (octave + 1) + noteIndex
    const midi = 12 * (octave + 1) + noteIndex;
    return 440 * Math.pow(2, (midi - 69) / 12);
  }

  public startDrone(rootNote = 'C', octave = 2, volume = 0.4) {
    this.stopDrone();
    const ctx = this.getContext();
    const rootFreq = this.noteToFreq(rootNote, octave);
    const fifthFreq = rootFreq * 1.5; // Pa (Fifth)
    const octaveFreq = rootFreq * 2.0; // Tar Sa (Octave)

    const masterDroneGain = ctx.createGain();
    masterDroneGain.gain.setValueAtTime(0.001, ctx.currentTime);
    masterDroneGain.gain.exponentialRampToValueAtTime(volume, ctx.currentTime + 1.2);
    masterDroneGain.connect(ctx.destination);
    this.droneGain = masterDroneGain;

    // Frequencies simulating Indian Tanpura harmonics (Pa, Sa, Sa, Sa)
    const freqs = [
      { freq: fifthFreq, type: 'triangle' as OscillatorType, detune: 2, gain: 0.35 },
      { freq: rootFreq, type: 'sawtooth' as OscillatorType, detune: -1, gain: 0.25 },
      { freq: rootFreq * 1.002, type: 'sine' as OscillatorType, detune: 3, gain: 0.3 },
      { freq: octaveFreq, type: 'triangle' as OscillatorType, detune: -2, gain: 0.2 }
    ];

    this.droneOscillators = freqs.map(({ freq, type, detune, gain }) => {
      const osc = ctx.createOscillator();
      const oscGain = ctx.createGain();
      
      osc.type = type;
      osc.frequency.setValueAtTime(freq, ctx.currentTime);
      osc.detune.setValueAtTime(detune, ctx.currentTime);

      // Low pass filter for warm acoustic resonance
      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(1200, ctx.currentTime);

      oscGain.gain.setValueAtTime(gain, ctx.currentTime);

      osc.connect(filter);
      filter.connect(oscGain);
      oscGain.connect(masterDroneGain);

      osc.start();
      return osc;
    });

    this.isDronePlaying = true;
  }

  public stopDrone() {
    if (this.droneGain && this.ctx) {
      try {
        this.droneGain.gain.exponentialRampToValueAtTime(0.0001, this.ctx.currentTime + 0.5);
      } catch (_) {}
    }
    setTimeout(() => {
      this.droneOscillators.forEach(osc => {
        try { osc.stop(); osc.disconnect(); } catch (_) {}
      });
      this.droneOscillators = [];
      if (this.droneGain) {
        try { this.droneGain.disconnect(); } catch (_) {}
        this.droneGain = null;
      }
    }, 550);
    this.isDronePlaying = false;
  }

  public isDroneActive(): boolean {
    return this.isDronePlaying;
  }

  // --- AUDITORY: VOCAL IN-EAR MONITOR WITH REVERB ---
  public async toggleVocalMonitor(enable: boolean, reverbLevel = 0.3): Promise<boolean> {
    const ctx = this.getContext();

    if (!enable) {
      if (this.monitorGain) {
        this.monitorGain.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.1);
      }
      this.isMonitoring = false;
      return false;
    }

    try {
      if (!this.micStream) {
        this.micStream = await navigator.mediaDevices.getUserMedia({
          audio: {
            echoCancellation: false,
            noiseSuppression: false,
            autoGainControl: false
          }
        });
      }

      this.micSource = ctx.createMediaStreamSource(this.micStream);
      this.monitorGain = ctx.createGain();
      this.monitorGain.gain.setValueAtTime(0.7, ctx.currentTime);

      // Simple algorithmic impulse response for studio reverb
      if (!this.monitorReverb) {
        const sampleRate = ctx.sampleRate;
        const length = sampleRate * 1.5;
        const impulse = ctx.createBuffer(2, length, sampleRate);
        const left = impulse.getChannelData(0);
        const right = impulse.getChannelData(1);
        for (let i = 0; i < length; i++) {
          const decay = Math.exp(-i / (sampleRate * 0.4));
          left[i] = (Math.random() * 2 - 1) * decay;
          right[i] = (Math.random() * 2 - 1) * decay;
        }
        this.monitorReverb = ctx.createConvolver();
        this.monitorReverb.buffer = impulse;
      }

      const dryGain = ctx.createGain();
      dryGain.gain.setValueAtTime(1.0 - reverbLevel * 0.5, ctx.currentTime);

      const wetGain = ctx.createGain();
      wetGain.gain.setValueAtTime(reverbLevel, ctx.currentTime);

      // Connect graph
      this.micSource.connect(dryGain);
      this.micSource.connect(this.monitorReverb);
      this.monitorReverb.connect(wetGain);

      dryGain.connect(this.monitorGain);
      wetGain.connect(this.monitorGain);
      this.monitorGain.connect(ctx.destination);

      this.isMonitoring = true;
      return true;
    } catch (err) {
      console.warn('Vocal monitor initialization failed:', err);
      this.isMonitoring = false;
      return false;
    }
  }

  public isMonitorActive(): boolean {
    return this.isMonitoring;
  }

  // --- KINESTHETIC: TACTILE SOUND PADS ---
  public playPadSound(padId: string, rootKey = 'C') {
    const ctx = this.getContext();
    this.triggerHaptic(18);

    const now = ctx.currentTime;
    const baseFreq = this.noteToFreq(rootKey, 3);

    switch (padId) {
      case 'kick': {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.frequency.setValueAtTime(140, now);
        osc.frequency.exponentialRampToValueAtTime(38, now + 0.18);
        gain.gain.setValueAtTime(1.0, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.28);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.3);
        break;
      }
      case 'snare': {
        // Noise buffer
        const bufferSize = ctx.sampleRate * 0.2;
        const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;
        const noise = ctx.createBufferSource();
        noise.buffer = buffer;
        const noiseFilter = ctx.createBiquadFilter();
        noiseFilter.type = 'highpass';
        noiseFilter.frequency.setValueAtTime(1000, now);
        const noiseGain = ctx.createGain();
        noiseGain.gain.setValueAtTime(0.8, now);
        noiseGain.gain.exponentialRampToValueAtTime(0.01, now + 0.18);
        noise.connect(noiseFilter);
        noiseFilter.connect(noiseGain);
        noiseGain.connect(ctx.destination);
        noise.start(now);

        // Body tone
        const osc = ctx.createOscillator();
        const oscGain = ctx.createGain();
        osc.frequency.setValueAtTime(180, now);
        osc.frequency.exponentialRampToValueAtTime(80, now + 0.12);
        oscGain.gain.setValueAtTime(0.5, now);
        oscGain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
        osc.connect(oscGain);
        oscGain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.15);
        break;
      }
      case 'hihat': {
        const bufferSize = ctx.sampleRate * 0.08;
        const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;
        const noise = ctx.createBufferSource();
        noise.buffer = buffer;
        const filter = ctx.createBiquadFilter();
        filter.type = 'highpass';
        filter.frequency.setValueAtTime(6500, now);
        const gain = ctx.createGain();
        gain.gain.setValueAtTime(0.6, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.07);
        noise.connect(filter);
        filter.connect(gain);
        gain.connect(ctx.destination);
        noise.start(now);
        break;
      }
      case 'tabla': {
        // Resonant Bayan bass modulation
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(baseFreq * 0.5, now);
        osc.frequency.exponentialRampToValueAtTime(baseFreq * 0.65, now + 0.08);
        osc.frequency.exponentialRampToValueAtTime(baseFreq * 0.45, now + 0.35);
        gain.gain.setValueAtTime(0.9, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.4);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.45);
        break;
      }
      case 'piano_chord': {
        // Triad chord (Root, Major Third, Fifth)
        const triadOffsets = [1, 1.2599, 1.4983];
        triadOffsets.forEach((ratio, idx) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'triangle';
          osc.frequency.setValueAtTime(baseFreq * ratio * 1.5, now);
          const velocity = 0.35 / (idx + 1);
          gain.gain.setValueAtTime(velocity, now);
          gain.gain.exponentialRampToValueAtTime(0.001, now + 1.2);
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start(now);
          osc.stop(now + 1.3);
        });
        break;
      }
      case 'guitar_strum': {
        const stringRatios = [1, 1.2599, 1.4983, 2.0];
        stringRatios.forEach((ratio, idx) => {
          const delay = idx * 0.035; // Strum spread
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'sawtooth';
          osc.frequency.setValueAtTime(baseFreq * ratio, now + delay);
          const filter = ctx.createBiquadFilter();
          filter.type = 'lowpass';
          filter.frequency.setValueAtTime(2400, now + delay);
          gain.gain.setValueAtTime(0.28, now + delay);
          gain.gain.exponentialRampToValueAtTime(0.001, now + delay + 0.9);
          osc.connect(filter);
          filter.connect(gain);
          gain.connect(ctx.destination);
          osc.start(now + delay);
          osc.stop(now + delay + 1.0);
        });
        break;
      }
      case 'synth_lead': {
        const osc = ctx.createOscillator();
        const filter = ctx.createBiquadFilter();
        const gain = ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(baseFreq * 2, now);
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(800, now);
        filter.frequency.exponentialRampToValueAtTime(3500, now + 0.1);
        filter.frequency.exponentialRampToValueAtTime(900, now + 0.5);
        gain.gain.setValueAtTime(0.4, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.6);
        osc.connect(filter);
        filter.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.65);
        break;
      }
      case 'swar_drone': {
        // Harmonium Swar breath pulse
        const osc1 = ctx.createOscillator();
        const osc2 = ctx.createOscillator();
        const gain = ctx.createGain();
        osc1.type = 'sawtooth';
        osc2.type = 'sawtooth';
        osc1.frequency.setValueAtTime(baseFreq, now);
        osc2.frequency.setValueAtTime(baseFreq, now);
        osc2.detune.setValueAtTime(4, now); // Sweet beating detune
        const filter = ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(1400, now);
        gain.gain.setValueAtTime(0.35, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 1.5);
        osc1.connect(filter);
        osc2.connect(filter);
        filter.connect(gain);
        gain.connect(ctx.destination);
        osc1.start(now);
        osc2.start(now);
        osc1.stop(now + 1.6);
        osc2.stop(now + 1.6);
        break;
      }
    }
  }

  // --- KINESTHETIC: MEEND / GLISSANDO RIBBON SYNTH ---
  public startRibbonGlide(initialFreq: number) {
    const ctx = this.getContext();
    this.stopRibbonGlide();

    this.ribbonOsc = ctx.createOscillator();
    this.ribbonGain = ctx.createGain();

    this.ribbonOsc.type = 'triangle';
    this.ribbonOsc.frequency.setValueAtTime(initialFreq, ctx.currentTime);

    // Warm filter
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(2000, ctx.currentTime);

    this.ribbonGain.gain.setValueAtTime(0.001, ctx.currentTime);
    this.ribbonGain.gain.linearRampToValueAtTime(0.4, ctx.currentTime + 0.05);

    this.ribbonOsc.connect(filter);
    filter.connect(this.ribbonGain);
    this.ribbonGain.connect(ctx.destination);

    this.ribbonOsc.start();
  }

  public updateRibbonGlide(freq: number) {
    if (this.ribbonOsc && this.ctx) {
      this.ribbonOsc.frequency.setTargetAtTime(freq, this.ctx.currentTime, 0.02);
    }
  }

  public stopRibbonGlide() {
    if (this.ribbonGain && this.ctx) {
      try {
        this.ribbonGain.gain.linearRampToValueAtTime(0.001, this.ctx.currentTime + 0.08);
      } catch (_) {}
    }
    setTimeout(() => {
      if (this.ribbonOsc) {
        try { this.ribbonOsc.stop(); this.ribbonOsc.disconnect(); } catch (_) {}
        this.ribbonOsc = null;
      }
      if (this.ribbonGain) {
        try { this.ribbonGain.disconnect(); } catch (_) {}
        this.ribbonGain = null;
      }
    }, 100);
  }

  // --- AUDITORY: SARGAM REFERENCE PITCH ---
  public playReferenceTone(freq: number, durationSec = 1.0) {
    const ctx = this.getContext();
    this.triggerHaptic(12);

    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, now);

    // Envelope
    gain.gain.setValueAtTime(0.001, now);
    gain.gain.linearRampToValueAtTime(0.4, now + 0.05);
    gain.gain.exponentialRampToValueAtTime(0.001, now + durationSec);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + durationSec + 0.05);
  }
}
