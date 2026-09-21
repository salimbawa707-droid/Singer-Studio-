import React, { useState, useEffect, useRef } from 'react';
import { 
  Activity, 
  Play, 
  Pause,
  Square, 
  RotateCcw, 
  ChevronLeft, 
  Volume2, 
  Radio, 
  Mic2,
  CheckCircle2,
  ArrowRight,
  Sparkles,
  Sliders,
  Music,
  Compass,
  Zap,
  Layers,
  Wand2
} from 'lucide-react';
import { WebAudioEngine } from '../services/webAudioEngine';
import { PitchAnalysisResult, ScreenId, StudioProject } from '../types/audio';
import { ProductionProgress } from '../components/ProductionProgress';
import { ProductionStageHeader } from '../components/ProductionStageHeader';
import { 
  PitchCorrectionEngine, 
  AutoTuneSettings, 
  ALL_SCALE_PRESETS, 
  NOTE_NAMES, 
  INDIAN_22_SHRUTIS 
} from '../services/pitchCorrectionEngine';

interface PitchScreenProps {
  currentProject: StudioProject | null;
  vocalBuffer: AudioBuffer | null;
  onNavigate: (screen: ScreenId) => void;
  onUpdatePitch?: (pitch: PitchAnalysisResult) => void;
  onUpdateCleanedVocal?: (buffer: AudioBuffer) => void;
}

export const PitchScreen: React.FC<PitchScreenProps> = ({
  currentProject,
  vocalBuffer,
  onNavigate,
  onUpdatePitch,
  onUpdateCleanedVocal,
}) => {
  const [isMonitoring, setIsMonitoring] = useState(false);
  const [pitchData, setPitchData] = useState<PitchAnalysisResult | null>(
    currentProject?.detectedPitch || null
  );
  const [pitchHistory, setPitchHistory] = useState<{ note: string; hz: number; swara?: string }[]>([]);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Auto-Tune & Microtonal Settings
  const [autoTuneSettings, setAutoTuneSettings] = useState<AutoTuneSettings>({
    enabled: true,
    scaleId: currentProject?.scale === 'minor' ? 'minor' : 'major',
    rootNote: currentProject?.key || 'C',
    retuneSpeedMs: 25, // Modern Commercial Studio
    correctionAmount: 0.85,
    humanizeToleranceCents: 5,
    formantPreservation: true,
    ragaMicrotonalMode: false
  });

  const [isPlayingCorrected, setIsPlayingCorrected] = useState(false);
  const [isProcessingTune, setIsProcessingTune] = useState(false);
  const [tuneAppliedNotice, setTuneAppliedNotice] = useState(false);
  const [activePresetCategory, setActivePresetCategory] = useState<'all' | 'western' | 'indian_raga'>('all');

  const animFrameRef = useRef<number | null>(null);
  const audioEngine = WebAudioEngine.getInstance();
  const pitchCorrectionEngine = PitchCorrectionEngine.getInstance();

  useEffect(() => {
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      audioEngine.stopAllPlayback();
    };
  }, []);

  const startPitchMonitor = async () => {
    try {
      setErrorMsg(null);
      const analyser = await audioEngine.startMicStream();
      setIsMonitoring(true);

      const loop = () => {
        animFrameRef.current = requestAnimationFrame(loop);
        const result = audioEngine.detectPitch(analyser);
        if (result && result.frequency > 50) {
          const snapped = pitchCorrectionEngine.snapFrequencyToScale(result.frequency, autoTuneSettings);
          const enriched: PitchAnalysisResult = {
            ...result,
            centsOff: snapped.centsError,
            inTune: Math.abs(snapped.centsError) <= autoTuneSettings.humanizeToleranceCents
          };
          setPitchData(enriched);
          if (onUpdatePitch) onUpdatePitch(enriched);

          setPitchHistory(prev => {
            const next = [...prev, {
              note: snapped.targetNoteName,
              hz: Math.round(result.frequency * 10) / 10,
              swara: snapped.swaraName
            }];
            return next.slice(-16);
          });
        }
      };

      loop();
    } catch (err: unknown) {
      setErrorMsg((err as Error).message || "Microphone access required for real-time tuner");
      setIsMonitoring(false);
    }
  };

  const stopPitchMonitor = () => {
    if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    setIsMonitoring(false);
  };

  const handleAnalyzeRecordedTake = () => {
    const buffer = vocalBuffer || currentProject?.cleanedVocalBuffer || currentProject?.rawVocalBuffer;
    if (!buffer) {
      setErrorMsg("No recorded vocal audio found. Please record or import vocal audio first.");
      return;
    }

    try {
      setErrorMsg(null);
      const pitchResult = audioEngine.analyzeBufferPitch(buffer);
      if (pitchResult.frequency > 0) {
        const snapped = pitchCorrectionEngine.snapFrequencyToScale(pitchResult.frequency, autoTuneSettings);
        const result: PitchAnalysisResult = {
          ...pitchResult,
          centsOff: snapped.centsError,
          inTune: Math.abs(snapped.centsError) <= (autoTuneSettings.humanizeToleranceCents || 8),
        };
        setPitchData(result);
        if (onUpdatePitch) onUpdatePitch(result);
      } else {
        setErrorMsg("Could not detect voiced musical pitch in audio. Please check vocal levels.");
      }
    } catch (err) {
      setErrorMsg(`Pitch analysis failed: ${(err as Error).message || "Unknown error"}`);
    }
  };

  // Render & Apply Studio Pitch Correction to Vocal Buffer
  const handleApplyPitchCorrectionToBuffer = () => {
    const buffer = vocalBuffer || currentProject?.cleanedVocalBuffer || currentProject?.rawVocalBuffer;
    if (!buffer) return;

    setIsProcessingTune(true);
    setTimeout(() => {
      try {
        const ctx = audioEngine.getContext();
        const numChannels = buffer.numberOfChannels;
        const length = buffer.length;
        const sampleRate = buffer.sampleRate;

        let tunedBuffer: AudioBuffer;
        if (ctx && typeof ctx.createBuffer === 'function') {
          tunedBuffer = ctx.createBuffer(numChannels, length, sampleRate);
        } else {
          const channelData = Array.from({ length: numChannels }, () => new Float32Array(length));
          tunedBuffer = {
            numberOfChannels: numChannels,
            length,
            sampleRate,
            duration: length / sampleRate,
            getChannelData: (ch: number) => channelData[ch]
          } as unknown as AudioBuffer;
        }

        for (let ch = 0; ch < numChannels; ch++) {
          const srcData = buffer.getChannelData(ch);
          const corrected = pitchCorrectionEngine.processPitchCorrection(srcData, sampleRate, autoTuneSettings);
          tunedBuffer.getChannelData(ch).set(corrected);
        }

        if (onUpdateCleanedVocal) {
          onUpdateCleanedVocal(tunedBuffer);
        }

        setIsProcessingTune(false);
        setTuneAppliedNotice(true);
        setTimeout(() => setTuneAppliedNotice(false), 3000);
      } catch (err) {
        setIsProcessingTune(false);
      }
    }, 150);
  };

  const handleTogglePreviewCorrected = () => {
    if (isPlayingCorrected) {
      audioEngine.stopAllPlayback();
      setIsPlayingCorrected(false);
      return;
    }

    const buffer = vocalBuffer || currentProject?.cleanedVocalBuffer || currentProject?.rawVocalBuffer;
    if (buffer) {
      audioEngine.playBuffer(buffer, () => setIsPlayingCorrected(false));
      setIsPlayingCorrected(true);
    } else {
      // Preview tone
      const dummy = audioEngine.generateAccompanimentAudio('Pop Ballad', 6, 120, autoTuneSettings.rootNote);
      audioEngine.playBuffer(dummy, () => setIsPlayingCorrected(false));
      setIsPlayingCorrected(true);
    }
  };

  const filteredPresets = ALL_SCALE_PRESETS.filter(p => {
    if (activePresetCategory === 'all') return true;
    return p.category === activePresetCategory;
  });

  const currentScaleObj = ALL_SCALE_PRESETS.find(p => p.id === autoTuneSettings.scaleId) || ALL_SCALE_PRESETS[0];

  return (
    <div className="space-y-4 pb-24">
      {/* Header */}
      <ProductionStageHeader
        currentScreen="pitch"
        currentProject={currentProject}
        onNavigate={onNavigate}
        title="Vocal Pitch & Microtonal Retuning"
        subtitle="Auto-Tune Retune Speed, Formant Lock & 22-Shruti Indian Classical Ragas"
      />

      <ProductionProgress currentScreen="pitch" currentProject={currentProject} onNavigate={onNavigate} />

      {errorMsg && (
        <div className="p-3 bg-rose-500/10 border border-rose-500/30 text-rose-300 rounded-xl text-xs">
          {errorMsg}
        </div>
      )}

      {/* Main Pitch Tuner Display */}
      <div className="bg-slate-950 border border-slate-800 rounded-2xl p-5 text-center space-y-3.5 shadow-inner relative overflow-hidden">
        <div className="flex items-center justify-between text-xs text-slate-400">
          <span className="font-mono flex items-center gap-1.5 text-indigo-300">
            <Compass className="w-3.5 h-3.5 text-indigo-400" />
            Target Scale: {autoTuneSettings.rootNote} {currentScaleObj.name}
          </span>
          <span className={`flex items-center space-x-1 font-bold ${isMonitoring ? 'text-emerald-400' : 'text-slate-500'}`}>
            <Radio className={`w-3.5 h-3.5 ${isMonitoring ? 'animate-pulse' : ''}`} />
            <span>{isMonitoring ? 'LIVE MONITOR' : 'IDLE'}</span>
          </span>
        </div>

        {/* Big Note & Swara Display */}
        <div className="py-1">
          <div className="text-6xl font-black tracking-tight text-white flex items-center justify-center space-x-2">
            <span>{pitchData ? pitchData.noteName : '--'}</span>
            {pitchData?.inTune && (
              <CheckCircle2 className="w-6 h-6 text-emerald-400 inline-block" />
            )}
          </div>
          <div className="text-xs font-mono text-indigo-400 font-bold mt-1 flex items-center justify-center gap-2">
            <span>{pitchData ? `${pitchData.frequency} Hz` : '0.0 Hz'}</span>
            {currentScaleObj.category === 'indian_raga' && (
              <span className="px-2 py-0.5 rounded bg-purple-900/60 border border-purple-500/40 text-purple-200 text-[10px] font-sans">
                Raga Shruti Grid Locked
              </span>
            )}
          </div>
        </div>

        {/* Cents Tuner Needle Gauge (-50 to +50 cents) */}
        <div className="space-y-1.5 max-w-sm mx-auto">
          <div className="flex justify-between text-[10px] font-mono text-slate-500">
            <span>-50 Flat</span>
            <span className="text-emerald-400 font-bold">0 In-Tune</span>
            <span>+50 Sharp</span>
          </div>

          <div className="h-3 bg-slate-900 rounded-full border border-slate-800 relative overflow-hidden">
            <div className="absolute top-0 bottom-0 left-1/2 w-0.5 bg-emerald-500/60 -translate-x-1/2 z-10" />
            <div
              className={`absolute top-0 bottom-0 w-3 rounded-full -translate-x-1/2 transition-all duration-75 ${
                pitchData?.inTune ? 'bg-emerald-400 shadow-md shadow-emerald-500/50' : 'bg-amber-400'
              }`}
              style={{
                left: `${Math.max(5, Math.min(95, 50 + (pitchData ? pitchData.centsOff : 0)))}%`
              }}
            />
          </div>

          <div className="text-[11px] font-mono text-slate-300">
            Deviation: {pitchData ? (pitchData.centsOff > 0 ? `+${pitchData.centsOff}` : pitchData.centsOff) : '0'} cents
          </div>
        </div>
      </div>

      {/* Auto-Tune & Scale Configuration Module */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-4 shadow-md">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Sparkles className="w-4 h-4 text-indigo-400" />
            <h4 className="text-xs font-bold text-white uppercase tracking-wider">Vocal Auto-Tune Engine</h4>
          </div>

          <label className="flex items-center space-x-2 cursor-pointer">
            <span className="text-xs text-slate-400 font-semibold">Active</span>
            <input
              type="checkbox"
              checked={autoTuneSettings.enabled}
              onChange={(e) => setAutoTuneSettings(prev => ({ ...prev, enabled: e.target.checked }))}
              className="accent-indigo-500 w-4 h-4 rounded cursor-pointer"
            />
          </label>
        </div>

        {/* Root Key & Scale Preset Selector */}
        <div className="space-y-2">
          <div className="flex justify-between items-center text-xs">
            <span className="text-slate-400">Scale Root Key:</span>
            <div className="flex gap-1 overflow-x-auto max-w-[260px] pb-1">
              {NOTE_NAMES.map(n => (
                <button
                  key={n}
                  onClick={() => setAutoTuneSettings(prev => ({ ...prev, rootNote: n }))}
                  className={`px-2 py-0.5 rounded text-[11px] font-bold transition-all ${
                    autoTuneSettings.rootNote === n
                      ? 'bg-indigo-600 text-white shadow'
                      : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
                  }`}
                >
                  {n}
                </button>
              ))}
            </div>
          </div>

          {/* Scale Category Filter */}
          <div className="flex gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800">
            <button
              onClick={() => setActivePresetCategory('all')}
              className={`flex-1 py-1 rounded-lg text-[10px] font-bold ${
                activePresetCategory === 'all' ? 'bg-indigo-600 text-white' : 'text-slate-400'
              }`}
            >
              All Scales
            </button>
            <button
              onClick={() => setActivePresetCategory('western')}
              className={`flex-1 py-1 rounded-lg text-[10px] font-bold ${
                activePresetCategory === 'western' ? 'bg-indigo-600 text-white' : 'text-slate-400'
              }`}
            >
              Western / Pop
            </button>
            <button
              onClick={() => setActivePresetCategory('indian_raga')}
              className={`flex-1 py-1 rounded-lg text-[10px] font-bold ${
                activePresetCategory === 'indian_raga' ? 'bg-purple-600 text-white' : 'text-slate-400'
              }`}
            >
              Indian Ragas (22 Shrutis)
            </button>
          </div>

          {/* Scale List Dropdown / Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-36 overflow-y-auto pt-1">
            {filteredPresets.map(preset => (
              <button
                key={preset.id}
                onClick={() => setAutoTuneSettings(prev => ({ ...prev, scaleId: preset.id }))}
                className={`p-2.5 rounded-xl border text-left transition-all ${
                  autoTuneSettings.scaleId === preset.id
                    ? 'bg-indigo-950 border-indigo-500 ring-2 ring-indigo-500/20'
                    : 'bg-slate-950/80 border-slate-800 hover:border-slate-700'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-white">{preset.name}</span>
                  {preset.category === 'indian_raga' && (
                    <span className="text-[9px] font-mono text-purple-400 font-bold uppercase">Raga</span>
                  )}
                </div>
                <p className="text-[10px] text-slate-400 line-clamp-1 mt-0.5">{preset.description}</p>
              </button>
            ))}
          </div>
        </div>

        {/* Retune Speed Slider (T-Pain / Commercial Pop / Natural Acoustic) */}
        <div className="space-y-3 pt-2 border-t border-slate-800">
          <div className="space-y-1">
            <div className="flex justify-between text-xs">
              <span className="text-slate-300 font-semibold flex items-center gap-1.5">
                <Zap className="w-3.5 h-3.5 text-amber-400" />
                <span>Retune Speed</span>
              </span>
              <span className="font-mono text-indigo-300 font-bold">
                {autoTuneSettings.retuneSpeedMs === 0 ? '0ms (Hard Snap / T-Pain)' : `${autoTuneSettings.retuneSpeedMs}ms (${autoTuneSettings.retuneSpeedMs < 40 ? 'Modern Pop' : 'Natural Acoustic'})`}
              </span>
            </div>
            <input
              type="range"
              min="0"
              max="150"
              step="5"
              value={autoTuneSettings.retuneSpeedMs}
              onChange={(e) => setAutoTuneSettings(prev => ({ ...prev, retuneSpeedMs: Number(e.target.value) }))}
              className="w-full accent-indigo-500 cursor-pointer h-2 bg-slate-950 rounded-lg"
            />
            <div className="flex justify-between text-[9px] font-mono text-slate-500">
              <span>0ms (Hard Snap)</span>
              <span>25ms (Commercial)</span>
              <span>100ms+ (Natural Human)</span>
            </div>
          </div>

          {/* Correction Amount & Vibrato Dead-Zone Tolerance */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <div className="flex justify-between text-xs">
                <span className="text-slate-400 text-[11px]">Correction Intensity</span>
                <span className="font-mono text-slate-200 font-bold">{Math.round(autoTuneSettings.correctionAmount * 100)}%</span>
              </div>
              <input
                type="range"
                min="0.1"
                max="1.0"
                step="0.05"
                value={autoTuneSettings.correctionAmount}
                onChange={(e) => setAutoTuneSettings(prev => ({ ...prev, correctionAmount: Number(e.target.value) }))}
                className="w-full accent-purple-500 cursor-pointer h-2 bg-slate-950 rounded-lg"
              />
            </div>

            <div className="space-y-1">
              <div className="flex justify-between text-xs">
                <span className="text-slate-400 text-[11px]">Humanize Tolerance</span>
                <span className="font-mono text-slate-200 font-bold">±{autoTuneSettings.humanizeToleranceCents} ct</span>
              </div>
              <input
                type="range"
                min="0"
                max="25"
                step="1"
                value={autoTuneSettings.humanizeToleranceCents}
                onChange={(e) => setAutoTuneSettings(prev => ({ ...prev, humanizeToleranceCents: Number(e.target.value) }))}
                className="w-full accent-emerald-500 cursor-pointer h-2 bg-slate-950 rounded-lg"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-2.5">
        <div className="grid grid-cols-2 gap-2">
          {isMonitoring ? (
            <button
              onClick={stopPitchMonitor}
              className="py-3 bg-rose-600 hover:bg-rose-500 text-white rounded-xl font-bold text-xs flex items-center justify-center space-x-1.5 active:scale-[0.98] transition-all"
            >
              <Square className="w-4 h-4" />
              <span>Stop Monitor</span>
            </button>
          ) : (
            <button
              onClick={startPitchMonitor}
              className="py-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold text-xs flex items-center justify-center space-x-1.5 shadow-md shadow-emerald-600/20 active:scale-[0.98] transition-all"
            >
              <Mic2 className="w-4 h-4" />
              <span>Start Live Tuner</span>
            </button>
          )}

          <button
            onClick={handleTogglePreviewCorrected}
            className={`py-3 rounded-xl font-bold text-xs flex items-center justify-center space-x-1.5 border transition-all ${
              isPlayingCorrected
                ? 'bg-amber-600 border-amber-500 text-white'
                : 'bg-indigo-600 hover:bg-indigo-500 border-indigo-500 text-white'
            }`}
          >
            {isPlayingCorrected ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
            <span>{isPlayingCorrected ? 'Pause Preview' : 'Preview Vocal'}</span>
          </button>
        </div>

        {/* Apply Retuning to Audio Buffer */}
        <button
          onClick={handleApplyPitchCorrectionToBuffer}
          disabled={isProcessingTune}
          className={`w-full py-3 rounded-xl font-bold text-xs flex items-center justify-center space-x-1.5 border transition-all ${
            tuneAppliedNotice
              ? 'bg-emerald-600 border-emerald-400 text-white'
              : 'bg-purple-600 hover:bg-purple-500 border-purple-500 text-white shadow-md shadow-purple-600/20'
          }`}
        >
          {tuneAppliedNotice ? <CheckCircle2 className="w-4 h-4" /> : <Wand2 className="w-4 h-4" />}
          <span>{isProcessingTune ? 'Processing Retuning...' : tuneAppliedNotice ? 'Vocal Track Retuned!' : 'Apply Pitch Retuning to Track'}</span>
        </button>
      </div>

      {/* Recent Pitch Log */}
      {pitchHistory.length > 0 && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-2">
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">Real-Time Pitch Note Log</h4>
          <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto">
            {pitchHistory.map((item, idx) => (
              <span
                key={idx}
                className="px-2 py-1 bg-slate-950 border border-slate-800 rounded-lg text-xs font-mono font-bold text-indigo-300 flex items-center gap-1"
              >
                <span>{item.note}</span>
                {item.swara && <span className="text-[10px] text-purple-400 font-sans">({item.swara})</span>}
                <span className="text-[10px] text-slate-500">({item.hz}Hz)</span>
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Continue to BPM & Key */}
      <div className="pt-2">
        <button
          onClick={() => onNavigate('bpm_key')}
          className="w-full py-3.5 rounded-2xl font-bold text-xs flex items-center justify-center space-x-2 shadow-lg bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white shadow-indigo-600/30 active:scale-[0.98] transition-all"
        >
          <span>Continue to BPM & Key Detection →</span>
        </button>
      </div>
    </div>
  );
};
