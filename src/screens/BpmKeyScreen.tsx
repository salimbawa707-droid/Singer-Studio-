import React, { useState, useRef } from 'react';
import { 
  Gauge, 
  Sparkles, 
  RotateCcw, 
  ChevronLeft, 
  Check, 
  Zap, 
  Radio,
  Sliders,
  AlertCircle
} from 'lucide-react';
import { ScreenId, StudioProject } from '../types/audio';
import { ProductionProgress } from '../components/ProductionProgress';
import { ProductionStageHeader } from '../components/ProductionStageHeader';
import { WebAudioEngine } from '../services/webAudioEngine';

interface BpmKeyScreenProps {
  currentProject: StudioProject | null;
  vocalBuffer: AudioBuffer | null;
  onNavigate: (screen: ScreenId) => void;
  onUpdateBpmKey: (bpm: number, key: string, scale: 'major' | 'minor') => void;
}

export const BpmKeyScreen: React.FC<BpmKeyScreenProps> = ({
  currentProject,
  vocalBuffer,
  onNavigate,
  onUpdateBpmKey,
}) => {
  const [bpm, setBpm] = useState(currentProject?.bpm || 120);
  const [keyRoot, setKeyRoot] = useState(currentProject?.key || 'C');
  const [scale, setScale] = useState<'major' | 'minor'>(currentProject?.scale || 'major');
  const [confidence, setConfidence] = useState(
    currentProject?.detectedBpmKey ? Math.round((currentProject.detectedBpmKey.confidence || 0.9) * 100) : 90
  );
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [applied, setApplied] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Tap Tempo state
  const tapTimesRef = useRef<number[]>([]);
  const [tapCount, setTapCount] = useState(0);

  const NOTES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

  const handleDetectBpm = () => {
    const buffer = vocalBuffer || currentProject?.cleanedVocalBuffer || currentProject?.rawVocalBuffer;
    if (!buffer) {
      setErrorMsg("No vocal audio found. Please record or import a vocal take first.");
      return;
    }

    setErrorMsg(null);
    setIsAnalyzing(true);
    try {
      const result = WebAudioEngine.getInstance().analyzeBufferBpmKey(buffer);
      setBpm(result.bpm);
      setConfidence(Math.round(result.confidence * 100));
    } catch (err) {
      setErrorMsg(`BPM detection failed: ${(err as Error).message}`);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleDetectKey = () => {
    const buffer = vocalBuffer || currentProject?.cleanedVocalBuffer || currentProject?.rawVocalBuffer;
    if (!buffer) {
      setErrorMsg("No vocal audio found. Please record or import a vocal take first.");
      return;
    }

    setErrorMsg(null);
    setIsAnalyzing(true);
    try {
      const result = WebAudioEngine.getInstance().analyzeBufferBpmKey(buffer);
      setKeyRoot(result.key);
      setScale(result.scale);
      setConfidence(Math.round(result.confidence * 100));
    } catch (err) {
      setErrorMsg(`Key detection failed: ${(err as Error).message}`);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleTapTempo = () => {
    const now = performance.now();
    const times = tapTimesRef.current;
    
    // Reset if last tap was over 2 seconds ago
    if (times.length > 0 && now - times[times.length - 1] > 2000) {
      times.length = 0;
    }

    times.push(now);
    setTapCount(times.length);

    if (times.length > 1) {
      const intervals = [];
      for (let i = 1; i < times.length; i++) {
        intervals.push(times[i] - times[i - 1]);
      }
      const avgInterval = intervals.reduce((a, b) => a + b, 0) / intervals.length;
      const computedBpm = Math.round(60000 / avgInterval);
      if (computedBpm >= 40 && computedBpm <= 240) {
        setBpm(computedBpm);
      }
    }
  };

  const handleApply = () => {
    onUpdateBpmKey(bpm, keyRoot, scale);
    setApplied(true);
    setTimeout(() => setApplied(false), 2000);
  };

  return (
    <div className="space-y-4 pb-20">
      {/* Header */}
      <ProductionStageHeader
        currentScreen="bpm_key"
        currentProject={currentProject}
        onNavigate={onNavigate}
        title="BPM & Key Analysis"
        subtitle="Detect tempo and musical harmonic scale"
      />

      <ProductionProgress currentScreen="bpm_key" currentProject={currentProject} onNavigate={onNavigate} />

      {errorMsg && (
        <div className="bg-rose-950/40 border border-rose-800/60 rounded-xl p-3 flex items-center space-x-2 text-rose-300 text-xs">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Main Analysis Display Cards */}
      <div className="grid grid-cols-2 gap-3">
        {/* BPM Card */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 text-center space-y-2">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Tempo</span>
          <div className="text-4xl font-black text-cyan-400 font-mono">
            {bpm}
          </div>
          <span className="text-[10px] text-slate-500 font-mono block">Beats Per Minute</span>
          
          <button
            onClick={handleDetectBpm}
            disabled={isAnalyzing}
            className="w-full py-2 bg-slate-800 hover:bg-slate-700 text-cyan-300 rounded-xl font-bold text-xs flex items-center justify-center space-x-1 border border-slate-700 active:scale-95 transition-all"
          >
            <Zap className="w-3 h-3" />
            <span>Detect BPM</span>
          </button>
        </div>

        {/* Key Card */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 text-center space-y-2">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Musical Key</span>
          <div className="text-4xl font-black text-purple-400 font-mono">
            {keyRoot} {scale === 'major' ? 'Maj' : 'Min'}
          </div>
          <span className="text-[10px] text-slate-500 font-mono block">Confidence: {confidence}%</span>

          <button
            onClick={handleDetectKey}
            disabled={isAnalyzing}
            className="w-full py-2 bg-slate-800 hover:bg-slate-700 text-purple-300 rounded-xl font-bold text-xs flex items-center justify-center space-x-1 border border-slate-700 active:scale-95 transition-all"
          >
            <Sparkles className="w-3 h-3" />
            <span>Detect Key</span>
          </button>
        </div>
      </div>

      {/* Tap Tempo & Manual BPM Slider */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="text-xs font-bold text-white">Manual BPM Adjustment</h4>
          <span className="text-xs font-mono font-bold text-cyan-400">{bpm} BPM</span>
        </div>

        <input
          type="range"
          min="60"
          max="180"
          value={bpm}
          onChange={(e) => setBpm(Number(e.target.value))}
          className="w-full accent-cyan-500"
        />

        <div className="pt-1">
          <button
            onClick={handleTapTempo}
            className="w-full py-3.5 bg-slate-950 hover:bg-slate-800 active:bg-cyan-950 border border-slate-800 hover:border-cyan-500/50 rounded-xl font-bold text-xs text-white flex items-center justify-center space-x-2 transition-all active:scale-[0.98]"
          >
            <Radio className="w-4 h-4 text-cyan-400 animate-pulse" />
            <span>TAP TEMPO {tapCount > 0 ? `(${tapCount} Taps)` : ''}</span>
          </button>
        </div>
      </div>

      {/* Manual Key & Scale Selector */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="text-xs font-bold text-white">Select Scale & Root Key</h4>
          <div className="flex items-center space-x-1 bg-slate-950 p-1 rounded-lg border border-slate-800 text-[11px]">
            <button
              onClick={() => setScale('major')}
              className={`px-2 py-0.5 rounded font-bold transition-all ${
                scale === 'major' ? 'bg-purple-600 text-white' : 'text-slate-400'
              }`}
            >
              Major
            </button>
            <button
              onClick={() => setScale('minor')}
              className={`px-2 py-0.5 rounded font-bold transition-all ${
                scale === 'minor' ? 'bg-purple-600 text-white' : 'text-slate-400'
              }`}
            >
              Minor
            </button>
          </div>
        </div>

        {/* Note Grid */}
        <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
          {NOTES.map((note) => (
            <button
              key={note}
              onClick={() => setKeyRoot(note)}
              className={`py-2 rounded-xl text-xs font-bold font-mono transition-all border ${
                keyRoot === note
                  ? 'bg-purple-600 border-purple-400 text-white shadow-md shadow-purple-600/30'
                  : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white hover:border-slate-700'
              }`}
            >
              {note}
            </button>
          ))}
        </div>
      </div>

      {/* Apply to Project & Next Pipeline Step */}
      <div className="space-y-2">
        <button
          onClick={() => {
            onUpdateBpmKey(bpm, keyRoot, scale);
            onNavigate('pipeline');
          }}
          className="w-full py-3.5 rounded-2xl font-bold text-xs flex items-center justify-center space-x-1.5 shadow-lg bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white shadow-indigo-600/30 transition-all active:scale-[0.98]"
        >
          <Check className="w-4 h-4" />
          <span>Save Tonality & Continue to Song Arrangement →</span>
        </button>
      </div>
    </div>
  );
};
