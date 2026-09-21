import React, { useState, useEffect, useRef } from 'react';
import { 
  Sparkles, 
  Play, 
  Square, 
  RotateCcw, 
  Check, 
  ChevronLeft, 
  Sliders, 
  ToggleLeft, 
  ToggleRight,
  Split,
  Undo2,
  CheckCircle2,
  Radio,
  Zap,
  Volume2,
  Activity,
  Waves,
  ShieldCheck,
  Flame,
  Wind,
  AlertCircle
} from 'lucide-react';
import { WebAudioEngine } from '../services/webAudioEngine';
import { DspPipelineSettings, ScreenId, StudioProject } from '../types/audio';
import { ProductionProgress } from '../components/ProductionProgress';
import { ProductionStageHeader } from '../components/ProductionStageHeader';

interface VocalCleanupScreenProps {
  currentProject: StudioProject | null;
  vocalBuffer: AudioBuffer | null;
  onNavigate: (screen: ScreenId) => void;
  onApplyCleanedVocal: (cleanedBuffer: AudioBuffer, settings?: DspPipelineSettings) => void;
}

interface VocalPreset {
  id: string;
  name: string;
  desc: string;
  icon: string;
  settings: DspPipelineSettings;
}

const VOCAL_PRESETS: VocalPreset[] = [
  {
    id: 'studio_polish',
    name: 'Studio Polish',
    desc: 'Transparent clarity, silky air & subtle de-essing',
    icon: '✨',
    settings: {
      dcRemoval: true,
      hpfCutoff: 80,
      hpfEnabled: true,
      noiseReductionDb: -16,
      noiseReductionEnabled: true,
      deEsserFreq: 7400,
      deEsserGain: -6,
      deEsserEnabled: true,
      compressorThreshold: -18,
      compressorRatio: 3.5,
      compressorEnabled: true,
      limiterCeiling: -0.5,
      limiterEnabled: true,
      normalizeGain: 0.92,
      normalizeEnabled: true,
      humNotchEnabled: true,
      humNotchFreq: 50,
      deClickEnabled: true,
      dePlosiveEnabled: true,
      dePlosiveSensitivity: 0.7,
      warmthEnabled: true,
      warmthGain: 2.0,
      airClarityEnabled: true,
      airClarityGain: 2.5,
      presetName: 'Studio Polish'
    }
  },
  {
    id: 'ac_hum_noise',
    name: 'AC Hum & Fan Tamer',
    desc: 'Heavy stationary noise reduction & 50/60Hz notch',
    icon: '🛡️',
    settings: {
      dcRemoval: true,
      hpfCutoff: 95,
      hpfEnabled: true,
      noiseReductionDb: -24,
      noiseReductionEnabled: true,
      deEsserFreq: 7200,
      deEsserGain: -8,
      deEsserEnabled: true,
      compressorThreshold: -20,
      compressorRatio: 4.0,
      compressorEnabled: true,
      limiterCeiling: -0.5,
      limiterEnabled: true,
      normalizeGain: 0.90,
      normalizeEnabled: true,
      humNotchEnabled: true,
      humNotchFreq: 50,
      deClickEnabled: true,
      dePlosiveEnabled: true,
      dePlosiveSensitivity: 0.85,
      warmthEnabled: true,
      warmthGain: 1.5,
      airClarityEnabled: true,
      airClarityGain: 1.0,
      presetName: 'AC Hum & Fan Tamer'
    }
  },
  {
    id: 'indian_classical',
    name: 'Indian & Ghazal Meend',
    desc: 'Preserves microtonal glissandos, warmth & natural breath',
    icon: '🪕',
    settings: {
      dcRemoval: true,
      hpfCutoff: 70,
      hpfEnabled: true,
      noiseReductionDb: -12,
      noiseReductionEnabled: true,
      deEsserFreq: 8000,
      deEsserGain: -4.5,
      deEsserEnabled: true,
      compressorThreshold: -16,
      compressorRatio: 2.5,
      compressorEnabled: true,
      limiterCeiling: -0.8,
      limiterEnabled: true,
      normalizeGain: 0.88,
      normalizeEnabled: true,
      humNotchEnabled: true,
      humNotchFreq: 50,
      deClickEnabled: true,
      dePlosiveEnabled: true,
      dePlosiveSensitivity: 0.6,
      warmthEnabled: true,
      warmthGain: 3.5,
      airClarityEnabled: true,
      airClarityGain: 2.0,
      presetName: 'Indian & Ghazal Meend'
    }
  },
  {
    id: 'intimate_ballad',
    name: 'Intimate Warmth',
    desc: 'Deep chest resonance, smooth dynamics & soft top-end',
    icon: '🎙️',
    settings: {
      dcRemoval: true,
      hpfCutoff: 65,
      hpfEnabled: true,
      noiseReductionDb: -14,
      noiseReductionEnabled: true,
      deEsserFreq: 7600,
      deEsserGain: -5.0,
      deEsserEnabled: true,
      compressorThreshold: -15,
      compressorRatio: 2.8,
      compressorEnabled: true,
      limiterCeiling: -0.6,
      limiterEnabled: true,
      normalizeGain: 0.90,
      normalizeEnabled: true,
      humNotchEnabled: true,
      humNotchFreq: 50,
      deClickEnabled: true,
      dePlosiveEnabled: true,
      dePlosiveSensitivity: 0.75,
      warmthEnabled: true,
      warmthGain: 4.0,
      airClarityEnabled: true,
      airClarityGain: 1.8,
      presetName: 'Intimate Warmth'
    }
  },
  {
    id: 'harsh_mic_fix',
    name: 'Harsh Mic & Sibilance',
    desc: 'Aggressive de-essing & mouth click removal for phone mics',
    icon: '⚡',
    settings: {
      dcRemoval: true,
      hpfCutoff: 90,
      hpfEnabled: true,
      noiseReductionDb: -18,
      noiseReductionEnabled: true,
      deEsserFreq: 6800,
      deEsserGain: -11,
      deEsserEnabled: true,
      compressorThreshold: -22,
      compressorRatio: 4.5,
      compressorEnabled: true,
      limiterCeiling: -0.5,
      limiterEnabled: true,
      normalizeGain: 0.90,
      normalizeEnabled: true,
      humNotchEnabled: true,
      humNotchFreq: 50,
      deClickEnabled: true,
      dePlosiveEnabled: true,
      dePlosiveSensitivity: 0.9,
      warmthEnabled: true,
      warmthGain: 2.0,
      airClarityEnabled: false,
      airClarityGain: 0.0,
      presetName: 'Harsh Mic & Sibilance'
    }
  }
];

export const VocalCleanupScreen: React.FC<VocalCleanupScreenProps> = ({
  currentProject,
  vocalBuffer,
  onNavigate,
  onApplyCleanedVocal,
}) => {
  const [settings, setSettings] = useState<DspPipelineSettings>(VOCAL_PRESETS[0].settings);
  const [activePresetId, setActivePresetId] = useState<string>('studio_polish');
  const [isProcessing, setIsProcessing] = useState(false);
  const [processedBuffer, setProcessedBuffer] = useState<AudioBuffer | null>(
    currentProject?.cleanedVocalBuffer || null
  );
  const [deltaNoiseBuffer, setDeltaNoiseBuffer] = useState<AudioBuffer | null>(null);
  const [previewRawBuffer, setPreviewRawBuffer] = useState<AudioBuffer | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [compareMode, setCompareMode] = useState<'processed' | 'original' | 'delta'>('processed');
  const [history, setHistory] = useState<DspPipelineSettings[]>([]);
  const [appliedSuccess, setAppliedSuccess] = useState(false);

  // Live Audio Forensic Metrics
  const [rawMetrics, setRawMetrics] = useState<{ peakDb: number; rmsDb: number; noiseFloorDb: number; snrDb: number } | null>(null);
  const [procMetrics, setProcMetrics] = useState<{ peakDb: number; rmsDb: number; noiseFloorDb: number; snrDb: number } | null>(null);

  const [vocalMissingError, setVocalMissingError] = useState<string | null>(null);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const audioEngine = WebAudioEngine.getInstance();

  const getEffectiveRawBuffer = (): AudioBuffer | null => {
    return vocalBuffer || (currentProject?.tracks.find(t => t.type === 'vocal')?.audioBuffer) || previewRawBuffer;
  };

  // Run the 10-stage fine-tuned DSP Vocal Cleaning Engine
  const handleCleanVocal = async (overrideSettings?: DspPipelineSettings) => {
    const activeSettings = overrideSettings || settings;
    const bufferToProcess = getEffectiveRawBuffer();
    
    if (!bufferToProcess) {
      setVocalMissingError('No vocal recording found in the current project. Please record or import a vocal take on the Record screen before running the cleanup engine.');
      setTimeout(() => setVocalMissingError(null), 5000);
      return;
    }

    setVocalMissingError(null);

    setIsProcessing(true);
    setHistory(prev => [...prev, { ...activeSettings }]);

    try {
      // Compute raw input metrics
      const rMet = audioEngine.analyzeAudioMetrics(bufferToProcess);
      setRawMetrics(rMet);

      // Process through 10-stage DSP engine
      const cleaned = await audioEngine.processVocalBuffer(bufferToProcess, activeSettings);
      setProcessedBuffer(cleaned);

      // Compute processed output metrics
      const pMet = audioEngine.analyzeAudioMetrics(cleaned);
      setProcMetrics(pMet);

      // Compute residual delta noise buffer (Original - Cleaned)
      const delta = audioEngine.computeDeltaNoiseBuffer(bufferToProcess, cleaned);
      setDeltaNoiseBuffer(delta);
    } catch (e) {
      console.error("DSP processing failed", e);
    } finally {
      setIsProcessing(false);
    }
  };

  // Switch preset
  const handleSelectPreset = (preset: VocalPreset) => {
    setActivePresetId(preset.id);
    setSettings(preset.settings);
    handleCleanVocal(preset.settings);
  };

  // Playback Toggle
  const handleTogglePlay = () => {
    if (isPlaying) {
      audioEngine.stopAllPlayback();
      setIsPlaying(false);
      return;
    }

    const raw = getEffectiveRawBuffer();
    let bufferToPlay: AudioBuffer | null = null;

    if (compareMode === 'processed') {
      bufferToPlay = processedBuffer || raw;
    } else if (compareMode === 'delta') {
      bufferToPlay = deltaNoiseBuffer || raw;
    } else {
      bufferToPlay = raw;
    }

    if (!bufferToPlay) {
      handleCleanVocal();
      return;
    }

    setIsPlaying(true);
    audioEngine.playBuffer(bufferToPlay, () => {
      setIsPlaying(false);
    });
  };

  const handleApply = () => {
    if (processedBuffer) {
      onApplyCleanedVocal(processedBuffer, settings);
      setAppliedSuccess(true);
      setTimeout(() => setAppliedSuccess(false), 2000);
    }
  };

  const handleReset = () => {
    audioEngine.stopAllPlayback();
    setIsPlaying(false);
    const def = VOCAL_PRESETS[0];
    setActivePresetId(def.id);
    setSettings(def.settings);
    setProcessedBuffer(null);
    setDeltaNoiseBuffer(null);
    setRawMetrics(null);
    setProcMetrics(null);
  };

  const handleUndo = () => {
    if (history.length > 0) {
      const prev = history[history.length - 1];
      setSettings(prev);
      setHistory(history.slice(0, -1));
      handleCleanVocal(prev);
    }
  };

  // Render Visual Waveform Canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;
    ctx.clearRect(0, 0, width, height);

    // Background gradient
    const bgGrad = ctx.createLinearGradient(0, 0, 0, height);
    bgGrad.addColorStop(0, '#090d16');
    bgGrad.addColorStop(1, '#05070c');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, width, height);

    // Center grid line
    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, height / 2);
    ctx.lineTo(width, height / 2);
    ctx.stroke();

    const activeBuf = compareMode === 'processed' 
      ? processedBuffer 
      : (compareMode === 'delta' ? deltaNoiseBuffer : getEffectiveRawBuffer());

    if (activeBuf) {
      const data = activeBuf.getChannelData(0);
      const step = Math.ceil(data.length / width);
      const amp = height / 2 * 0.92;

      ctx.beginPath();
      ctx.moveTo(0, height / 2);

      const colorMap = {
        processed: '#6366f1', // Indigo for Cleaned
        original: '#f59e0b',  // Amber for Original
        delta: '#ec4899'      // Pink for Removed Noise
      };

      ctx.strokeStyle = colorMap[compareMode] || '#6366f1';
      ctx.lineWidth = 1.5;

      for (let i = 0; i < width; i++) {
        let min = 1.0;
        let max = -1.0;
        for (let j = 0; j < step; j++) {
          const val = data[i * step + j] || 0;
          if (val < min) min = val;
          if (val > max) max = val;
        }
        ctx.lineTo(i, (1 + min) * amp);
        ctx.lineTo(i, (1 + max) * amp);
      }
      ctx.stroke();
    }
  }, [processedBuffer, deltaNoiseBuffer, compareMode, previewRawBuffer, vocalBuffer]);

  return (
    <div className="space-y-4 pb-24 text-slate-200">
      {/* Header */}
      <ProductionStageHeader
        currentScreen="cleanup"
        currentProject={currentProject}
        onNavigate={onNavigate}
        title="Vocal Cleaning & Restoration Engine"
        subtitle="10-Stage Deterministic DSP Signal Polish & Noise Elimination"
      />

      <ProductionProgress currentScreen="cleanup" currentProject={currentProject} onNavigate={onNavigate} />

      {/* Preset Quick Selection Bar */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-3.5 space-y-2.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Sparkles className="w-4 h-4 text-amber-400" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300">Studio Vocal Presets</h3>
          </div>
          <span className="text-[11px] text-slate-400">Single-click targeted tuning</span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2">
          {VOCAL_PRESETS.map((preset) => {
            const isActive = activePresetId === preset.id;
            return (
              <button
                key={preset.id}
                onClick={() => handleSelectPreset(preset)}
                className={`p-2.5 rounded-xl text-left border transition-all flex flex-col justify-between ${
                  isActive
                    ? 'bg-indigo-600/20 border-indigo-500 shadow-sm shadow-indigo-500/20 text-white'
                    : 'bg-slate-950/70 border-slate-800 hover:border-slate-700 text-slate-300'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-base">{preset.icon}</span>
                  {isActive && <CheckCircle2 className="w-3.5 h-3.5 text-indigo-400" />}
                </div>
                <div className="text-xs font-bold leading-tight">{preset.name}</div>
                <div className="text-[10px] text-slate-400 line-clamp-1 mt-0.5">{preset.desc}</div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Interactive Audio Waveform & 3-Way Audition Console */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-3.5 shadow-xl">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-white flex items-center space-x-2">
              <Activity className="w-4 h-4 text-indigo-400" />
              <span>Studio Visual Waveform & Audio Audition</span>
            </h3>
            <p className="text-[11px] text-slate-400">Audition Cleaned Take, Original Raw, or Residual Noise Delta</p>
          </div>
          {processedBuffer && (
            <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 text-[11px] font-bold border border-emerald-500/30 flex items-center space-x-1.5">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Restored & Normalized</span>
            </span>
          )}
        </div>

        {/* Canvas Waveform */}
        <div className="rounded-xl overflow-hidden border border-slate-800 relative bg-slate-950">
          <canvas
            ref={canvasRef}
            width={720}
            height={100}
            className="w-full h-24 block"
          />
          <div className="absolute top-2 right-2 text-[10px] font-mono px-2 py-0.5 rounded bg-slate-900/80 border border-slate-700/60 text-slate-300">
            Mode: {compareMode === 'processed' ? '✨ Cleaned Output' : compareMode === 'original' ? '🎙️ Original Raw' : '🎧 Removed Noise (Delta)'}
          </div>
        </div>

        {/* Error banner when vocal is missing */}
        {vocalMissingError && (
          <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl text-amber-300 text-xs font-medium flex items-center space-x-2">
            <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />
            <span>{vocalMissingError}</span>
          </div>
        )}

        {/* 3-Way Mode Switcher & Playback Bar */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
          {/* 3-Way Switcher */}
          <div className="flex items-center bg-slate-950 p-1 rounded-xl border border-slate-800">
            <button
              onClick={() => setCompareMode('processed')}
              className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all text-center ${
                compareMode === 'processed'
                  ? 'bg-indigo-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              ✨ Cleaned (A)
            </button>
            <button
              onClick={() => setCompareMode('original')}
              className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all text-center ${
                compareMode === 'original'
                  ? 'bg-amber-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              🎙️ Original (B)
            </button>
            <button
              onClick={() => setCompareMode('delta')}
              title="Hear only the subtracted noise floor and artifacts"
              className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all text-center ${
                compareMode === 'delta'
                  ? 'bg-pink-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              🎧 Noise Delta
            </button>
          </div>

          {/* Action Trigger Buttons */}
          <div className="flex items-center space-x-2">
            <button
              onClick={() => handleCleanVocal()}
              disabled={isProcessing}
              className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white rounded-xl font-bold text-xs flex items-center justify-center space-x-1.5 shadow-md shadow-indigo-600/30 active:scale-[0.98] transition-all"
            >
              <Sparkles className="w-4 h-4 text-amber-300" />
              <span>{isProcessing ? 'Restoring...' : 'Run Cleaning Engine'}</span>
            </button>

            <button
              onClick={handleTogglePlay}
              className={`px-4 py-2.5 rounded-xl font-bold text-xs flex items-center justify-center space-x-1.5 border active:scale-[0.98] transition-all ${
                isPlaying 
                  ? 'bg-rose-600 border-rose-500 text-white shadow-rose-600/30 shadow-md' 
                  : 'bg-slate-800 border-slate-700 hover:bg-slate-700 text-slate-200'
              }`}
            >
              {isPlaying ? <Square className="w-4 h-4" /> : <Play className="w-4 h-4 text-indigo-400" />}
              <span>{isPlaying ? 'Stop' : 'Audition'}</span>
            </button>

            <button
              onClick={handleUndo}
              disabled={history.length === 0}
              className="p-2.5 text-slate-400 hover:text-white disabled:opacity-30 rounded-xl bg-slate-950 border border-slate-800"
              title="Undo Parameter Change"
            >
              <Undo2 className="w-4 h-4" />
            </button>
            
            <button
              onClick={handleReset}
              className="p-2.5 text-slate-400 hover:text-white rounded-xl bg-slate-950 border border-slate-800"
              title="Reset DSP Engine"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Live Audio Forensic Metrics Comparison HUD */}
        {procMetrics && rawMetrics && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-slate-800 text-xs">
            <div className="bg-slate-950/80 p-2.5 rounded-xl border border-slate-800/80">
              <div className="text-[10px] text-slate-400 uppercase font-semibold">Peak Level</div>
              <div className="font-mono text-sm font-bold text-slate-200 mt-0.5">
                {procMetrics.peakDb} <span className="text-[10px] text-slate-500">dBFS</span>
              </div>
              <div className="text-[10px] text-slate-500">Raw: {rawMetrics.peakDb} dBFS</div>
            </div>

            <div className="bg-slate-950/80 p-2.5 rounded-xl border border-slate-800/80">
              <div className="text-[10px] text-slate-400 uppercase font-semibold">RMS Energy</div>
              <div className="font-mono text-sm font-bold text-slate-200 mt-0.5">
                {procMetrics.rmsDb} <span className="text-[10px] text-slate-500">dBFS</span>
              </div>
              <div className="text-[10px] text-slate-500">Raw: {rawMetrics.rmsDb} dBFS</div>
            </div>

            <div className="bg-slate-950/80 p-2.5 rounded-xl border border-slate-800/80">
              <div className="text-[10px] text-slate-400 uppercase font-semibold">Noise Floor</div>
              <div className="font-mono text-sm font-bold text-emerald-400 mt-0.5">
                {procMetrics.noiseFloorDb} <span className="text-[10px] text-slate-500">dBFS</span>
              </div>
              <div className="text-[10px] text-slate-500">Raw: {rawMetrics.noiseFloorDb} dBFS</div>
            </div>

            <div className="bg-slate-950/80 p-2.5 rounded-xl border border-slate-800/80">
              <div className="text-[10px] text-slate-400 uppercase font-semibold">SNR Clarity Gain</div>
              <div className="font-mono text-sm font-bold text-indigo-400 mt-0.5">
                +{(procMetrics.snrDb - rawMetrics.snrDb).toFixed(1)} <span className="text-[10px] text-slate-500">dB</span>
              </div>
              <div className="text-[10px] text-slate-500">Total SNR: {procMetrics.snrDb} dB</div>
            </div>
          </div>
        )}
      </div>

      {/* Detailed 10-Stage DSP Signal Chain Nodes */}
      <div className="space-y-3">
        <div className="flex items-center justify-between px-1">
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center space-x-1.5">
            <Sliders className="w-3.5 h-3.5 text-indigo-400" />
            <span>Fine-Tuned DSP Modules</span>
          </h4>
          <span className="text-[11px] text-slate-500">Fully deterministic 64-bit precision</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {/* Stage 1: AC Ground Hum & Harmonics Notch */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-3.5 space-y-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <span className="text-[11px] font-mono text-indigo-400 bg-indigo-500/10 px-1.5 py-0.5 rounded">01</span>
                <span className="text-xs font-bold text-white">AC Ground Hum & Buzz Notch</span>
              </div>
              <button
                onClick={() => {
                  setSettings(s => ({ ...s, humNotchEnabled: !s.humNotchEnabled }));
                  setActivePresetId('custom');
                }}
                className={settings.humNotchEnabled ? 'text-emerald-400' : 'text-slate-600'}
              >
                {settings.humNotchEnabled ? <ToggleRight className="w-6 h-6" /> : <ToggleLeft className="w-6 h-6" />}
              </button>
            </div>
            <div className="flex items-center justify-between text-xs pt-1">
              <span className="text-slate-400 text-[11px]">Mains Frequency:</span>
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => {
                    setSettings(s => ({ ...s, humNotchFreq: 50 }));
                    setActivePresetId('custom');
                  }}
                  className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                    settings.humNotchFreq === 50 ? 'bg-indigo-600 text-white' : 'bg-slate-800 text-slate-400'
                  }`}
                >
                  50 Hz (Asia/EU)
                </button>
                <button
                  onClick={() => {
                    setSettings(s => ({ ...s, humNotchFreq: 60 }));
                    setActivePresetId('custom');
                  }}
                  className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                    settings.humNotchFreq === 60 ? 'bg-indigo-600 text-white' : 'bg-slate-800 text-slate-400'
                  }`}
                >
                  60 Hz (US)
                </button>
              </div>
            </div>
          </div>

          {/* Stage 2: Plosive & Mic Blast Suppressor (De-Plosive) */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-3.5 space-y-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <span className="text-[11px] font-mono text-indigo-400 bg-indigo-500/10 px-1.5 py-0.5 rounded">02</span>
                <span className="text-xs font-bold text-white">De-Plosive (P/B Pop Tamer)</span>
              </div>
              <button
                onClick={() => {
                  setSettings(s => ({ ...s, dePlosiveEnabled: !s.dePlosiveEnabled }));
                  setActivePresetId('custom');
                }}
                className={settings.dePlosiveEnabled ? 'text-emerald-400' : 'text-slate-600'}
              >
                {settings.dePlosiveEnabled ? <ToggleRight className="w-6 h-6" /> : <ToggleLeft className="w-6 h-6" />}
              </button>
            </div>
            <div className="flex items-center space-x-3 text-xs">
              <span className="text-slate-400 text-[11px]">Sensitivity:</span>
              <input
                type="range"
                min="0.2"
                max="1.0"
                step="0.05"
                value={settings.dePlosiveSensitivity ?? 0.7}
                onChange={(e) => {
                  setSettings(s => ({ ...s, dePlosiveSensitivity: Number(e.target.value) }));
                  setActivePresetId('custom');
                }}
                className="flex-1 accent-indigo-500"
              />
              <span className="font-mono text-slate-300 w-12 text-right">
                {Math.round((settings.dePlosiveSensitivity ?? 0.7) * 100)}%
              </span>
            </div>
          </div>

          {/* Stage 3: Mouth Click & Saliva Glitch (De-Click) */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-3.5 space-y-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <span className="text-[11px] font-mono text-indigo-400 bg-indigo-500/10 px-1.5 py-0.5 rounded">03</span>
                <span className="text-xs font-bold text-white">De-Click & Mouth Noise Glitch</span>
              </div>
              <button
                onClick={() => {
                  setSettings(s => ({ ...s, deClickEnabled: !s.deClickEnabled }));
                  setActivePresetId('custom');
                }}
                className={settings.deClickEnabled ? 'text-emerald-400' : 'text-slate-600'}
              >
                {settings.deClickEnabled ? <ToggleRight className="w-6 h-6" /> : <ToggleLeft className="w-6 h-6" />}
              </button>
            </div>
            <p className="text-[11px] text-slate-400">
              Detects and repairs isolated micro-clicks and lip smacks via polynomial interpolation.
            </p>
          </div>

          {/* Stage 4: Sub-Rumble High-Pass Filter */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-3.5 space-y-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <span className="text-[11px] font-mono text-indigo-400 bg-indigo-500/10 px-1.5 py-0.5 rounded">04</span>
                <span className="text-xs font-bold text-white">Sub-Rumble High-Pass Filter</span>
              </div>
              <button
                onClick={() => {
                  setSettings(s => ({ ...s, hpfEnabled: !s.hpfEnabled }));
                  setActivePresetId('custom');
                }}
                className={settings.hpfEnabled ? 'text-emerald-400' : 'text-slate-600'}
              >
                {settings.hpfEnabled ? <ToggleRight className="w-6 h-6" /> : <ToggleLeft className="w-6 h-6" />}
              </button>
            </div>
            <div className="flex items-center space-x-3 text-xs">
              <span className="text-slate-400 text-[11px]">Cutoff:</span>
              <input
                type="range"
                min="40"
                max="180"
                value={settings.hpfCutoff}
                onChange={(e) => {
                  setSettings(s => ({ ...s, hpfCutoff: Number(e.target.value) }));
                  setActivePresetId('custom');
                }}
                className="flex-1 accent-indigo-500"
              />
              <span className="font-mono text-slate-300 w-12 text-right">{settings.hpfCutoff} Hz</span>
            </div>
          </div>

          {/* Stage 5: Multi-Band Spectral Noise Floor Reduction */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-3.5 space-y-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <span className="text-[11px] font-mono text-indigo-400 bg-indigo-500/10 px-1.5 py-0.5 rounded">05</span>
                <span className="text-xs font-bold text-white">Adaptive Multi-Band Denoising</span>
              </div>
              <button
                onClick={() => {
                  setSettings(s => ({ ...s, noiseReductionEnabled: !s.noiseReductionEnabled }));
                  setActivePresetId('custom');
                }}
                className={settings.noiseReductionEnabled ? 'text-emerald-400' : 'text-slate-600'}
              >
                {settings.noiseReductionEnabled ? <ToggleRight className="w-6 h-6" /> : <ToggleLeft className="w-6 h-6" />}
              </button>
            </div>
            <div className="flex items-center space-x-3 text-xs">
              <span className="text-slate-400 text-[11px]">Suppression:</span>
              <input
                type="range"
                min="-30"
                max="-6"
                value={settings.noiseReductionDb}
                onChange={(e) => {
                  setSettings(s => ({ ...s, noiseReductionDb: Number(e.target.value) }));
                  setActivePresetId('custom');
                }}
                className="flex-1 accent-indigo-500"
              />
              <span className="font-mono text-slate-300 w-12 text-right">{settings.noiseReductionDb} dB</span>
            </div>
          </div>

          {/* Stage 6: Precision Dynamic De-Esser */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-3.5 space-y-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <span className="text-[11px] font-mono text-indigo-400 bg-indigo-500/10 px-1.5 py-0.5 rounded">06</span>
                <span className="text-xs font-bold text-white">Precision Dynamic De-Esser</span>
              </div>
              <button
                onClick={() => {
                  setSettings(s => ({ ...s, deEsserEnabled: !s.deEsserEnabled }));
                  setActivePresetId('custom');
                }}
                className={settings.deEsserEnabled ? 'text-emerald-400' : 'text-slate-600'}
              >
                {settings.deEsserEnabled ? <ToggleRight className="w-6 h-6" /> : <ToggleLeft className="w-6 h-6" />}
              </button>
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div>
                <div className="flex justify-between text-[10px] text-slate-400 mb-1">
                  <span>Target Freq</span>
                  <span className="font-mono">{(settings.deEsserFreq / 1000).toFixed(1)} kHz</span>
                </div>
                <input
                  type="range"
                  min="5000"
                  max="9000"
                  step="100"
                  value={settings.deEsserFreq}
                  onChange={(e) => {
                    setSettings(s => ({ ...s, deEsserFreq: Number(e.target.value) }));
                    setActivePresetId('custom');
                  }}
                  className="w-full accent-indigo-500"
                />
              </div>
              <div>
                <div className="flex justify-between text-[10px] text-slate-400 mb-1">
                  <span>Attenuation</span>
                  <span className="font-mono">{settings.deEsserGain} dB</span>
                </div>
                <input
                  type="range"
                  min="-18"
                  max="-2"
                  step="1"
                  value={settings.deEsserGain}
                  onChange={(e) => {
                    setSettings(s => ({ ...s, deEsserGain: Number(e.target.value) }));
                    setActivePresetId('custom');
                  }}
                  className="w-full accent-indigo-500"
                />
              </div>
            </div>
          </div>

          {/* Stage 7: Vocal Chest Warmth & Silky Air Clarity Polish */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-3.5 space-y-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <span className="text-[11px] font-mono text-indigo-400 bg-indigo-500/10 px-1.5 py-0.5 rounded">07</span>
                <span className="text-xs font-bold text-white">Warmth & Silky Air Polish</span>
              </div>
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => {
                    setSettings(s => ({ ...s, warmthEnabled: !s.warmthEnabled }));
                    setActivePresetId('custom');
                  }}
                  className={`text-[10px] px-2 py-0.5 rounded font-bold ${
                    settings.warmthEnabled ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30' : 'bg-slate-800 text-slate-500'
                  }`}
                >
                  Warmth
                </button>
                <button
                  onClick={() => {
                    setSettings(s => ({ ...s, airClarityEnabled: !s.airClarityEnabled }));
                    setActivePresetId('custom');
                  }}
                  className={`text-[10px] px-2 py-0.5 rounded font-bold ${
                    settings.airClarityEnabled ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30' : 'bg-slate-800 text-slate-500'
                  }`}
                >
                  Air Polish
                </button>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div>
                <div className="flex justify-between text-[10px] text-slate-400 mb-1">
                  <span>Chest (270Hz)</span>
                  <span className="font-mono">+{settings.warmthGain ?? 2.0} dB</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="6"
                  step="0.5"
                  value={settings.warmthGain ?? 2.0}
                  onChange={(e) => {
                    setSettings(s => ({ ...s, warmthGain: Number(e.target.value) }));
                    setActivePresetId('custom');
                  }}
                  className="w-full accent-amber-500"
                />
              </div>
              <div>
                <div className="flex justify-between text-[10px] text-slate-400 mb-1">
                  <span>Air (11.5kHz)</span>
                  <span className="font-mono">+{settings.airClarityGain ?? 2.5} dB</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="6"
                  step="0.5"
                  value={settings.airClarityGain ?? 2.5}
                  onChange={(e) => {
                    setSettings(s => ({ ...s, airClarityGain: Number(e.target.value) }));
                    setActivePresetId('custom');
                  }}
                  className="w-full accent-indigo-500"
                />
              </div>
            </div>
          </div>

          {/* Stage 8: Voice-Aware Leveler & Dynamic Compressor */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-3.5 space-y-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <span className="text-[11px] font-mono text-indigo-400 bg-indigo-500/10 px-1.5 py-0.5 rounded">08</span>
                <span className="text-xs font-bold text-white">Voice-Aware Leveler Compressor</span>
              </div>
              <button
                onClick={() => {
                  setSettings(s => ({ ...s, compressorEnabled: !s.compressorEnabled }));
                  setActivePresetId('custom');
                }}
                className={settings.compressorEnabled ? 'text-emerald-400' : 'text-slate-600'}
              >
                {settings.compressorEnabled ? <ToggleRight className="w-6 h-6" /> : <ToggleLeft className="w-6 h-6" />}
              </button>
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div>
                <div className="flex justify-between text-[10px] text-slate-400 mb-1">
                  <span>Threshold</span>
                  <span className="font-mono">{settings.compressorThreshold} dB</span>
                </div>
                <input
                  type="range"
                  min="-36"
                  max="-6"
                  value={settings.compressorThreshold}
                  onChange={(e) => {
                    setSettings(s => ({ ...s, compressorThreshold: Number(e.target.value) }));
                    setActivePresetId('custom');
                  }}
                  className="w-full accent-indigo-500"
                />
              </div>
              <div>
                <div className="flex justify-between text-[10px] text-slate-400 mb-1">
                  <span>Ratio</span>
                  <span className="font-mono">{settings.compressorRatio}:1</span>
                </div>
                <input
                  type="range"
                  min="1.5"
                  max="8"
                  step="0.5"
                  value={settings.compressorRatio}
                  onChange={(e) => {
                    setSettings(s => ({ ...s, compressorRatio: Number(e.target.value) }));
                    setActivePresetId('custom');
                  }}
                  className="w-full accent-indigo-500"
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Apply to Project & Continue Pipeline */}
      <div className="pt-2 space-y-2">
        <button
          onClick={() => {
            handleApply();
            onNavigate('pitch');
          }}
          disabled={!processedBuffer}
          className={`w-full py-4 rounded-2xl font-bold text-sm flex items-center justify-center space-x-2 shadow-xl transition-all active:scale-[0.98] ${
            processedBuffer
              ? 'bg-gradient-to-r from-indigo-600 via-purple-600 to-indigo-600 hover:from-indigo-500 hover:to-purple-500 text-white shadow-indigo-600/30'
              : 'bg-slate-800 text-slate-500 cursor-not-allowed'
          }`}
        >
          <Check className="w-5 h-5" />
          <span>Save Cleaned Vocal & Continue to Pitch Tuner →</span>
        </button>
      </div>
    </div>
  );
};
