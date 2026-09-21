import React, { useState, useEffect, useRef } from 'react';
import { 
  Mic, 
  Upload, 
  Sparkles, 
  Music, 
  Activity, 
  Gauge, 
  Sliders, 
  FolderOpen, 
  Share2,
  Play,
  Clock,
  Layers,
  Zap,
  CheckCircle2,
  ArrowRight,
  ShieldCheck,
  Disc,
  Cpu,
  Radio,
  Square,
  Pause,
  RotateCcw,
  Volume2,
  Check
} from 'lucide-react';
import { StudioProject, ScreenId } from '../types/audio';
import { getNextProductionStage } from '../utils/productionNavigation';
import { WebAudioEngine } from '../services/webAudioEngine';

interface HomeScreenProps {
  currentProject: StudioProject | null;
  projects?: StudioProject[];
  onNavigate: (screen: ScreenId) => void;
  onSelectProject?: (project: StudioProject) => void;
  onImportAudio?: (file: File) => void;
  onNewProject?: () => void;
  onSaveVocalTake?: (buffer: AudioBuffer, blob: Blob, capturedLyrics?: string) => void;
}

export const HomeScreen: React.FC<HomeScreenProps> = ({
  currentProject,
  projects = [],
  onNavigate,
  onSelectProject,
  onImportAudio,
  onNewProject,
  onSaveVocalTake,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const timerRef = useRef<number | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const audioEngine = WebAudioEngine.getInstance();

  // Live Home Vocal Recording State
  const [recordState, setRecordState] = useState<'idle' | 'recording' | 'paused' | 'recorded'>('idle');
  const [recordSeconds, setRecordSeconds] = useState(0);
  const [peakLevel, setPeakLevel] = useState(0);
  const [micActive, setMicActive] = useState(false);
  const [homeLyrics, setHomeLyrics] = useState(currentProject?.lyrics || '');
  const [isProcessingAutoPipeline, setIsProcessingAutoPipeline] = useState(false);

  // Online vs Offline Mode state
  const [productionEngineMode, setProductionEngineMode] = useState<'online' | 'offline'>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('surge_hybrid_mode') === 'offline' ? 'offline' : 'online';
    }
    return 'online';
  });

  const handleToggleProductionMode = (mode: 'online' | 'offline') => {
    setProductionEngineMode(mode);
    if (typeof window !== 'undefined') {
      localStorage.setItem('surge_hybrid_mode', mode === 'offline' ? 'offline' : 'hybrid');
    }
  };

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      if (onImportAudio) {
        onImportAudio(e.target.files[0]);
      }
    }
  };

  const startVisualizer = (analyser: AnalyserNode) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const canvasCtx = canvas.getContext('2d');
    if (!canvasCtx) return;

    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    const draw = () => {
      animFrameRef.current = requestAnimationFrame(draw);
      analyser.getByteTimeDomainData(dataArray);

      let sum = 0;
      for (let i = 0; i < bufferLength; i++) {
        const val = (dataArray[i] - 128) / 128;
        sum += val * val;
      }
      const rms = Math.sqrt(sum / bufferLength);
      setPeakLevel(Math.min(100, Math.round(rms * 280)));

      canvasCtx.fillStyle = '#090d16';
      canvasCtx.fillRect(0, 0, canvas.width, canvas.height);

      canvasCtx.lineWidth = 2.5;
      canvasCtx.strokeStyle = recordState === 'recording' ? '#f43f5e' : '#6366f1';
      canvasCtx.beginPath();

      const sliceWidth = (canvas.width * 1.0) / bufferLength;
      let x = 0;

      for (let i = 0; i < bufferLength; i++) {
        const v = dataArray[i] / 128.0;
        const y = (v * canvas.height) / 2;

        if (i === 0) canvasCtx.moveTo(x, y);
        else canvasCtx.lineTo(x, y);

        x += sliceWidth;
      }

      canvasCtx.lineTo(canvas.width, canvas.height / 2);
      canvasCtx.stroke();
    };

    draw();
  };

  const handleStartHomeRecord = async () => {
    try {
      const ctx = audioEngine.getContext();
      if (ctx.state === 'suspended') {
        try { await ctx.resume(); } catch {}
      }

      let analyser = audioEngine.getMicAnalyser();
      if (!analyser || !micActive) {
        analyser = await audioEngine.startMicStream();
        setMicActive(true);
      }
      if (analyser) startVisualizer(analyser);

      await audioEngine.startRecording();
      setRecordState('recording');
      setRecordSeconds(0);

      timerRef.current = window.setInterval(() => {
        setRecordSeconds(prev => prev + 1);
      }, 1000);
    } catch (err) {
      console.error("Home record start error:", err);
      onNavigate('record');
    }
  };

  const handlePauseHomeRecord = () => {
    audioEngine.pauseRecording();
    setRecordState('paused');
    if (timerRef.current) clearInterval(timerRef.current);
  };

  const handleResumeHomeRecord = () => {
    audioEngine.resumeRecording();
    setRecordState('recording');
    timerRef.current = window.setInterval(() => {
      setRecordSeconds(prev => prev + 1);
    }, 1000);
  };

  const handleStopHomeRecord = async () => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);

    try {
      setIsProcessingAutoPipeline(true);
      const take = await audioEngine.stopRecording();
      setRecordState('recorded');

      if (onSaveVocalTake) {
        await onSaveVocalTake(take.buffer, take.blob, homeLyrics);
      }

      setTimeout(() => {
        onNavigate('pipeline');
      }, 300);
    } catch (err) {
      console.error("Error stopping home recording:", err);
      setRecordState('idle');
      setIsProcessingAutoPipeline(false);
    }
  };

  const formatTimer = (totalSeconds: number) => {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleContinueProduction = () => {
    if (!currentProject) {
      onNavigate('record');
      return;
    }
    const nextStage = getNextProductionStage(currentProject);
    onNavigate(nextStage);
  };

  return (
    <div className="space-y-5 pb-20">
      {/* Hero Header & Intent */}
      <div className="bg-gradient-to-br from-indigo-950 via-slate-900 to-purple-950 border border-indigo-500/30 rounded-2xl p-5 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-44 h-44 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
        
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center space-x-2 mb-2 flex-wrap gap-y-1.5">
              <span className="inline-flex items-center space-x-1.5 px-2.5 py-0.5 rounded-full bg-indigo-500/20 border border-indigo-500/40 text-indigo-300 text-xs font-semibold">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                <span>Systematic 7-Step Pipeline</span>
              </span>
            </div>
            <h2 className="text-xl font-black text-white tracking-tight flex items-center space-x-2">
              <span>MUSICBASE SURGE</span>
            </h2>
            <p className="text-xs font-medium text-slate-300 mt-1 max-w-[320px]">
              One single best-of-best system at every step: Record, Clean Voice, Voice Emotion & Sur with Online AI Feeling, Choose Instruments or AI Music, Mix Preview, Master & Download.
            </p>
          </div>
        </div>

        {/* Primary Start Studio Production Call-to-Action */}
        <div className="mt-4 pt-3 border-t border-indigo-500/20">
          <button
            onClick={() => onNavigate('pipeline')}
            className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-indigo-600 via-indigo-500 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-extrabold text-sm flex items-center justify-between shadow-lg shadow-indigo-600/30 transition-all active:scale-98 group"
          >
            <div className="flex items-center space-x-2">
              <Sparkles className="w-4 h-4 text-amber-300 group-hover:rotate-12 transition-transform" />
              <span>Launch Systematic Studio Flow</span>
            </div>
            <div className="flex items-center space-x-1 text-xs text-indigo-200">
              <span>7 Simple Steps</span>
              <ArrowRight className="w-4 h-4 text-white" />
            </div>
          </button>
        </div>

        {/* Current Active Project Quick Status Card */}
        {currentProject && (
          <div className="mt-3 pt-3 border-t border-indigo-500/20 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2 truncate">
                <Layers className="w-3.5 h-3.5 text-indigo-400" />
                <span className="font-bold text-white text-xs truncate max-w-[200px]">{currentProject.title}</span>
              </div>
              <span className="font-mono text-[10px] text-slate-400">
                {currentProject.bpm} BPM • {currentProject.key} {currentProject.scale}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* FEATURED: Instant Home Vocal Recording Studio (Direct Recording on Home Tab) */}
      <div className="bg-slate-900 border border-indigo-500/40 rounded-2xl p-4 shadow-xl space-y-3.5 relative overflow-hidden">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className={`w-3 h-3 rounded-full ${recordState === 'recording' ? 'bg-rose-500 animate-ping' : 'bg-indigo-400'}`} />
            <h3 className="text-xs font-black uppercase tracking-wider text-white">
              Direct Home Vocal Studio
            </h3>
          </div>
          <span className="text-[10px] font-mono text-emerald-400 bg-emerald-950/60 border border-emerald-500/30 px-2 py-0.5 rounded-full flex items-center space-x-1">
            <CheckCircle2 className="w-3 h-3" />
            <span>Record & Auto-Produce</span>
          </span>
        </div>

        {/* Dedicated Online Gemini AI vs Offline Studio Engine Mode Bar */}
        <div className="bg-slate-950/90 p-2 rounded-xl border border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-2">
          <div className="flex items-center space-x-1.5 w-full sm:w-auto">
            <button
              onClick={() => handleToggleProductionMode('online')}
              className={`flex-1 sm:flex-none px-3 py-1.5 rounded-lg text-xs font-extrabold flex items-center justify-center space-x-1.5 transition-all ${
                productionEngineMode === 'online'
                  ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-md border border-purple-400/50'
                  : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5 text-purple-300" />
              <span>🌐 Online Gemini AI</span>
            </button>
            <button
              onClick={() => handleToggleProductionMode('offline')}
              className={`flex-1 sm:flex-none px-3 py-1.5 rounded-lg text-xs font-extrabold flex items-center justify-center space-x-1.5 transition-all ${
                productionEngineMode === 'offline'
                  ? 'bg-indigo-600 text-white shadow-md border border-indigo-400/50'
                  : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
              }`}
            >
              <Zap className="w-3.5 h-3.5 text-amber-400" />
              <span>⚡ Offline Engine</span>
            </button>
          </div>

          <button
            onClick={() => onNavigate('omni_test')}
            className="w-full sm:w-auto text-[11px] text-purple-300 hover:text-purple-200 bg-purple-950/40 hover:bg-purple-900/60 border border-purple-500/30 px-2.5 py-1.5 rounded-lg font-bold flex items-center justify-center space-x-1 transition-all"
            title="Manage Gemini API Keys & Test Router"
          >
            <Cpu className="w-3.5 h-3.5 text-purple-400" />
            <span>🔑 Gemini Keys & Diagnostics</span>
          </button>
        </div>

        {/* Realtime Waveform Oscilloscope & Peak Meter */}
        <div className="relative bg-slate-950 border border-slate-800 rounded-xl overflow-hidden h-20 flex items-center justify-center">
          <canvas ref={canvasRef} width={380} height={80} className="w-full h-full object-cover" />
          
          {recordState === 'idle' && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-950/80 backdrop-blur-xs text-center p-2">
              <Mic className="w-6 h-6 text-indigo-400 mb-1" />
              <p className="text-xs font-bold text-slate-200">Tap Below to Record Vocal Directly</p>
              <p className="text-[10px] text-slate-400">All remaining studio processes happen automatically after recording</p>
            </div>
          )}

          {recordState === 'recording' && (
            <div className="absolute top-2 right-2 bg-rose-950/80 border border-rose-500/40 text-rose-300 px-2 py-0.5 rounded text-[10px] font-mono font-bold flex items-center space-x-1">
              <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
              <span>{formatTimer(recordSeconds)}</span>
            </div>
          )}

          {/* Peak Level VU Indicator */}
          {micActive && recordState === 'recording' && (
            <div className="absolute bottom-2 left-2 right-2 h-1 bg-slate-800 rounded-full overflow-hidden">
              <div 
                className={`h-full transition-all duration-75 ${peakLevel > 85 ? 'bg-rose-500' : 'bg-indigo-400'}`}
                style={{ width: `${peakLevel}%` }}
              />
            </div>
          )}
        </div>

        {/* Home Vocal Lyrics Input (Optional) */}
        <div className="space-y-1">
          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center justify-between">
            <span>Lyrics / Prompt (Optional)</span>
            <span className="text-indigo-400">Auto-detected by AI</span>
          </label>
          <input
            type="text"
            value={homeLyrics}
            onChange={(e) => setHomeLyrics(e.target.value)}
            placeholder="Type or paste song lyrics here..."
            className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
          />
        </div>

        {/* Live Recording Controls */}
        <div className="flex items-center space-x-2">
          {recordState === 'idle' && (
            <button
              onClick={handleStartHomeRecord}
              className="flex-1 py-3 px-4 rounded-xl bg-gradient-to-r from-rose-600 to-indigo-600 hover:from-rose-500 hover:to-indigo-500 text-white font-extrabold text-xs flex items-center justify-center space-x-2 shadow-lg shadow-rose-600/20 active:scale-98 transition-all"
            >
              <div className="w-5 h-5 rounded-full bg-white/20 flex items-center justify-center">
                <Mic className="w-3.5 h-3.5 text-white" />
              </div>
              <span>Start Recording Right Here (Step 1)</span>
            </button>
          )}

          {recordState === 'recording' && (
            <>
              <button
                onClick={handlePauseHomeRecord}
                className="px-3 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-300 font-bold text-xs flex items-center justify-center space-x-1"
              >
                <Pause className="w-4 h-4" />
                <span>Pause</span>
              </button>
              <button
                onClick={handleStopHomeRecord}
                disabled={isProcessingAutoPipeline}
                className="flex-1 py-3 px-4 rounded-xl bg-gradient-to-r from-emerald-600 to-indigo-600 hover:from-emerald-500 hover:to-indigo-500 text-white font-extrabold text-xs flex items-center justify-center space-x-2 shadow-lg shadow-emerald-600/30 active:scale-98 transition-all"
              >
                <Square className="w-4 h-4 text-white fill-white" />
                <span>{isProcessingAutoPipeline ? 'Auto-Producing Song...' : 'Stop & Auto-Produce Full Song'}</span>
              </button>
            </>
          )}

          {recordState === 'paused' && (
            <>
              <button
                onClick={handleResumeHomeRecord}
                className="flex-1 py-3 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-extrabold text-xs flex items-center justify-center space-x-2"
              >
                <Play className="w-4 h-4 fill-white" />
                <span>Resume Recording</span>
              </button>
              <button
                onClick={handleStopHomeRecord}
                disabled={isProcessingAutoPipeline}
                className="flex-1 py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-xs flex items-center justify-center space-x-2"
              >
                <Square className="w-4 h-4 text-white fill-white" />
                <span>Stop & Auto-Produce</span>
              </button>
            </>
          )}
        </div>
      </div>

      {/* 7-Step Visual Workflow Roadmap */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 space-y-2.5">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300">
            Systematic Song Workflow
          </h3>
          <span className="text-[10px] text-emerald-400 font-semibold bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
            Linear & Uncluttered
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {[
            { step: '1', title: 'Record Voice', desc: 'Raw voice take or upload audio', route: 'record' as const },
            { step: '2', title: 'Clean Voice', desc: 'Best single studio AI cleaner', route: 'cleanup' as const },
            { step: '3', title: 'Voice Emotion & Sur', desc: 'Pitch, tempo, bhav & online AI', route: 'pitch' as const },
            { step: '4', title: 'Create Music', desc: 'Pick Instruments OR AI Made', route: 'accompaniment' as const },
            { step: '5', title: 'Mix Preview', desc: 'Sync playback & vocal faders', route: 'mixer' as const },
            { step: '6', title: 'Mix Mastering', desc: '-14 LUFS radio loudness boost', route: 'mastering' as const },
            { step: '7', title: 'Download', desc: 'Master WAV, MP3 & Stems', route: 'export' as const },
          ].map((s) => (
            <div
              key={s.step}
              onClick={() => {
                if (s.step === '1' && recordState === 'idle') {
                  handleStartHomeRecord();
                } else {
                  onNavigate(s.route);
                }
              }}
              className="bg-slate-950 p-2.5 rounded-xl border border-slate-800/80 hover:border-indigo-500/40 cursor-pointer transition-all active:scale-95"
            >
              <div className="flex items-center space-x-1.5 mb-1">
                <span className="w-4 h-4 rounded-full bg-indigo-600/30 text-indigo-400 text-[10px] font-bold flex items-center justify-center">
                  {s.step}
                </span>
                <span className="text-xs font-bold text-white">{s.title}</span>
              </div>
              <p className="text-[10px] text-slate-400 leading-tight">{s.desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Primary Action Buttons */}
      <div className="grid grid-cols-2 gap-3">
        <button
          onClick={() => {
            if (recordState === 'idle') {
              handleStartHomeRecord();
            } else if (recordState === 'recording') {
              handleStopHomeRecord();
            } else {
              onNavigate('record');
            }
          }}
          className="flex flex-col items-center justify-center p-4 bg-gradient-to-b from-indigo-600 to-indigo-700 hover:from-indigo-500 hover:to-indigo-600 text-white rounded-2xl shadow-lg shadow-indigo-600/30 active:scale-[0.98] transition-all group border border-indigo-400/30"
        >
          <div className="w-11 h-11 rounded-full bg-white/15 flex items-center justify-center mb-1.5 group-hover:scale-110 transition-transform">
            <Mic className="w-5 h-5 text-white" />
          </div>
          <span className="text-xs font-bold tracking-tight">
            {recordState === 'recording' ? 'Stop & Auto-Produce' : 'Record Vocal Directly'}
          </span>
          <span className="text-[10px] text-indigo-200 font-medium">
            {recordState === 'recording' ? formatTimer(recordSeconds) : 'Start recording on Home'}
          </span>
        </button>

        <button
          onClick={() => fileInputRef.current?.click()}
          className="flex flex-col items-center justify-center p-4 bg-slate-800/90 hover:bg-slate-800 text-white rounded-2xl shadow-md border border-slate-700 active:scale-[0.98] transition-all group"
        >
          <div className="w-11 h-11 rounded-full bg-slate-700/60 flex items-center justify-center mb-1.5 group-hover:scale-110 transition-transform text-indigo-400">
            <Upload className="w-5 h-5" />
          </div>
          <span className="text-xs font-bold tracking-tight">Import Audio File</span>
          <span className="text-[10px] text-slate-400 font-medium">Load WAV / MP3</span>
          <input
            ref={fileInputRef}
            type="file"
            accept="audio/*"
            onChange={handleFileChange}
            className="hidden"
          />
        </button>
      </div>

      {/* VĀK Multimodal Vocal & Sensory System Featured Banner */}
      <div 
        onClick={() => onNavigate('vak')}
        className="bg-gradient-to-r from-cyan-950/70 via-indigo-950/80 to-purple-950/70 border border-cyan-500/30 hover:border-cyan-400/60 rounded-2xl p-3.5 shadow-lg cursor-pointer transition-all active:scale-[0.99] group"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-cyan-500/20 border border-cyan-500/40 flex items-center justify-center text-cyan-300 group-hover:scale-105 transition-transform">
              <Sparkles className="w-5 h-5 text-cyan-400" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h4 className="text-xs font-black text-white tracking-wide uppercase">VĀK SYSTEM</h4>
                <span className="px-1.5 py-0.5 bg-cyan-500/20 text-cyan-300 text-[10px] rounded font-bold border border-cyan-500/30">
                  Visual • Audio • Kinesthetic
                </span>
              </div>
              <p className="text-[11px] text-slate-300 font-medium mt-0.5">
                Chroma pitch wheel, Tanpura drone, Reverb monitor & tactile haptic pads
              </p>
            </div>
          </div>
          <div className="p-2 rounded-lg bg-slate-800/80 text-cyan-400 group-hover:bg-cyan-500 group-hover:text-slate-950 transition-colors">
            <ArrowRight className="w-4 h-4" />
          </div>
        </div>
      </div>

      {/* Advanced / Manual Workstations */}
      <div className="space-y-2.5">
        <div className="flex items-center justify-between px-1">
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300">Advanced Workstations</h3>
            <p className="text-[10px] text-slate-500">Fine-tune individual stages manually</p>
          </div>
          <span className="text-[11px] text-indigo-400 font-medium">8 Tools</span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
          {[
            { id: 'vak' as ScreenId, label: 'VĀK Studio', desc: 'Visual, Audio, Kinesthetic', icon: Radio, color: 'text-cyan-400', bg: 'bg-cyan-500/10 border-cyan-500/20' },
            { id: 'director' as ScreenId, label: 'AI Music Director', desc: 'Lyric & Emotion Brain', icon: Sparkles, color: 'text-pink-400', bg: 'bg-pink-500/10 border-pink-500/20' },
            { id: 'cleanup' as ScreenId, label: 'Vocal Cleanup', desc: 'HPF, De-esser, Denoise', icon: Sparkles, color: 'text-amber-400', bg: 'bg-amber-500/10 border-amber-500/20' },
            { id: 'accompaniment' as ScreenId, label: 'Accompaniment', desc: 'Multi-Instrument Synth', icon: Music, color: 'text-purple-400', bg: 'bg-purple-500/10 border-purple-500/20' },
            { id: 'pitch' as ScreenId, label: 'Pitch Detector', desc: 'YIN realtime tuner', icon: Activity, color: 'text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/20' },
            { id: 'bpm_key' as ScreenId, label: 'BPM & Key', desc: 'Tempo & Scale detector', icon: Gauge, color: 'text-cyan-400', bg: 'bg-cyan-500/10 border-cyan-500/20' },
            { id: 'mixer' as ScreenId, label: 'Studio Mixer', desc: 'Tracks, Pan, Faders', icon: Sliders, color: 'text-indigo-400', bg: 'bg-indigo-500/10 border-indigo-500/20' },
            { id: 'mastering' as ScreenId, label: 'Mastering', desc: 'DSP Master Presets', icon: Zap, color: 'text-rose-400', bg: 'bg-rose-500/10 border-rose-500/20' },
          ].map((tool) => {
            const Icon = tool.icon;
            return (
              <button
                key={tool.id}
                onClick={() => onNavigate(tool.id)}
                className="bg-slate-900/90 border border-slate-800 hover:border-slate-700 p-3 rounded-xl text-left transition-all active:scale-[0.98] flex flex-col justify-between group"
              >
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${tool.bg} ${tool.color} mb-2`}>
                  <Icon className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-white group-hover:text-indigo-300 transition-colors">{tool.label}</h4>
                  <p className="text-[10px] text-slate-400 mt-0.5 leading-tight">{tool.desc}</p>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Recent Projects & Takes */}
      <div className="space-y-2.5">
        <div className="flex items-center justify-between px-1">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">Recent Projects</h3>
          <button
            onClick={() => onNavigate('projects')}
            className="text-xs text-indigo-400 hover:text-indigo-300 font-semibold"
          >
            View All ({projects.length})
          </button>
        </div>

        {(!projects || projects.length === 0) ? (
          <div className="bg-slate-900/50 border border-slate-800/80 rounded-xl p-6 text-center">
            <FolderOpen className="w-8 h-8 text-slate-600 mx-auto mb-2" />
            <p className="text-xs font-semibold text-slate-300">No saved projects yet</p>
            <p className="text-[11px] text-slate-500 mt-0.5">Start by recording a vocal take or importing audio</p>
          </div>
        ) : (
          <div className="space-y-2">
            {(projects || []).slice(0, 3).map((proj) => (
              <div
                key={proj.id}
                onClick={() => {
                  if (onSelectProject) onSelectProject(proj);
                  onNavigate('mixer');
                }}
                className={`p-3 rounded-xl border transition-all cursor-pointer flex items-center justify-between ${
                  currentProject?.id === proj.id
                    ? 'bg-indigo-950/40 border-indigo-500/40'
                    : 'bg-slate-900 border-slate-800 hover:border-slate-700'
                }`}
              >
                <div className="flex items-center space-x-3">
                  <div className="w-9 h-9 rounded-lg bg-slate-800 flex items-center justify-center text-indigo-400">
                    <Music className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-white">{proj.title}</h4>
                    <div className="flex items-center space-x-2 text-[10px] text-slate-400 mt-0.5">
                      <span>{proj.genre}</span>
                      <span>•</span>
                      <span>{proj.bpm} BPM</span>
                      <span>•</span>
                      <span>{proj.key}</span>
                      <span>•</span>
                      <span>{(proj.tracks || []).length} stems</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center space-x-1">
                  {proj.isCleaned && (
                    <span className="p-1 rounded bg-amber-500/10 text-amber-400" title="Vocal Cleaned">
                      <Sparkles className="w-3 h-3" />
                    </span>
                  )}
                  {proj.isMastered && (
                    <span className="p-1 rounded bg-emerald-500/10 text-emerald-400" title="Mastered">
                      <CheckCircle2 className="w-3 h-3" />
                    </span>
                  )}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      if (onSelectProject) onSelectProject(proj);
                      onNavigate('export');
                    }}
                    className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800"
                    title="Export Audio"
                  >
                    <Share2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

