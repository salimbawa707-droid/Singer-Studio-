import React, { useState, useEffect, useRef } from 'react';
import { 
  Eye, 
  Headphones, 
  Hand, 
  Volume2, 
  VolumeX, 
  Sparkles, 
  Play, 
  Square, 
  Mic, 
  MicOff, 
  Activity, 
  Gauge, 
  CheckCircle2, 
  RefreshCw, 
  Sliders, 
  Radio, 
  ArrowLeft,
  ChevronRight,
  Flame,
  Zap,
  Music,
  Share2
} from 'lucide-react';
import { StudioProject, ScreenId } from '../types/audio';
import { VakAudioEngine } from '../services/vakAudioEngine';
import { WebAudioEngine } from '../services/webAudioEngine';

interface VakScreenProps {
  currentProject: StudioProject | null;
  onNavigate: (screen: ScreenId) => void;
  onUpdateProject?: (updated: Partial<StudioProject>) => void;
}

const CHROMATIC_NOTES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

const SARGAM_SWARAS = [
  { swar: 'Sa', western: 'C', offset: 0, hindi: 'सा' },
  { swar: 'Re', western: 'D', offset: 2, hindi: 'रे' },
  { swar: 'Ga', western: 'E', offset: 4, hindi: 'ग' },
  { swar: 'Ma', western: 'F', offset: 5, hindi: 'म' },
  { swar: 'Pa', western: 'G', offset: 7, hindi: 'प' },
  { swar: 'Dha', western: 'A', offset: 9, hindi: 'ध' },
  { swar: 'Ni', western: 'B', offset: 11, hindi: 'नी' },
  { swar: "Sa'", western: 'C5', offset: 12, hindi: "सां" }
];

export const VakScreen: React.FC<VakScreenProps> = ({
  currentProject,
  onNavigate,
  onUpdateProject
}) => {
  const [activeTab, setActiveTab] = useState<'visual' | 'auditory' | 'kinesthetic' | 'all'>('all');
  const [selectedKey, setSelectedKey] = useState<string>(currentProject?.key || 'C');
  const [scaleType, setScaleType] = useState<'major' | 'minor'>(currentProject?.scale || 'major');

  // Audio / Pitch Tracking state
  const [isListening, setIsListening] = useState<boolean>(false);
  const [detectedPitch, setDetectedPitch] = useState<{
    note: string;
    freq: number;
    cents: number;
    inTune: boolean;
    confidence: number;
  }>({
    note: '--',
    freq: 0,
    cents: 0,
    inTune: false,
    confidence: 0
  });

  // Auditory State
  const [isDronePlaying, setIsDronePlaying] = useState<boolean>(false);
  const [droneVolume, setDroneVolume] = useState<number>(0.4);
  const [isMonitoring, setIsMonitoring] = useState<boolean>(false);
  const [monitorReverb, setMonitorReverb] = useState<number>(0.35);
  const [activeSwar, setActiveSwar] = useState<string | null>(null);

  // Kinesthetic State
  const [pressedPad, setPressedPad] = useState<string | null>(null);
  const [tapTimestamps, setTapTimestamps] = useState<number[]>([]);
  const [calculatedBpm, setCalculatedBpm] = useState<number>(currentProject?.bpm || 120);
  const [isRibbonActive, setIsRibbonActive] = useState<boolean>(false);
  const [ribbonFreq, setRibbonFreq] = useState<number>(261.63);

  // Canvas Refs
  const visualizerCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const animFrameIdRef = useRef<number | null>(null);
  const micAnalyserRef = useRef<AnalyserNode | null>(null);
  const ribbonRef = useRef<HTMLDivElement | null>(null);

  const vakEngine = VakAudioEngine.getInstance();
  const webAudio = WebAudioEngine.getInstance();

  // Clean up on unmount
  useEffect(() => {
    return () => {
      vakEngine.stopDrone();
      vakEngine.toggleVocalMonitor(false);
      vakEngine.stopRibbonGlide();
      if (animFrameIdRef.current) {
        cancelAnimationFrame(animFrameIdRef.current);
      }
    };
  }, []);

  // Compute scale notes for visual highlighting
  const getScaleNotes = (root: string, type: 'major' | 'minor'): string[] => {
    const rootIdx = CHROMATIC_NOTES.indexOf(root);
    if (rootIdx === -1) return CHROMATIC_NOTES;
    const intervals = type === 'major' ? [0, 2, 4, 5, 7, 9, 11] : [0, 2, 3, 5, 7, 8, 10];
    return intervals.map(int => CHROMATIC_NOTES[(rootIdx + int) % 12]);
  };

  const scaleNotes = getScaleNotes(selectedKey, scaleType);

  // --- START/STOP LIVE PITCH AND VISUALIZER ---
  const toggleListening = async () => {
    if (isListening) {
      if (animFrameIdRef.current) {
        cancelAnimationFrame(animFrameIdRef.current);
      }
      setIsListening(false);
      return;
    }

    try {
      const analyser = await webAudio.startMicStream();
      micAnalyserRef.current = analyser;
      setIsListening(true);
      startVisualizerLoop(analyser);
    } catch (err) {
      console.error('Microphone access denied:', err);
    }
  };

  const startVisualizerLoop = (analyser: AnalyserNode) => {
    const bufferLength = analyser.fftSize;
    const timeData = new Float32Array(bufferLength);
    const freqData = new Uint8Array(analyser.frequencyBinCount);

    const update = () => {
      analyser.getFloatTimeDomainData(timeData);
      analyser.getByteFrequencyData(freqData);

      // Simple robust autocorrelation for live pitch
      const pitchResult = detectPitchAutocorrelation(timeData, webAudio.getContext().sampleRate);
      if (pitchResult) {
        setDetectedPitch(pitchResult);
      }

      // Draw Waveform & Spectrum to Canvas
      drawVisualizer(timeData, freqData);

      animFrameIdRef.current = requestAnimationFrame(update);
    };

    update();
  };

  // Fast autocorrelation pitch detector
  const detectPitchAutocorrelation = (
    buffer: Float32Array,
    sampleRate: number
  ): { note: string; freq: number; cents: number; inTune: boolean; confidence: number } | null => {
    let sumSquares = 0;
    for (let i = 0; i < buffer.length; i++) {
      sumSquares += buffer[i] * buffer[i];
    }
    const rms = Math.sqrt(sumSquares / buffer.length);
    if (rms < 0.015) {
      return null; // Noise floor
    }

    // Normalized autocorrelation
    const minPeriod = Math.floor(sampleRate / 1000); // 1000 Hz ceiling
    const maxPeriod = Math.floor(sampleRate / 65);   // 65 Hz floor
    let bestPeriod = -1;
    let bestCorr = 0;

    for (let period = minPeriod; period <= maxPeriod; period++) {
      let corr = 0;
      for (let i = 0; i < buffer.length - period; i++) {
        corr += buffer[i] * buffer[i + period];
      }
      corr = corr / (buffer.length - period);
      if (corr > bestCorr) {
        bestCorr = corr;
        bestPeriod = period;
      }
    }

    if (bestPeriod > 0 && bestCorr > 0.35) {
      const freq = sampleRate / bestPeriod;
      const midi = 69 + 12 * Math.log2(freq / 440);
      const roundedMidi = Math.round(midi);
      const noteName = CHROMATIC_NOTES[roundedMidi % 12];
      const cents = Math.round((midi - roundedMidi) * 100);
      const inTune = Math.abs(cents) <= 12;

      return {
        note: noteName,
        freq: Math.round(freq * 10) / 10,
        cents,
        inTune,
        confidence: Math.min(100, Math.round(bestCorr * 100))
      };
    }
    return null;
  };

  // Draw Audio Visualizer on Canvas
  const drawVisualizer = (timeData: Float32Array, freqData: Uint8Array) => {
    const canvas = visualizerCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;

    ctx.clearRect(0, 0, width, height);

    // Subtle dark gradient background
    const bgGrad = ctx.createLinearGradient(0, 0, width, height);
    bgGrad.addColorStop(0, '#0f172a');
    bgGrad.addColorStop(1, '#090d16');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, width, height);

    // 1. Draw Frequency Bars (Spectrum)
    const barWidth = (width / 48);
    for (let i = 0; i < 48; i++) {
      const val = freqData[i * 4] || 0;
      const barHeight = (val / 255) * (height * 0.7);
      const x = i * barWidth;
      const y = height - barHeight;

      const grad = ctx.createLinearGradient(0, y, 0, height);
      grad.addColorStop(0, '#818cf8');
      grad.addColorStop(1, 'rgba(99, 102, 241, 0.15)');
      ctx.fillStyle = grad;
      ctx.fillRect(x, y, barWidth - 1.5, barHeight);
    }

    // 2. Draw Smooth Pitch Waveform Curve
    ctx.lineWidth = 2.2;
    ctx.strokeStyle = '#38bdf8';
    ctx.beginPath();

    const sliceWidth = width / timeData.length;
    let x = 0;

    for (let i = 0; i < timeData.length; i += 4) {
      const v = timeData[i];
      const y = (height / 2) + v * (height * 0.4);

      if (i === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
      x += sliceWidth * 4;
    }
    ctx.stroke();

    // Center Reference zero line
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, height / 2);
    ctx.lineTo(width, height / 2);
    ctx.stroke();
  };

  // --- AUDITORY: TANPURA DRONE TOGGLE ---
  const toggleDrone = () => {
    if (isDronePlaying) {
      vakEngine.stopDrone();
      setIsDronePlaying(false);
    } else {
      vakEngine.startDrone(selectedKey, 2, droneVolume);
      setIsDronePlaying(true);
    }
  };

  // --- AUDITORY: VOCAL IN-EAR MONITOR TOGGLE ---
  const toggleMonitor = async () => {
    const nextState = !isMonitoring;
    const active = await vakEngine.toggleVocalMonitor(nextState, monitorReverb);
    setIsMonitoring(active);
  };

  // --- AUDITORY: SARGAM PITCH PLAYBACK ---
  const playSwarPitch = (swarItem: typeof SARGAM_SWARAS[0]) => {
    setActiveSwar(swarItem.swar);
    const rootFreq = vakEngine.noteToFreq(selectedKey, 3);
    const swarFreq = rootFreq * Math.pow(2, swarItem.offset / 12);
    vakEngine.playReferenceTone(swarFreq, 1.2);
    setTimeout(() => {
      setActiveSwar(null);
    }, 1200);
  };

  // --- KINESTHETIC: TOUCH PAD TRIGGER ---
  const handlePadPress = (padId: string) => {
    setPressedPad(padId);
    vakEngine.playPadSound(padId, selectedKey);
    setTimeout(() => setPressedPad(null), 160);
  };

  // --- KINESTHETIC: TAP TEMPO ---
  const handleTapTempo = () => {
    vakEngine.triggerHaptic(20);
    const now = performance.now();
    const newTimestamps = [...tapTimestamps, now].filter(t => now - t < 3500);

    if (newTimestamps.length > 1) {
      const intervals: number[] = [];
      for (let i = 1; i < newTimestamps.length; i++) {
        intervals.push(newTimestamps[i] - newTimestamps[i - 1]);
      }
      const avgInterval = intervals.reduce((a, b) => a + b, 0) / intervals.length;
      const bpm = Math.round(60000 / avgInterval);
      if (bpm >= 45 && bpm <= 220) {
        setCalculatedBpm(bpm);
      }
    }
    setTapTimestamps(newTimestamps);
  };

  // --- KINESTHETIC: MEEND RIBBON TOUCH ---
  const handleRibbonTouch = (clientX: number) => {
    if (!ribbonRef.current) return;
    const rect = ribbonRef.current.getBoundingClientRect();
    const ratio = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
    
    // Frequency between Root and Octave * 2 (e.g. C3 to C5)
    const baseFreq = vakEngine.noteToFreq(selectedKey, 3);
    const glideFreq = baseFreq * Math.pow(2, ratio * 2);

    setRibbonFreq(Math.round(glideFreq * 10) / 10);

    if (!isRibbonActive) {
      setIsRibbonActive(true);
      vakEngine.startRibbonGlide(glideFreq);
      vakEngine.triggerHaptic(15);
    } else {
      vakEngine.updateRibbonGlide(glideFreq);
    }
  };

  const handleRibbonEnd = () => {
    setIsRibbonActive(false);
    vakEngine.stopRibbonGlide();
  };

  // Apply discovered Key & BPM into current Studio Project
  const handleApplyToProject = () => {
    if (onUpdateProject) {
      onUpdateProject({
        key: selectedKey,
        scale: scaleType,
        bpm: calculatedBpm
      });
      vakEngine.triggerHaptic(30);
    }
  };

  return (
    <div className="space-y-4 pb-24 max-w-lg mx-auto">
      {/* VAK SYSTEM HEADER */}
      <div className="bg-gradient-to-br from-indigo-950 via-slate-900 to-cyan-950 border border-indigo-500/30 rounded-2xl p-4 shadow-xl relative overflow-hidden">
        <div className="flex items-center justify-between">
          <button
            onClick={() => onNavigate('home')}
            className="p-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-300 transition-colors flex items-center space-x-1 text-xs font-semibold"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Studio</span>
          </button>

          <div className="flex items-center space-x-1.5">
            <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 text-[10px] font-bold tracking-wider uppercase">
              Multimodal VĀK Engine
            </span>
          </div>
        </div>

        <div className="mt-3">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 rounded-xl bg-indigo-500/20 border border-indigo-500/40 flex items-center justify-center text-indigo-400">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-black text-white tracking-tight flex items-center space-x-1.5">
                <span>VĀK SYSTEM</span>
                <span className="text-xs font-medium text-slate-400">/ वाक् प्रणाली</span>
              </h2>
              <p className="text-[11px] text-slate-300 font-medium">
                Visual • Auditory • Kinesthetic Singing & Performance Suite
              </p>
            </div>
          </div>
        </div>

        {/* Global Key & BPM Quick Ribbon */}
        <div className="mt-3 pt-3 border-t border-indigo-500/20 flex items-center justify-between gap-2 flex-wrap text-xs">
          <div className="flex items-center space-x-2">
            <span className="text-slate-400 font-medium">Root Key:</span>
            <select
              value={selectedKey}
              onChange={(e) => {
                setSelectedKey(e.target.value);
                if (isDronePlaying) {
                  vakEngine.startDrone(e.target.value, 2, droneVolume);
                }
              }}
              className="bg-slate-800 border border-slate-700 text-white rounded-lg px-2 py-1 font-bold text-xs focus:ring-1 focus:ring-indigo-400"
            >
              {CHROMATIC_NOTES.map(n => (
                <option key={n} value={n}>{n}</option>
              ))}
            </select>

            <select
              value={scaleType}
              onChange={(e) => setScaleType(e.target.value as 'major' | 'minor')}
              className="bg-slate-800 border border-slate-700 text-slate-300 rounded-lg px-2 py-1 text-xs"
            >
              <option value="major">Major / बिलावल</option>
              <option value="minor">Minor / भैरवी</option>
            </select>
          </div>

          <div className="flex items-center space-x-2">
            <span className="text-slate-400 font-medium">{calculatedBpm} BPM</span>
            <button
              onClick={handleApplyToProject}
              className="px-2.5 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-[11px] transition-all active:scale-95 shadow-sm"
              title="Apply Key & BPM to current Studio Project"
            >
              Sync to Project
            </button>
          </div>
        </div>
      </div>

      {/* V - A - K MODE SELECTOR PILLS */}
      <div className="grid grid-cols-4 gap-1.5 bg-slate-900/80 p-1 rounded-xl border border-slate-800">
        {[
          { id: 'all', label: 'All-in-1', icon: Zap, sub: 'संपूर्ण' },
          { id: 'visual', label: 'Visual (V)', icon: Eye, sub: 'दृश्य' },
          { id: 'auditory', label: 'Auditory (A)', icon: Headphones, sub: 'श्रव्य' },
          { id: 'kinesthetic', label: 'Kinesthetic (K)', icon: Hand, sub: 'स्पर्श' }
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex flex-col items-center py-2 px-1 rounded-lg transition-all ${
                isActive
                  ? 'bg-indigo-600 text-white shadow-md font-bold'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60 font-medium'
              }`}
            >
              <Icon className="w-4 h-4 mb-0.5" />
              <span className="text-[11px] leading-tight">{tab.label}</span>
              <span className="text-[9px] opacity-75">{tab.sub}</span>
            </button>
          );
        })}
      </div>

      {/* ========================================================================= */}
      {/* 1. VISUAL SYSTEM (दृश्य प्रणाली) */}
      {/* ========================================================================= */}
      {(activeTab === 'visual' || activeTab === 'all') && (
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 shadow-lg space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <div className="w-7 h-7 rounded-lg bg-cyan-500/20 text-cyan-400 flex items-center justify-center">
                <Eye className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-cyan-400">
                  Visual System (दृश्य)
                </h3>
                <p className="text-[10px] text-slate-400">
                  Harmonic Chroma Wheel & Real-time Spectral Waveform
                </p>
              </div>
            </div>

            <button
              onClick={toggleListening}
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-xl font-bold text-xs transition-all active:scale-95 ${
                isListening
                  ? 'bg-rose-500/20 text-rose-400 border border-rose-500/50 animate-pulse'
                  : 'bg-cyan-600 hover:bg-cyan-500 text-white shadow-md'
              }`}
            >
              {isListening ? (
                <>
                  <MicOff className="w-3.5 h-3.5" />
                  <span>Stop Pitch</span>
                </>
              ) : (
                <>
                  <Mic className="w-3.5 h-3.5" />
                  <span>Start Live Tuner</span>
                </>
              )}
            </button>
          </div>

          {/* HARMONIC CIRCULAR CHROMA WHEEL */}
          <div className="bg-slate-950/70 border border-slate-800/80 rounded-xl p-3 flex flex-col items-center justify-center relative">
            <div className="relative w-52 h-52 flex items-center justify-center my-2">
              {/* Circular Ring Path */}
              <div className="absolute inset-0 rounded-full border border-slate-800/80" />
              
              {/* 12 Chromatic Notes placed on circle */}
              {CHROMATIC_NOTES.map((note, idx) => {
                const angle = (idx * 30 - 90) * (Math.PI / 180);
                const radius = 84; // px
                const x = Math.cos(angle) * radius;
                const y = Math.sin(angle) * radius;

                const isRoot = note === selectedKey;
                const inScale = scaleNotes.includes(note);
                const isCurrentHit = detectedPitch.note === note;

                return (
                  <div
                    key={note}
                    style={{
                      transform: `translate(${x}px, ${y}px)`
                    }}
                    className={`absolute w-7 h-7 rounded-full flex items-center justify-center text-xs font-black transition-all ${
                      isCurrentHit
                        ? 'bg-emerald-500 text-slate-950 shadow-lg shadow-emerald-500/50 scale-125 z-10 animate-bounce'
                        : isRoot
                        ? 'bg-indigo-600 text-white border border-indigo-400 shadow-md scale-110'
                        : inScale
                        ? 'bg-slate-800 text-indigo-300 border border-slate-700'
                        : 'bg-slate-900/60 text-slate-600'
                    }`}
                  >
                    {note}
                  </div>
                );
              })}

              {/* Center Pitch Accuracy Readout */}
              <div className="text-center z-10">
                <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400">
                  Current Pitch
                </span>
                <div className="text-3xl font-black text-white tracking-tight">
                  {detectedPitch.note}
                </div>
                <div className="flex items-center justify-center space-x-1 text-[11px]">
                  <span className="text-slate-400">{detectedPitch.freq} Hz</span>
                  {detectedPitch.note !== '--' && (
                    <span className={`font-bold ${detectedPitch.inTune ? 'text-emerald-400' : 'text-amber-400'}`}>
                      ({detectedPitch.cents > 0 ? `+${detectedPitch.cents}` : detectedPitch.cents}¢)
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Cents Needle Indicator */}
            <div className="w-full max-w-xs mt-1">
              <div className="flex justify-between text-[10px] text-slate-400 px-1 font-mono">
                <span>-50¢ Flat</span>
                <span className="text-emerald-400 font-bold">In-Tune (0¢)</span>
                <span>+50¢ Sharp</span>
              </div>
              <div className="h-2.5 bg-slate-800 rounded-full relative overflow-hidden border border-slate-700/80 mt-1">
                <div className="absolute left-1/2 top-0 bottom-0 w-0.5 bg-emerald-400/70" />
                {detectedPitch.note !== '--' && (
                  <div
                    style={{
                      left: `${Math.min(95, Math.max(5, 50 + detectedPitch.cents))}%`
                    }}
                    className={`absolute top-0 bottom-0 w-2 -ml-1 rounded-full transition-all duration-75 ${
                      detectedPitch.inTune ? 'bg-emerald-400 shadow-md shadow-emerald-400' : 'bg-amber-400'
                    }`}
                  />
                )}
              </div>
            </div>
          </div>

          {/* REALTIME SPECTROGRAM & WAVEFORM CANVAS */}
          <div>
            <div className="flex items-center justify-between mb-1 px-1">
              <span className="text-[10px] font-bold uppercase text-slate-400">Live Frequency Waveform</span>
              <span className="text-[10px] text-slate-500">60 FPS Web Audio</span>
            </div>
            <canvas
              ref={visualizerCanvasRef}
              width={480}
              height={90}
              className="w-full h-20 rounded-xl border border-slate-800 bg-slate-950 shadow-inner"
            />
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 2. AUDITORY SYSTEM (श्रव्य प्रणाली) */}
      {/* ========================================================================= */}
      {(activeTab === 'auditory' || activeTab === 'all') && (
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 shadow-lg space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <div className="w-7 h-7 rounded-lg bg-purple-500/20 text-purple-400 flex items-center justify-center">
                <Headphones className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-purple-400">
                  Auditory System (श्रव्य)
                </h3>
                <p className="text-[10px] text-slate-400">
                  Tanpura Drone, In-Ear Reverb Monitor & Sargam Pitch Ear Training
                </p>
              </div>
            </div>
          </div>

          {/* TWO PRIMARY AUDIO MODES: TANPURA DRONE & VOCAL IN-EAR MONITOR */}
          <div className="grid grid-cols-2 gap-2.5">
            {/* 1. Tanpura / Root Drone Card */}
            <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-3 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-white flex items-center space-x-1">
                    <Radio className="w-3.5 h-3.5 text-indigo-400" />
                    <span>Tanpura Drone</span>
                  </span>
                  <span className="text-[10px] text-indigo-400 font-bold">{selectedKey} Sa-Pa</span>
                </div>
                <p className="text-[10px] text-slate-400 mt-1">
                  Continuous acoustic root drone for pitch grounding
                </p>
              </div>

              <div className="mt-3 space-y-2">
                <div className="flex items-center justify-between text-[10px] text-slate-400">
                  <span>Volume</span>
                  <span>{Math.round(droneVolume * 100)}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  value={droneVolume}
                  onChange={(e) => {
                    const v = parseFloat(e.target.value);
                    setDroneVolume(v);
                    if (isDronePlaying) vakEngine.startDrone(selectedKey, 2, v);
                  }}
                  className="w-full accent-indigo-500 h-1 bg-slate-800 rounded-lg"
                />

                <button
                  onClick={toggleDrone}
                  className={`w-full py-1.5 rounded-lg text-xs font-bold transition-all flex items-center justify-center space-x-1.5 active:scale-95 ${
                    isDronePlaying
                      ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                      : 'bg-slate-800 hover:bg-slate-700 text-slate-300'
                  }`}
                >
                  {isDronePlaying ? <Square className="w-3 h-3 fill-current" /> : <Play className="w-3 h-3 fill-current" />}
                  <span>{isDronePlaying ? 'Stop Drone' : 'Start Drone'}</span>
                </button>
              </div>
            </div>

            {/* 2. In-Ear Vocal Monitor Card */}
            <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-3 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-white flex items-center space-x-1">
                    <Headphones className="w-3.5 h-3.5 text-purple-400" />
                    <span>Ear Monitor</span>
                  </span>
                  <span className="text-[10px] text-purple-400 font-bold">Reverb DSP</span>
                </div>
                <p className="text-[10px] text-slate-400 mt-1">
                  Listen to voice in headphones with low latency
                </p>
              </div>

              <div className="mt-3 space-y-2">
                <div className="flex items-center justify-between text-[10px] text-slate-400">
                  <span>Reverb Space</span>
                  <span>{Math.round(monitorReverb * 100)}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="0.8"
                  step="0.05"
                  value={monitorReverb}
                  onChange={(e) => setMonitorReverb(parseFloat(e.target.value))}
                  className="w-full accent-purple-500 h-1 bg-slate-800 rounded-lg"
                />

                <button
                  onClick={toggleMonitor}
                  className={`w-full py-1.5 rounded-lg text-xs font-bold transition-all flex items-center justify-center space-x-1.5 active:scale-95 ${
                    isMonitoring
                      ? 'bg-purple-600 text-white shadow-md shadow-purple-600/30'
                      : 'bg-slate-800 hover:bg-slate-700 text-slate-300'
                  }`}
                >
                  {isMonitoring ? <VolumeX className="w-3 h-3" /> : <Volume2 className="w-3 h-3" />}
                  <span>{isMonitoring ? 'Disable Monitor' : 'Enable Monitor'}</span>
                </button>
              </div>
            </div>
          </div>

          {/* SARGAM PITCH CALL-AND-RESPONSE (रियाज़) */}
          <div className="bg-slate-950/60 border border-slate-800/80 rounded-xl p-3">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-white">Sargam Ear Training (स्वर रियाज़)</span>
              <span className="text-[10px] text-slate-400">Tap to hear reference pitch</span>
            </div>

            <div className="grid grid-cols-4 sm:grid-cols-8 gap-1.5">
              {SARGAM_SWARAS.map((item) => {
                const isPlaying = activeSwar === item.swar;
                return (
                  <button
                    key={item.swar}
                    onClick={() => playSwarPitch(item)}
                    className={`flex flex-col items-center justify-center py-2 px-1 rounded-xl border transition-all active:scale-95 ${
                      isPlaying
                        ? 'bg-purple-600 text-white border-purple-400 scale-105 shadow-md shadow-purple-600/50'
                        : 'bg-slate-900 border-slate-800 hover:border-slate-700 text-slate-300'
                    }`}
                  >
                    <span className="text-xs font-black">{item.hindi}</span>
                    <span className="text-[10px] opacity-75 font-mono">{item.swar}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 3. KINESTHETIC SYSTEM (स्पर्श / गतिबोधक प्रणाली) */}
      {/* ========================================================================= */}
      {(activeTab === 'kinesthetic' || activeTab === 'all') && (
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 shadow-lg space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <div className="w-7 h-7 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center">
                <Hand className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-amber-400">
                  Kinesthetic System (स्पर्श / गतिबोधक)
                </h3>
                <p className="text-[10px] text-slate-400">
                  Haptic Touch Rhythm Pads, Meend Ribbon & Tap-Tempo
                </p>
              </div>
            </div>

            {/* Tap Tempo Sensor */}
            <button
              onClick={handleTapTempo}
              className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 text-amber-300 font-bold text-xs transition-all active:scale-95"
            >
              <Activity className="w-3.5 h-3.5 animate-pulse" />
              <span>Tap Tempo ({calculatedBpm})</span>
            </button>
          </div>

          {/* 8 TACTILE DRUM & HARMONIC TRIGGER PADS */}
          <div>
            <div className="flex items-center justify-between mb-1.5 px-1">
              <span className="text-[10px] font-bold uppercase text-slate-400">Tactile Performance Pads</span>
              <span className="text-[10px] text-amber-400">Haptic Feedback Active</span>
            </div>

            <div className="grid grid-cols-4 gap-2">
              {[
                { id: 'kick', label: 'Kick', hindi: 'किक', color: 'border-rose-500/30 hover:border-rose-400 text-rose-300' },
                { id: 'snare', label: 'Snare', hindi: 'स्नेयर', color: 'border-amber-500/30 hover:border-amber-400 text-amber-300' },
                { id: 'hihat', label: 'Hi-Hat', hindi: 'हैट', color: 'border-cyan-500/30 hover:border-cyan-400 text-cyan-300' },
                { id: 'tabla', label: 'Tabla Bayan', hindi: 'तबला', color: 'border-emerald-500/30 hover:border-emerald-400 text-emerald-300' },
                { id: 'piano_chord', label: 'Piano Chord', hindi: 'पियानो', color: 'border-indigo-500/30 hover:border-indigo-400 text-indigo-300' },
                { id: 'guitar_strum', label: 'Guitar Strum', hindi: 'गिटार', color: 'border-orange-500/30 hover:border-orange-400 text-orange-300' },
                { id: 'synth_lead', label: 'Synth Pluck', hindi: 'सिंथ', color: 'border-purple-500/30 hover:border-purple-400 text-purple-300' },
                { id: 'swar_drone', label: 'Harmonium', hindi: 'सुर', color: 'border-pink-500/30 hover:border-pink-400 text-pink-300' }
              ].map((pad) => {
                const isPressed = pressedPad === pad.id;
                return (
                  <button
                    key={pad.id}
                    onMouseDown={() => handlePadPress(pad.id)}
                    onTouchStart={(e) => {
                      e.preventDefault();
                      handlePadPress(pad.id);
                    }}
                    className={`h-16 rounded-xl border flex flex-col items-center justify-center transition-all select-none ${pad.color} ${
                      isPressed
                        ? 'bg-white/20 scale-95 shadow-inner'
                        : 'bg-slate-950/70 hover:bg-slate-900 active:scale-95'
                    }`}
                  >
                    <span className="text-xs font-black tracking-tight">{pad.label}</span>
                    <span className="text-[10px] opacity-75">{pad.hindi}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* KINESTHETIC MEEND / GLISSANDO RIBBON */}
          <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-3">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs font-bold text-white flex items-center space-x-1">
                <Flame className="w-3.5 h-3.5 text-amber-400" />
                <span>Tactile Meend & Pitch-Bend Ribbon (मींड रिबन)</span>
              </span>
              <span className="text-[10px] font-mono text-amber-400">
                {isRibbonActive ? `${ribbonFreq} Hz` : 'Slide Finger'}
              </span>
            </div>
            <p className="text-[10px] text-slate-400 mb-2">
              Slide finger horizontally to smoothly bend and glide pitch like Indian classical vocal meend
            </p>

            <div
              ref={ribbonRef}
              onMouseDown={(e) => handleRibbonTouch(e.clientX)}
              onMouseMove={(e) => {
                if (e.buttons === 1) handleRibbonTouch(e.clientX);
              }}
              onMouseUp={handleRibbonEnd}
              onMouseLeave={handleRibbonEnd}
              onTouchStart={(e) => handleRibbonTouch(e.touches[0].clientX)}
              onTouchMove={(e) => handleRibbonTouch(e.touches[0].clientX)}
              onTouchEnd={handleRibbonEnd}
              className={`h-12 rounded-xl border flex items-center justify-between px-3 cursor-ew-resize relative select-none transition-all overflow-hidden ${
                isRibbonActive
                  ? 'border-amber-400 bg-gradient-to-r from-amber-950 via-slate-900 to-amber-950 shadow-lg shadow-amber-500/20'
                  : 'border-slate-800 bg-slate-950 hover:border-slate-700'
              }`}
            >
              <div className="text-[10px] font-bold text-slate-500 uppercase">Lower Octave</div>
              <div className="text-[10px] font-bold text-amber-400/80 tracking-widest">◀ GLIDE & BEND ▶</div>
              <div className="text-[10px] font-bold text-slate-500 uppercase">Upper Octave</div>

              {isRibbonActive && (
                <div className="absolute top-0 bottom-0 w-2 bg-amber-400 shadow-lg shadow-amber-400 animate-pulse pointer-events-none" />
              )}
            </div>
          </div>
        </div>
      )}

      {/* QUICK PIPELINE NAVIGATION BANNER */}
      <div className="bg-slate-900/60 border border-slate-800/80 rounded-xl p-3 flex items-center justify-between">
        <div>
          <h4 className="text-xs font-bold text-white">Ready to Record or Mix?</h4>
          <p className="text-[10px] text-slate-400">Take your discovered Key ({selectedKey}) and BPM ({calculatedBpm}) into the studio</p>
        </div>
        <div className="flex items-center space-x-1.5">
          <button
            onClick={() => onNavigate('record')}
            className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition-all active:scale-95 flex items-center space-x-1"
          >
            <span>Record Vocal</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};
