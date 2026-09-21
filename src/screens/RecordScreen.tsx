import React, { useState, useEffect, useRef } from 'react';
import { 
  Mic, 
  Square, 
  Pause, 
  Play, 
  RotateCcw, 
  Trash2, 
  Volume2, 
  Sparkles, 
  Save, 
  ChevronLeft,
  AlertTriangle,
  Zap,
  ArrowRight,
  BookOpen,
  FileText,
  Sliders,
  Type,
  Maximize2,
  Minimize2,
  Clock,
  Music2,
  Layers
} from 'lucide-react';
import { WebAudioEngine } from '../services/webAudioEngine';
import { ScreenId, StudioProject } from '../types/audio';
import { ProductionProgress } from '../components/ProductionProgress';
import { ProductionStageHeader } from '../components/ProductionStageHeader';

interface RecordScreenProps {
  currentProject: StudioProject | null;
  onNavigate: (screen: ScreenId) => void;
  onSaveVocalTake: (buffer: AudioBuffer, blob: Blob, capturedLyrics?: string) => void;
}

const LYRICS_PRESETS = [
  {
    id: 'bollywood_romantic',
    title: 'Hindi Romantic (Acoustic)',
    genre: 'Bollywood Romantic',
    lyrics: `[Intro - Vocal Humming]
Mmm... haa... aa...

[Verse 1]
Khoya rehta hoon teri yaadon mein har pal,
Tere bina yeh dil lagta nahi be-kal.
Saanson ki dori bandhi hai tujhse sanam,
Tu hi meri manzil, tu hi mera humdam.

[Chorus]
Tere bin... jeena ab mushkil hai,
Tu meri jaan, tu hi meri manzil hai.
Ho gaya fida yeh dil tujh par sanam,
Tere saath hi chalenge har ek kadam.

[Interlude]
(Acoustic Guitar & Flute Alaap)

[Verse 2]
Chandni raaton mein tera chehra khile,
Jaise sehra mein koi phool mile.
Haath thamo mera, kabhi na chhodna,
Is dil ke rishtey ko kabhi na todna.`
  },
  {
    id: 'sufi_qawwali',
    title: 'Sufi / Ghazal Alaap',
    genre: 'Sufi Classical',
    lyrics: `[Alaap]
Aa... Maula... Rang de ni rang de...

[Chorus]
Chaap tilak sab cheeni re tose naina milai ke,
Prem bhatee ka madhva pilai ke,
Matwali kar deeni re tose naina milai ke.

[Verse]
Bal bal jaaun main tore charanwan,
Apni chhab banayi ke jo main pi ke paas gayi,
Chhab dekhi jab pi ki to apni bhool gayi!`
  },
  {
    id: 'punjabi_pop',
    title: 'Punjabi Folk / Beat',
    genre: 'Punjabi Groove',
    lyrics: `[Hook]
Challa mera ji dhola,
Koyi gal sunave khol ke,
Tere baajon dil nai lagda,
Ve sajna bol ke!

[Verse]
Akhiyaan udeek diyan,
Dil vaajan maarda,
Tu aaja saade kol ve,
Eho waqt pyar da!`
  },
  {
    id: 'english_pop',
    title: 'English Pop Ballad',
    genre: 'Pop Ballad',
    lyrics: `[Verse 1]
Walking down the empty street at midnight,
Looking for a spark in the neon light.
Every whisper of the wind sings your name,
Nothing in this city ever feels the same.

[Chorus]
Hold my hand before the morning comes,
Dancing to the beat of our racing hearts.
We were made to shine through the darkest night,
Forever burning bright!`
  }
];

export const RecordScreen: React.FC<RecordScreenProps> = ({
  currentProject,
  onNavigate,
  onSaveVocalTake,
}) => {
  const [recordState, setRecordState] = useState<'idle' | 'recording' | 'paused' | 'recorded' | 'saved'>('idle');
  const [recordSeconds, setRecordSeconds] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [peakLevel, setPeakLevel] = useState(0);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [micActive, setMicActive] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

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

  // Teleprompter & Live Lyrics State
  const [showTeleprompter, setShowTeleprompter] = useState(true);
  const [lyricsText, setLyricsText] = useState(currentProject?.lyrics || LYRICS_PRESETS[0].lyrics);
  const [autoScroll, setAutoScroll] = useState(true);
  const [scrollSpeed, setScrollSpeed] = useState<number>(1.0); // 0.5x, 1x, 1.5x, 2x
  const [fontSize, setFontSize] = useState<'sm' | 'base' | 'lg' | 'xl'>('base');
  const [currentBeat, setCurrentBeat] = useState(1);

  // Live AI Vocal Speech/Lyric Recognition
  const [liveLyrics, setLiveLyrics] = useState<string>('');
  const [isTranscribing, setIsTranscribing] = useState(false);
  const speechRecognitionRef = useRef<any>(null);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const timerRef = useRef<number | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const recordedTakeRef = useRef<{ buffer: AudioBuffer; blob: Blob } | null>(null);
  const activeSourceRef = useRef<AudioBufferSourceNode | null>(null);
  const teleprompterRef = useRef<HTMLDivElement>(null);

  const audioEngine = WebAudioEngine.getInstance();
  const bpm = currentProject?.bpm || 120;

  // Initialize Speech Recognition for Live Lyric Extraction
  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      try {
        const recognition = new SpeechRecognition();
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.lang = 'hi-IN';

        recognition.onresult = (event: any) => {
          let interimTranscript = '';
          let finalTranscript = '';
          for (let i = event.resultIndex; i < event.results.length; ++i) {
            if (event.results[i].isFinal) {
              finalTranscript += event.results[i][0].transcript + ' ';
            } else {
              interimTranscript += event.results[i][0].transcript;
            }
          }
          const accumulated = (finalTranscript + interimTranscript).trim();
          if (accumulated) {
            setLiveLyrics(prev => (prev ? `${prev}\n${accumulated}` : accumulated));
            setLyricsText(prev => (prev ? `${prev}\n${accumulated}` : accumulated));
          }
        };

        recognition.onerror = (e: any) => {
          console.warn('Speech recognition warning/silence:', e);
        };

        speechRecognitionRef.current = recognition;
      } catch (err) {
        console.warn('Speech recognition not available in this environment:', err);
      }
    }

    return () => {
      if (speechRecognitionRef.current) {
        try {
          speechRecognitionRef.current.stop();
        } catch {
          // ignore
        }
      }
    };
  }, []);

  // Metronome visual pulse counter during recording
  useEffect(() => {
    let beatInterval: number | null = null;
    if (recordState === 'recording') {
      const beatMs = (60 / bpm) * 1000;
      beatInterval = window.setInterval(() => {
        setCurrentBeat(prev => (prev % 4) + 1);
      }, beatMs);
    } else {
      setCurrentBeat(1);
    }
    return () => {
      if (beatInterval) clearInterval(beatInterval);
    };
  }, [recordState, bpm]);

  // Teleprompter Auto-Scroll Effect during recording
  useEffect(() => {
    let scrollInterval: number | null = null;
    if (recordState === 'recording' && autoScroll && teleprompterRef.current) {
      scrollInterval = window.setInterval(() => {
        if (teleprompterRef.current) {
          teleprompterRef.current.scrollTop += 1 * scrollSpeed;
        }
      }, 40);
    }
    return () => {
      if (scrollInterval) clearInterval(scrollInterval);
    };
  }, [recordState, autoScroll, scrollSpeed]);

  // Mic Stream & Visualizer initialization lifecycle
  useEffect(() => {
    let isMounted = true;

    // Attach to existing mic stream if present in WebAudioEngine
    const existingAnalyser = audioEngine.getMicAnalyser();
    if (existingAnalyser && isMounted) {
      setMicActive(true);
      startVisualizer(existingAnalyser);
    }

    return () => {
      isMounted = false;
      if (timerRef.current) clearInterval(timerRef.current);
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
      audioEngine.stopAllPlayback();
    };
  }, []);

  const startVisualizer = (analyser: AnalyserNode) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const canvasCtx = canvas.getContext('2d');
    if (!canvasCtx) return;

    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    const draw = () => {
      animationFrameRef.current = requestAnimationFrame(draw);
      analyser.getByteTimeDomainData(dataArray);

      // Compute VU peak level
      let sum = 0;
      for (let i = 0; i < bufferLength; i++) {
        const val = (dataArray[i] - 128) / 128;
        sum += val * val;
      }
      const rms = Math.sqrt(sum / bufferLength);
      setPeakLevel(Math.min(100, Math.round(rms * 280)));

      // Render Oscilloscope Waveform
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

        if (i === 0) {
          canvasCtx.moveTo(x, y);
        } else {
          canvasCtx.lineTo(x, y);
        }

        x += sliceWidth;
      }

      canvasCtx.lineTo(canvas.width, canvas.height / 2);
      canvasCtx.stroke();
    };

    draw();
  };

  // Recording Controls
  const handleStartRecord = async () => {
    try {
      setErrorMsg(null);
      const ctx = audioEngine.getContext();
      if (ctx.state === 'suspended') {
        try { await ctx.resume(); } catch {}
      }

      let analyser = audioEngine.getMicAnalyser();
      if (!analyser || !micActive) {
        analyser = await audioEngine.startMicStream();
        setMicActive(true);
        startVisualizer(analyser);
      }

      if (teleprompterRef.current) teleprompterRef.current.scrollTop = 0;

      await audioEngine.startRecording();
      setRecordState('recording');
      setRecordSeconds(0);

      // Start Speech Recognition for lyrics auto-capture
      if (speechRecognitionRef.current) {
        try {
          speechRecognitionRef.current.start();
          setIsTranscribing(true);
        } catch {
          // Already running
        }
      }

      timerRef.current = window.setInterval(() => {
        setRecordSeconds(prev => prev + 1);
      }, 1000);
    } catch (err: unknown) {
      setErrorMsg((err as Error).message || "Failed to start recording");
    }
  };

  const handlePauseRecord = () => {
    audioEngine.pauseRecording();
    setRecordState('paused');
    if (timerRef.current) clearInterval(timerRef.current);
    if (speechRecognitionRef.current) {
      try { speechRecognitionRef.current.stop(); } catch {}
      setIsTranscribing(false);
    }
  };

  const handleResumeRecord = () => {
    audioEngine.resumeRecording();
    setRecordState('recording');
    if (speechRecognitionRef.current) {
      try { speechRecognitionRef.current.start(); } catch {}
      setIsTranscribing(true);
    }
    timerRef.current = window.setInterval(() => {
      setRecordSeconds(prev => prev + 1);
    }, 1000);
  };

  const handleStopRecord = async () => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (speechRecognitionRef.current) {
      try { speechRecognitionRef.current.stop(); } catch {}
      setIsTranscribing(false);
    }

    try {
      const take = await audioEngine.stopRecording();
      recordedTakeRef.current = take;
      setRecordState('recorded');

      // Automatic Save & Immediate Production Pipeline Launch
      const effectiveLyrics = (lyricsText || liveLyrics || currentProject?.lyrics || '').trim();
      onSaveVocalTake(take.buffer, take.blob, effectiveLyrics);
      setRecordState('saved');

      // Launch automated production pipeline seamlessly
      onNavigate('pipeline');
    } catch (err: unknown) {
      setErrorMsg((err as Error).message || "Error saving recording");
      setRecordState('idle');
    }
  };

  const handlePlayTake = () => {
    if (!recordedTakeRef.current) return;
    if (isPlaying) {
      audioEngine.stopAllPlayback();
      setIsPlaying(false);
      return;
    }

    setIsPlaying(true);
    activeSourceRef.current = audioEngine.playBuffer(recordedTakeRef.current.buffer, () => {
      setIsPlaying(false);
    });
  };

  const handleRetake = () => {
    audioEngine.stopAllPlayback();
    setIsPlaying(false);
    recordedTakeRef.current = null;
    setRecordSeconds(0);
    handleStartRecord();
  };

  const handleDeleteTake = () => {
    audioEngine.stopAllPlayback();
    setIsPlaying(false);
    recordedTakeRef.current = null;
    setRecordSeconds(0);
    setRecordState('idle');
    setShowDeleteModal(false);
  };

  const handleSaveTake = async () => {
    if (!recordedTakeRef.current) return;
    try {
      const effectiveLyrics = (lyricsText || liveLyrics || currentProject?.lyrics || '').trim();
      onSaveVocalTake(recordedTakeRef.current.buffer, recordedTakeRef.current.blob, effectiveLyrics);
      setRecordState('saved');
    } catch (err: unknown) {
      setErrorMsg((err as Error).message || "Failed to save vocal take");
    }
  };

  const handleExplicitContinue = () => {
    if (recordedTakeRef.current && recordState !== 'saved') {
      const effectiveLyrics = (lyricsText || liveLyrics || currentProject?.lyrics || '').trim();
      onSaveVocalTake(recordedTakeRef.current.buffer, recordedTakeRef.current.blob, effectiveLyrics);
      setRecordState('saved');
    }
    onNavigate('pipeline');
  };

  const formatTimer = (totalSeconds: number) => {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="space-y-4 pb-20">
      {/* Top Header */}
      <ProductionStageHeader
        currentScreen="record"
        currentProject={currentProject}
        onNavigate={onNavigate}
        title="Vocal Recording & Live Teleprompter"
        subtitle="High-definition microphone capture with synchronized lyric prompter"
        rightAction={
          <div className="flex items-center space-x-1.5 text-[10px] px-2 py-1 bg-slate-900 border border-slate-800 rounded-lg">
            <span className={`w-1.5 h-1.5 rounded-full ${micActive ? 'bg-emerald-400' : 'bg-rose-500'}`} />
            <span className="text-slate-400 font-mono hidden sm:inline">44.1 kHz PCM</span>
          </div>
        }
      />

      <ProductionProgress currentScreen="record" currentProject={currentProject} onNavigate={onNavigate} />

      {/* Online Gemini AI vs Offline Studio Engine Mode Selector */}
      <div className="bg-slate-900 p-2 rounded-xl border border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-2 shadow-md">
        <div className="flex items-center space-x-1.5 w-full sm:w-auto">
          <button
            onClick={() => handleToggleProductionMode('online')}
            className={`flex-1 sm:flex-none px-3 py-1.5 rounded-lg text-xs font-extrabold flex items-center justify-center space-x-1.5 transition-all ${
              productionEngineMode === 'online'
                ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-md border border-purple-400/50'
                : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5 text-purple-300" />
            <span>🌐 Online Gemini AI Mode</span>
          </button>
          <button
            onClick={() => handleToggleProductionMode('offline')}
            className={`flex-1 sm:flex-none px-3 py-1.5 rounded-lg text-xs font-extrabold flex items-center justify-center space-x-1.5 transition-all ${
              productionEngineMode === 'offline'
                ? 'bg-indigo-600 text-white shadow-md border border-indigo-400/50'
                : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
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
          <Zap className="w-3.5 h-3.5 text-purple-400" />
          <span>🔑 Gemini Keys & Diagnostics</span>
        </button>
      </div>

      {errorMsg && (
        <div className="p-3 bg-rose-500/10 border border-rose-500/30 text-rose-300 rounded-xl text-xs flex items-center space-x-2">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Live Waveform Oscilloscope & Stage Bar */}
      <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 relative overflow-hidden shadow-inner">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center space-x-2">
            <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
              recordState === 'recording' 
                ? 'bg-rose-500 text-white animate-pulse' 
                : recordState === 'paused'
                ? 'bg-amber-500 text-black'
                : recordState === 'recorded'
                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                : 'bg-slate-800 text-slate-400'
            }`}>
              {recordState}
            </span>
            {currentProject && (
              <span className="text-[11px] text-slate-400 font-medium truncate max-w-[150px]">
                {currentProject.key} • {currentProject.bpm} BPM
              </span>
            )}
          </div>

          {/* Visual Metronome Beat Indicator */}
          <div className="flex items-center space-x-1.5 bg-slate-900/90 px-2.5 py-1 rounded-lg border border-slate-800">
            <Clock className="w-3 h-3 text-slate-400" />
            <div className="flex space-x-1">
              {[1, 2, 3, 4].map(b => (
                <span
                  key={b}
                  className={`w-2 h-2 rounded-full transition-all duration-75 ${
                    recordState === 'recording' && currentBeat === b
                      ? 'bg-rose-500 scale-125 shadow-sm shadow-rose-500'
                      : 'bg-slate-700'
                  }`}
                />
              ))}
            </div>
            <span className="text-xs font-mono font-bold text-indigo-400 ml-1">
              {formatTimer(recordSeconds)}
            </span>
          </div>
        </div>

        <canvas
          ref={canvasRef}
          width={400}
          height={100}
          className="w-full h-24 rounded-lg bg-[#090d16]"
        />

        {/* Real-time Decibel VU Meter Bar */}
        <div className="mt-3 flex items-center space-x-2">
          <Volume2 className="w-3.5 h-3.5 text-slate-400 shrink-0" />
          <div className="flex-1 h-2 bg-slate-900 rounded-full overflow-hidden p-0.5 border border-slate-800 flex items-center">
            <div
              className={`h-full rounded-full transition-all duration-75 ${
                peakLevel > 80 ? 'bg-rose-500' : peakLevel > 50 ? 'bg-amber-400' : 'bg-emerald-400'
              }`}
              style={{ width: `${peakLevel}%` }}
            />
          </div>
          <span className="text-[10px] font-mono text-slate-400 w-8 text-right">
            {peakLevel}%
          </span>
        </div>
      </div>

      {/* Primary Action Recording Controls */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-3">
        {recordState === 'idle' && (
          <button
            onClick={handleStartRecord}
            className="w-full py-4 bg-rose-600 hover:bg-rose-500 text-white rounded-2xl font-bold text-sm tracking-wide shadow-lg shadow-rose-600/30 flex items-center justify-center space-x-2 active:scale-[0.98] transition-all"
          >
            <Mic className="w-5 h-5" />
            <span>Record Vocal Take with Teleprompter</span>
          </button>
        )}

        {(recordState === 'recording' || recordState === 'paused') && (
          <div className="space-y-3">
            {/* Live AI Speech & Lyric Listener Status */}
            <div className="p-2.5 bg-indigo-950/80 border border-indigo-500/30 rounded-xl flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                <span className="text-[11px] font-bold text-indigo-200">
                  {isTranscribing ? 'AI Lyric Listener: Live Transcribing Vocals...' : 'AI Lyric Brain: Synced to Song Lyrics'}
                </span>
              </div>
              <span className="text-[9px] px-2 py-0.5 bg-indigo-500/20 text-indigo-300 rounded font-mono font-semibold">
                Auto-Processing
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3">
              {recordState === 'recording' ? (
                <button
                  onClick={handlePauseRecord}
                  className="py-3.5 bg-amber-600 hover:bg-amber-500 text-white rounded-xl font-bold text-xs flex items-center justify-center space-x-1.5 active:scale-[0.98] transition-all"
                >
                  <Pause className="w-4 h-4" />
                  <span>Pause</span>
                </button>
              ) : (
                <button
                  onClick={handleResumeRecord}
                  className="py-3.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold text-xs flex items-center justify-center space-x-1.5 active:scale-[0.98] transition-all"
                >
                  <Play className="w-4 h-4" />
                  <span>Resume</span>
                </button>
              )}

              <button
                onClick={handleStopRecord}
                className="py-3.5 bg-slate-800 hover:bg-slate-700 text-white rounded-xl font-bold text-xs flex items-center justify-center space-x-1.5 border border-slate-700 active:scale-[0.98] transition-all"
              >
                <Square className="w-4 h-4 text-rose-400" />
                <span>Stop Take</span>
              </button>
            </div>
          </div>
        )}

        {(recordState === 'recorded' || recordState === 'saved') && (
          <div className="space-y-3">
            {recordState === 'saved' && (
              <div className="p-3 bg-emerald-950/80 border border-emerald-500/40 rounded-xl flex items-center space-x-2 text-emerald-300 text-xs font-bold">
                <Save className="w-4 h-4 shrink-0" />
                <span>✓ Vocal Take Saved as Canonical Audio Asset in Project</span>
              </div>
            )}

            <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 flex items-center justify-between">
              <div className="flex items-center space-x-2.5">
                <button
                  onClick={handlePlayTake}
                  className="w-10 h-10 rounded-full bg-indigo-600 hover:bg-indigo-500 text-white flex items-center justify-center shadow-md active:scale-95 transition-transform"
                >
                  {isPlaying ? <Square className="w-4 h-4" /> : <Play className="w-4 h-4 ml-0.5" />}
                </button>
                <div>
                  <h4 className="text-xs font-bold text-white">Vocal Take 01</h4>
                  <p className="text-[10px] text-slate-400 font-mono">Length: {formatTimer(recordSeconds)}</p>
                </div>
              </div>

              <div className="flex items-center space-x-1">
                <button
                  onClick={handleRetake}
                  className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 text-xs flex items-center space-x-1"
                  title="Retake"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span className="text-[11px]">Retake</span>
                </button>
                <button
                  onClick={() => setShowDeleteModal(true)}
                  className="p-2 text-rose-400 hover:text-rose-300 rounded-lg hover:bg-slate-800 text-xs flex items-center space-x-1"
                  title="Delete Take"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Explicit Action Buttons */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              {recordState === 'recorded' ? (
                <button
                  onClick={handleSaveTake}
                  className="py-3.5 px-4 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold text-xs flex items-center justify-center space-x-2 shadow-lg shadow-emerald-600/20 active:scale-[0.98] transition-all"
                >
                  <Save className="w-4 h-4" />
                  <span>Save Vocal Take</span>
                </button>
              ) : (
                <button
                  onClick={handleDeleteTake}
                  className="py-3.5 px-4 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl font-bold text-xs flex items-center justify-center space-x-2 border border-slate-700 active:scale-[0.98] transition-all"
                >
                  <RotateCcw className="w-4 h-4" />
                  <span>Record New Take</span>
                </button>
              )}

              <button
                onClick={handleExplicitContinue}
                className="py-3.5 px-4 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white rounded-xl font-bold text-xs flex items-center justify-center space-x-2 shadow-lg shadow-indigo-600/30 active:scale-[0.98] transition-all border border-indigo-400/30"
              >
                <span>Continue to Studio Flow</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* LIVE STUDIO LYRICS TELEPROMPTER */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-lg">
        {/* Prompter Header Controls */}
        <div className="p-3.5 bg-slate-950 border-b border-slate-800 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center space-x-2">
            <BookOpen className="w-4 h-4 text-indigo-400" />
            <h3 className="text-xs font-bold text-white uppercase tracking-wider">Live Lyrics Teleprompter</h3>
          </div>

          <div className="flex items-center space-x-1.5 text-xs">
            {/* Auto Scroll Toggle */}
            <button
              onClick={() => setAutoScroll(!autoScroll)}
              className={`px-2 py-1 rounded-lg text-[10px] font-bold border transition-all ${
                autoScroll
                  ? 'bg-indigo-600 border-indigo-400 text-white'
                  : 'bg-slate-900 border-slate-800 text-slate-400'
              }`}
            >
              Auto-Scroll: {autoScroll ? 'ON' : 'OFF'}
            </button>

            {/* Scroll Speed */}
            <select
              value={scrollSpeed}
              onChange={(e) => setScrollSpeed(parseFloat(e.target.value))}
              className="bg-slate-900 border border-slate-800 text-slate-300 text-[10px] rounded-lg px-1.5 py-1"
            >
              <option value="0.6">0.6x Slow</option>
              <option value="1.0">1.0x Normal</option>
              <option value="1.5">1.5x Fast</option>
              <option value="2.0">2.0x Fast</option>
            </select>

            {/* Font Size Toggle */}
            <div className="flex bg-slate-900 p-0.5 rounded-lg border border-slate-800">
              {(['sm', 'base', 'lg', 'xl'] as const).map(s => (
                <button
                  key={s}
                  onClick={() => setFontSize(s)}
                  className={`px-1.5 py-0.5 text-[9px] uppercase font-bold rounded ${
                    fontSize === s ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Quick Lyric Presets Bar */}
        <div className="p-2 bg-slate-950/60 border-b border-slate-800/80 flex items-center space-x-1.5 overflow-x-auto text-[10px]">
          <span className="text-slate-500 font-semibold uppercase px-1 shrink-0">Sample Songs:</span>
          {LYRICS_PRESETS.map(preset => (
            <button
              key={preset.id}
              onClick={() => setLyricsText(preset.lyrics)}
              className="px-2 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 shrink-0 font-medium transition-colors"
            >
              {preset.title}
            </button>
          ))}
        </div>

        {/* Prompter Scrolling Stage View */}
        <div
          ref={teleprompterRef}
          className={`p-4 h-56 overflow-y-auto bg-[#070a11] transition-all scroll-smooth text-center ${
            fontSize === 'sm' ? 'text-xs leading-relaxed' :
            fontSize === 'base' ? 'text-sm leading-relaxed font-medium' :
            fontSize === 'lg' ? 'text-base leading-loose font-semibold' :
            'text-lg leading-loose font-bold'
          }`}
        >
          <textarea
            value={lyricsText}
            onChange={(e) => setLyricsText(e.target.value)}
            placeholder="Type or paste your song lyrics here..."
            className="w-full h-full bg-transparent text-slate-200 resize-none focus:outline-none placeholder:text-slate-600 leading-relaxed font-sans text-center"
            rows={12}
          />
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 max-w-xs w-full space-y-4 shadow-2xl">
            <div className="w-10 h-10 rounded-full bg-rose-500/10 text-rose-400 flex items-center justify-center mx-auto">
              <Trash2 className="w-5 h-5" />
            </div>
            <div className="text-center">
              <h3 className="text-sm font-bold text-white">Delete Recording Take?</h3>
              <p className="text-xs text-slate-400 mt-1">This will discard the current vocal take permanently.</p>
            </div>
            <div className="grid grid-cols-2 gap-2 pt-2">
              <button
                onClick={() => setShowDeleteModal(false)}
                className="py-2.5 rounded-xl bg-slate-800 text-xs font-semibold text-slate-300 hover:bg-slate-700"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteTake}
                className="py-2.5 rounded-xl bg-rose-600 text-xs font-bold text-white hover:bg-rose-500"
              >
                Delete Take
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
