import React, { useState, useEffect, useRef } from 'react';
import { 
  Sliders, 
  Play, 
  Pause, 
  Square, 
  Volume2, 
  VolumeX, 
  ChevronLeft, 
  Share2, 
  Sparkles, 
  Mic2, 
  Music2, 
  Plus, 
  Layers,
  Wand2,
  RefreshCw,
  SlidersHorizontal,
  RotateCcw,
  Zap,
  ArrowRight,
  Headphones,
  CheckCircle2,
  Radio,
  Activity
} from 'lucide-react';
import { WebAudioEngine } from '../services/webAudioEngine';
import { ScreenId, StudioProject, StudioTrack } from '../types/audio';
import { ProductionProgress } from '../components/ProductionProgress';
import { ProductionStageHeader } from '../components/ProductionStageHeader';
import { RealTimeSpectrumVisualizer } from '../components/RealTimeSpectrumVisualizer';
import { MixPlan, MixChannel, MixBus } from '../types/mixPlan';
import { MixerEngine, MixerDspMath } from '../services/mixer/mixerEngine';
import { WebMixerAdapter } from '../services/mixer/webMixerAdapter';
import { ProjectManager } from '../services/projectManager';

interface MixerScreenProps {
  currentProject: StudioProject | null;
  onNavigate: (screen: ScreenId) => void;
  onUpdateTrackVolume: (trackId: string, volume: number) => void;
  onUpdateTrackPan: (trackId: string, pan: number) => void;
  onToggleMute: (trackId: string) => void;
  onToggleSolo: (trackId: string) => void;
}

export const MixerScreen: React.FC<MixerScreenProps> = ({
  currentProject,
  onNavigate,
  onUpdateTrackVolume,
  onUpdateTrackPan,
  onToggleMute,
  onToggleSolo,
}) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [masterVolume, setMasterVolume] = useState(0.85);
  const [masterMuted, setMasterMuted] = useState(false);
  const [playbackTime, setPlaybackTime] = useState(0);
  const [peakL, setPeakL] = useState(0);
  const [peakR, setPeakR] = useState(0);
  const [activeTab, setActiveTab] = useState<'console' | 'stems' | 'effects'>('console');
  const [aiBalanceApplied, setAiBalanceApplied] = useState(false);
  const [selectedTrackId, setSelectedTrackId] = useState<string | null>(null);

  // Per-track Reverb & Delay sends state
  const [trackEffects, setTrackEffects] = useState<Record<string, { reverbSend: number; delaySend: number; eqLow: number; eqHigh: number }>>({});

  const animationFrameRef = useRef<number | null>(null);
  const timerRef = useRef<number | null>(null);
  const masterGainRef = useRef<GainNode | null>(null);
  const masterAnalyserRef = useRef<AnalyserNode | null>(null);
  const analyserLRef = useRef<AnalyserNode | null>(null);
  const analyserRRef = useRef<AnalyserNode | null>(null);
  const trackGainNodesRef = useRef<Map<string, GainNode>>(new Map());
  const trackPannerNodesRef = useRef<Map<string, StereoPannerNode>>(new Map());
  const audioEngine = WebAudioEngine.getInstance();

  const ensureMasterChain = (ctx: AudioContext): GainNode => {
    if (!masterGainRef.current) {
      const masterGain = ctx.createGain();
      masterGain.gain.setValueAtTime(masterMuted ? 0 : masterVolume, ctx.currentTime);

      const masterAnalyser = ctx.createAnalyser();
      masterAnalyser.fftSize = 256;
      masterAnalyser.smoothingTimeConstant = 0.5;

      const splitter = ctx.createChannelSplitter(2);
      const analyserL = ctx.createAnalyser();
      const analyserR = ctx.createAnalyser();
      analyserL.fftSize = 256;
      analyserR.fftSize = 256;
      analyserL.smoothingTimeConstant = 0.4;
      analyserR.smoothingTimeConstant = 0.4;

      masterGain.connect(masterAnalyser);
      masterAnalyser.connect(ctx.destination);
      masterGain.connect(splitter);
      splitter.connect(analyserL, 0);
      splitter.connect(analyserR, 1);

      masterGainRef.current = masterGain;
      masterAnalyserRef.current = masterAnalyser;
      analyserLRef.current = analyserL;
      analyserRRef.current = analyserR;
    }
    return masterGainRef.current;
  };

  useEffect(() => {
    return () => {
      audioEngine.stopAllPlayback();
      if (timerRef.current) clearInterval(timerRef.current);
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
      trackGainNodesRef.current.clear();
      trackPannerNodesRef.current.clear();
    };
  }, []);

  const handleTogglePlayback = () => {
    if (isPlaying) {
      audioEngine.stopAllPlayback();
      setIsPlaying(false);
      if (timerRef.current) clearInterval(timerRef.current);
      trackGainNodesRef.current.clear();
      trackPannerNodesRef.current.clear();
      return;
    }

    const ctx = audioEngine.getContext();
    const masterGain = ensureMasterChain(ctx);
    masterGain.gain.setValueAtTime(masterMuted ? 0 : masterVolume, ctx.currentTime);

    if (!currentProject || currentProject.tracks.length === 0) {
      // Generate synthetic sample track for preview if empty
      const dummy = audioEngine.generateAccompanimentAudio('Pop Ballad', 30, 120, 'C');
      audioEngine.playBuffer(dummy, () => {
        setIsPlaying(false);
        if (timerRef.current) clearInterval(timerRef.current);
      }, masterGain);
      setIsPlaying(true);
      return;
    }

    const hasSolo = currentProject.tracks.some(t => t.isSolo);
    trackGainNodesRef.current.clear();
    trackPannerNodesRef.current.clear();

    let anyPlayed = false;
    currentProject.tracks.forEach(track => {
      if (track.audioBuffer) {
        const isAudible = hasSolo ? (track.isSolo && !track.isMuted) : !track.isMuted;

        const trackGain = ctx.createGain();
        trackGain.gain.setValueAtTime(isAudible ? track.volume : 0, ctx.currentTime);
        trackGainNodesRef.current.set(track.id, trackGain);

        let inputNode: AudioNode = trackGain;
        if (ctx.createStereoPanner) {
          const panner = ctx.createStereoPanner();
          panner.pan.setValueAtTime(track.pan, ctx.currentTime);
          trackPannerNodesRef.current.set(track.id, panner);
          panner.connect(trackGain);
          inputNode = panner;
        }

        trackGain.connect(masterGain);

        audioEngine.playBuffer(track.audioBuffer, () => {
          setIsPlaying(false);
          if (timerRef.current) clearInterval(timerRef.current);
        }, inputNode);

        anyPlayed = true;
      }
    });

    if (anyPlayed) {
      setIsPlaying(true);
      timerRef.current = window.setInterval(() => {
        setPlaybackTime(t => t + 1);
      }, 1000);
    }
  };

  const handleUpdateVolume = (trackId: string, volume: number) => {
    onUpdateTrackVolume(trackId, volume);
    const gainNode = trackGainNodesRef.current.get(trackId);
    if (gainNode) {
      const track = currentProject?.tracks.find(t => t.id === trackId);
      const hasSolo = currentProject?.tracks.some(t => t.isSolo) || false;
      const isAudible = hasSolo ? (track?.isSolo && !track?.isMuted) : !track?.isMuted;
      if (isAudible) {
        const ctx = audioEngine.getContext();
        gainNode.gain.setValueAtTime(volume, ctx.currentTime);
      }
    }
  };

  const handleUpdatePan = (trackId: string, pan: number) => {
    onUpdateTrackPan(trackId, pan);
    const pannerNode = trackPannerNodesRef.current.get(trackId);
    if (pannerNode) {
      const ctx = audioEngine.getContext();
      pannerNode.pan.setValueAtTime(pan, ctx.currentTime);
    }
  };

  const handleToggleMuteTrack = (trackId: string) => {
    onToggleMute(trackId);
    setTimeout(() => {
      if (currentProject) {
        const ctx = audioEngine.getContext();
        const hasSolo = currentProject.tracks.some(t => t.isSolo);
        currentProject.tracks.forEach(t => {
          const gNode = trackGainNodesRef.current.get(t.id);
          if (gNode) {
            const isMuted = t.id === trackId ? !t.isMuted : t.isMuted;
            const isAudible = hasSolo ? (t.isSolo && !isMuted) : !isMuted;
            gNode.gain.setValueAtTime(isAudible ? t.volume : 0, ctx.currentTime);
          }
        });
      }
    }, 0);
  };

  const handleToggleSoloTrack = (trackId: string) => {
    onToggleSolo(trackId);
    setTimeout(() => {
      if (currentProject) {
        const ctx = audioEngine.getContext();
        const targetTrack = currentProject.tracks.find(t => t.id === trackId);
        const willBeSolo = targetTrack ? !targetTrack.isSolo : false;
        const otherSolos = currentProject.tracks.some(t => t.id !== trackId && t.isSolo);
        const hasSolo = willBeSolo || otherSolos;

        currentProject.tracks.forEach(t => {
          const gNode = trackGainNodesRef.current.get(t.id);
          if (gNode) {
            const isSolo = t.id === trackId ? willBeSolo : t.isSolo;
            const isAudible = hasSolo ? (isSolo && !t.isMuted) : !t.isMuted;
            gNode.gain.setValueAtTime(isAudible ? t.volume : 0, ctx.currentTime);
          }
        });
      }
    }, 0);
  };

  const handleMasterGainChange = (newVol: number) => {
    setMasterVolume(newVol);
    if (masterGainRef.current && !masterMuted) {
      const ctx = audioEngine.getContext();
      masterGainRef.current.gain.setValueAtTime(newVol, ctx.currentTime);
    }
  };

  const handleToggleMasterMute = () => {
    const newMute = !masterMuted;
    setMasterMuted(newMute);
    if (masterGainRef.current) {
      const ctx = audioEngine.getContext();
      masterGainRef.current.gain.setValueAtTime(newMute ? 0 : masterVolume, ctx.currentTime);
    }
  };

  // AI Automatic Stem Balance & Spectral Pocketing
  const handleApplyAiAutoMix = () => {
    if (!currentProject || currentProject.tracks.length === 0) return;

    // Ideal Bollywood / Pop Acoustic balance ratios
    const idealStemSettings: Record<string, { vol: number; pan: number }> = {
      vocal: { vol: 0.92, pan: 0 },
      lead_vocal: { vol: 0.92, pan: 0 },
      piano: { vol: 0.74, pan: -0.2 },
      guitar: { vol: 0.72, pan: 0.25 },
      acoustic_guitar: { vol: 0.72, pan: 0.25 },
      electric_guitar: { vol: 0.68, pan: -0.3 },
      bass: { vol: 0.80, pan: 0 },
      drums: { vol: 0.76, pan: 0 },
      tabla: { vol: 0.75, pan: 0.15 },
      percussion: { vol: 0.70, pan: -0.15 },
      strings: { vol: 0.68, pan: 0.35 },
      pad: { vol: 0.62, pan: -0.35 },
      synth: { vol: 0.65, pan: 0.2 },
      flute: { vol: 0.74, pan: -0.25 },
      sitar: { vol: 0.75, pan: 0.28 },
      harmonium: { vol: 0.73, pan: -0.22 },
      violin: { vol: 0.70, pan: 0.3 }
    };

    currentProject.tracks.forEach(track => {
      const trackType = (track.type || 'vocal').toLowerCase();
      const preset = idealStemSettings[trackType] || { vol: 0.75, pan: 0 };
      handleUpdateVolume(track.id, preset.vol);
      handleUpdatePan(track.id, preset.pan);
    });

    setAiBalanceApplied(true);
    setTimeout(() => setAiBalanceApplied(false), 2500);
  };

  const handleResetFaders = () => {
    if (!currentProject) return;
    currentProject.tracks.forEach(track => {
      handleUpdateVolume(track.id, track.type === 'vocal' ? 0.9 : 0.75);
      handleUpdatePan(track.id, 0);
    });
  };

  // Real-time audio amplitude meter measurement using Web Audio Analyser
  useEffect(() => {
    if (isPlaying && analyserLRef.current && analyserRRef.current) {
      const aL = analyserLRef.current;
      const aR = analyserRRef.current;
      const dataL = new Float32Array(aL.fftSize);
      const dataR = new Float32Array(aR.fftSize);

      const loop = () => {
        animationFrameRef.current = requestAnimationFrame(loop);
        aL.getFloatTimeDomainData(dataL);
        aR.getFloatTimeDomainData(dataR);

        let maxL = 0;
        let maxR = 0;
        for (let i = 0; i < dataL.length; i++) {
          const absL = Math.abs(dataL[i]);
          if (absL > maxL) maxL = absL;
          const absR = Math.abs(dataR[i]);
          if (absR > maxR) maxR = absR;
        }

        const l = Math.min(100, Math.round(maxL * 105));
        const r = Math.min(100, Math.round(maxR * 105));
        setPeakL(l);
        setPeakR(r);
      };
      loop();
    } else {
      setPeakL(0);
      setPeakR(0);
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
    }
  }, [isPlaying]);

  const activeStemsCount = currentProject?.tracks.length || 0;

  return (
    <div className="space-y-4 pb-24">
      {/* Header */}
      <ProductionStageHeader
        currentScreen="mixer"
        currentProject={currentProject}
        onNavigate={onNavigate}
        title="Multi-Track Studio Console"
        subtitle="9-Stem Level Balancing, Stereo Panning & Real-Time Spectrum Analysis"
      />

      <ProductionProgress currentScreen="mixer" currentProject={currentProject} onNavigate={onNavigate} />

      {/* Real-Time FFT Spectrum & Spatial Analyzer */}
      <RealTimeSpectrumVisualizer
        analyserNode={masterAnalyserRef.current}
        isPlaying={isPlaying}
        bpm={currentProject?.bpm || 120}
        keyRoot={currentProject?.key ? `${currentProject.key} ${currentProject.scale || 'Maj'}` : 'C Maj'}
        activeStemsCount={activeStemsCount}
      />

      {/* Transport & Global Studio Quick Actions */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex items-center justify-between shadow-md">
        <div className="flex items-center space-x-3">
          <button
            onClick={handleTogglePlayback}
            className={`w-12 h-12 rounded-full flex items-center justify-center text-white shadow-lg transition-all active:scale-95 ${
              isPlaying ? 'bg-rose-600 hover:bg-rose-500 ring-4 ring-rose-500/20' : 'bg-indigo-600 hover:bg-indigo-500 ring-4 ring-indigo-500/20'
            }`}
          >
            {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5 ml-0.5" />}
          </button>
          <div>
            <div className="text-xs font-bold text-white flex items-center gap-1.5">
              <span>{currentProject?.title || 'Current Session'}</span>
              <span className="px-1.5 py-0.5 rounded bg-slate-800 text-[10px] text-slate-300 font-mono">
                {activeStemsCount} Tracks
              </span>
            </div>
            <div className="text-[10px] text-slate-400 font-mono mt-0.5">
              {currentProject ? `${currentProject.bpm} BPM • Key of ${currentProject.key}` : '120 BPM • C Major'}
            </div>
          </div>
        </div>

        {/* Master Stereo Peak LED Meters & AI Auto-Balance Action */}
        <div className="flex items-center space-x-2.5">
          <button
            onClick={handleApplyAiAutoMix}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center space-x-1 border transition-all ${
              aiBalanceApplied
                ? 'bg-emerald-600 border-emerald-400 text-white'
                : 'bg-indigo-950/80 border-indigo-500/40 text-indigo-300 hover:bg-indigo-900'
            }`}
          >
            {aiBalanceApplied ? <CheckCircle2 className="w-3.5 h-3.5" /> : <Wand2 className="w-3.5 h-3.5" />}
            <span className="hidden sm:inline">{aiBalanceApplied ? 'AI Balanced!' : 'AI Auto-Balance'}</span>
          </button>

          <div className="flex items-center space-x-2 bg-slate-950 px-3 py-2 rounded-xl border border-slate-800">
            <div className="space-y-1">
              <div className="flex items-center space-x-1">
                <span className="text-[9px] font-mono text-slate-500 w-2">L</span>
                <div className="w-14 h-1.5 bg-slate-900 rounded-full overflow-hidden">
                  <div
                    className={`h-full transition-all duration-75 ${
                      peakL > 85 ? 'bg-rose-500' : peakL > 60 ? 'bg-amber-400' : 'bg-emerald-400'
                    }`}
                    style={{ width: `${peakL}%` }}
                  />
                </div>
              </div>
              <div className="flex items-center space-x-1">
                <span className="text-[9px] font-mono text-slate-500 w-2">R</span>
                <div className="w-14 h-1.5 bg-slate-900 rounded-full overflow-hidden">
                  <div
                    className={`h-full transition-all duration-75 ${
                      peakR > 85 ? 'bg-rose-500' : peakR > 60 ? 'bg-amber-400' : 'bg-emerald-400'
                    }`}
                    style={{ width: `${peakR}%` }}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* View Switcher: Console Strip vs Stem Matrix */}
      <div className="flex items-center justify-between bg-slate-900/60 p-1.5 rounded-xl border border-slate-800">
        <div className="flex items-center gap-1">
          <button
            onClick={() => setActiveTab('console')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              activeTab === 'console' ? 'bg-indigo-600 text-white shadow' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Fader Console ({activeStemsCount})
          </button>
          <button
            onClick={() => setActiveTab('stems')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              activeTab === 'stems' ? 'bg-indigo-600 text-white shadow' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Stem Matrix & Roles
          </button>
        </div>

        <button
          onClick={handleResetFaders}
          className="px-2.5 py-1 text-[11px] font-semibold text-slate-400 hover:text-slate-200 flex items-center gap-1"
        >
          <RotateCcw className="w-3 h-3" />
          <span>Reset</span>
        </button>
      </div>

      {/* Channel Strips */}
      <div className="space-y-3">
        {(!currentProject || currentProject.tracks.length === 0) ? (
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 text-center space-y-3">
            <Layers className="w-8 h-8 text-slate-600 mx-auto" />
            <div>
              <h4 className="text-xs font-bold text-white">No Active Tracks Loaded</h4>
              <p className="text-[11px] text-slate-400 mt-0.5">Record vocals or generate accompaniment to start mixing</p>
            </div>
            <div className="flex justify-center gap-2 pt-2">
              <button
                onClick={() => onNavigate('record')}
                className="px-3 py-2 bg-indigo-600 text-white rounded-xl text-xs font-bold"
              >
                Record Vocal
              </button>
              <button
                onClick={() => onNavigate('accompaniment')}
                className="px-3 py-2 bg-purple-600 text-white rounded-xl text-xs font-bold"
              >
                Generate Music
              </button>
            </div>
          </div>
        ) : activeTab === 'console' ? (
          currentProject.tracks.map((track) => {
            const trackType = (track.type || 'vocal').toLowerCase();
            const isVocal = trackType === 'vocal' || trackType === 'lead_vocal';
            const isRhythm = trackType === 'drums' || trackType === 'tabla' || trackType === 'percussion';
            const isHarmonic = trackType === 'piano' || trackType === 'guitar' || trackType === 'strings' || trackType === 'flute' || trackType === 'harmonium' || trackType === 'sitar';

            return (
              <div
                key={track.id}
                className={`bg-slate-900 border transition-all rounded-2xl p-4 space-y-3 shadow-md ${
                  track.isSolo 
                    ? 'border-amber-400/80 ring-2 ring-amber-400/20' 
                    : track.isMuted 
                    ? 'border-slate-800/50 opacity-60' 
                    : 'border-slate-800 hover:border-slate-700'
                }`}
              >
                {/* Track Title, Role Badge & Mute/Solo */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2.5">
                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center text-white shadow-md ${
                      isVocal 
                        ? 'bg-gradient-to-tr from-indigo-600 to-pink-500' 
                        : isRhythm 
                        ? 'bg-gradient-to-tr from-amber-600 to-orange-500' 
                        : 'bg-gradient-to-tr from-purple-600 to-blue-500'
                    }`}>
                      {isVocal ? <Mic2 className="w-4 h-4" /> : <Music2 className="w-4 h-4" />}
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5">
                        <h4 className="text-xs font-bold text-white">{track.name}</h4>
                        {isVocal && (
                          <span className="px-1.5 py-0.2 bg-indigo-500/20 border border-indigo-500/30 text-indigo-300 text-[9px] font-bold rounded">
                            LEAD
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-1.5 text-[10px] text-slate-400 font-mono mt-0.5">
                        <span className="uppercase">{track.type}</span>
                        <span>•</span>
                        <span>{isVocal ? 'Center Pocket' : track.pan === 0 ? 'Center' : track.pan < 0 ? `L${Math.abs(Math.round(track.pan * 100))}` : `R${Math.round(track.pan * 100)}`}</span>
                      </div>
                    </div>
                  </div>

                  {/* Mute & Solo Buttons */}
                  <div className="flex items-center space-x-1.5">
                    <button
                      onClick={() => handleToggleMuteTrack(track.id)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all border shadow-sm ${
                        track.isMuted
                          ? 'bg-rose-600 border-rose-500 text-white'
                          : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                      }`}
                    >
                      MUTE
                    </button>
                    <button
                      onClick={() => handleToggleSoloTrack(track.id)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all border shadow-sm ${
                        track.isSolo
                          ? 'bg-amber-500 border-amber-400 text-black'
                          : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                      }`}
                    >
                      SOLO
                    </button>
                  </div>
                </div>

                {/* Volume Fader Slider */}
                <div className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-400 text-[11px] flex items-center space-x-1">
                      <Volume2 className="w-3.5 h-3.5 text-indigo-400" />
                      <span>Track Gain</span>
                    </span>
                    <span className="font-mono text-slate-200 font-bold">{Math.round(track.volume * 100)}%</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.01"
                    value={track.volume}
                    onChange={(e) => handleUpdateVolume(track.id, Number(e.target.value))}
                    className="w-full accent-indigo-500 cursor-pointer h-2 bg-slate-950 rounded-lg"
                  />
                </div>

                {/* Pan Slider */}
                <div className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-400 text-[11px] flex items-center space-x-1">
                      <SlidersHorizontal className="w-3.5 h-3.5 text-purple-400" />
                      <span>Stereo Pan</span>
                    </span>
                    <span className="font-mono text-slate-300 text-[11px]">
                      {track.pan === 0 ? 'Center (0)' : track.pan < 0 ? `Left ${Math.abs(Math.round(track.pan * 100))}%` : `Right ${Math.round(track.pan * 100)}%`}
                    </span>
                  </div>
                  <input
                    type="range"
                    min="-1"
                    max="1"
                    step="0.05"
                    value={track.pan}
                    onChange={(e) => handleUpdatePan(track.id, Number(e.target.value))}
                    className="w-full accent-purple-500 cursor-pointer h-2 bg-slate-950 rounded-lg"
                  />
                </div>
              </div>
            );
          })
        ) : (
          /* Stem Matrix Grid View */
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {currentProject.tracks.map((track) => (
              <div key={track.id} className="bg-slate-900 border border-slate-800 rounded-2xl p-3.5 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-white truncate">{track.name}</span>
                  <span className="text-[10px] font-mono text-indigo-400 uppercase">{track.type}</span>
                </div>
                <div className="text-[11px] text-slate-400 flex justify-between">
                  <span>Gain: {Math.round(track.volume * 100)}%</span>
                  <span>Pan: {track.pan === 0 ? 'C' : track.pan < 0 ? `L${Math.abs(Math.round(track.pan * 100))}` : `R${Math.round(track.pan * 100)}`}</span>
                </div>
                <div className="flex gap-1.5 pt-1">
                  <button
                    onClick={() => handleToggleMuteTrack(track.id)}
                    className={`flex-1 py-1 text-[10px] font-bold rounded-lg border ${
                      track.isMuted ? 'bg-rose-600 text-white border-rose-500' : 'bg-slate-950 text-slate-400 border-slate-800'
                    }`}
                  >
                    MUTE
                  </button>
                  <button
                    onClick={() => handleToggleSoloTrack(track.id)}
                    className={`flex-1 py-1 text-[10px] font-bold rounded-lg border ${
                      track.isSolo ? 'bg-amber-500 text-black border-amber-400' : 'bg-slate-950 text-slate-400 border-slate-800'
                    }`}
                  >
                    SOLO
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Master Bus Channel Strip */}
      <div className="bg-slate-950 border border-indigo-500/30 rounded-2xl p-4 space-y-3.5 shadow-xl">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <span className="w-2.5 h-2.5 rounded-full bg-indigo-400 animate-pulse" />
            <h4 className="text-xs font-bold text-white uppercase tracking-wider">Master Output Bus (24-bit Headroom)</h4>
          </div>
          <button
            onClick={handleToggleMasterMute}
            className={`p-1.5 rounded-lg border text-xs transition-all ${
              masterMuted
                ? 'bg-rose-600 border-rose-500 text-white'
                : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
            }`}
          >
            {masterMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
          </button>
        </div>

        <div className="space-y-1.5">
          <div className="flex justify-between text-xs">
            <span className="text-slate-400 text-[11px]">Master Gain Output</span>
            <span className="font-mono text-indigo-300 font-bold">{Math.round(masterVolume * 100)}%</span>
          </div>
          <input
            type="range"
            min="0"
            max="1"
            step="0.01"
            value={masterVolume}
            onChange={(e) => handleMasterGainChange(Number(e.target.value))}
            className="w-full accent-indigo-500 cursor-pointer h-2 bg-slate-900 rounded-lg"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
          <button
            onClick={() => onNavigate('mastering')}
            className="w-full py-3.5 bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 hover:from-indigo-500 hover:to-pink-500 text-white rounded-xl font-bold text-xs flex items-center justify-center space-x-1.5 shadow-md shadow-indigo-600/20 active:scale-[0.98] transition-all"
          >
            <Zap className="w-4 h-4 text-amber-300" />
            <span>Mix & Continue to Mastering</span>
            <ArrowRight className="w-4 h-4" />
          </button>

          <button
            onClick={() => onNavigate('export')}
            className="w-full py-3.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl font-bold text-xs flex items-center justify-center space-x-1.5 border border-slate-700 active:scale-[0.98] transition-all"
          >
            <Share2 className="w-4 h-4 text-slate-400" />
            <span>Export Direct Mix / Stems</span>
          </button>
        </div>
      </div>
    </div>
  );
};
