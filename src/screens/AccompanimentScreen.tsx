import React, { useState } from 'react';
import { 
  Music, 
  Play, 
  Square, 
  RotateCcw, 
  Save, 
  ChevronLeft, 
  Sparkles, 
  Sliders, 
  CheckCircle2,
  Layers,
  Mic2,
  Users,
  Volume2,
  Zap,
  Activity,
  AlertCircle
} from 'lucide-react';
import { WebAudioEngine } from '../services/webAudioEngine';
import { ScreenId, StudioProject, StudioTrack } from '../types/audio';
import { ProductionProgress } from '../components/ProductionProgress';
import { ProductionStageHeader } from '../components/ProductionStageHeader';
import { MusicDirectorService } from '../services/musicDirectorService';
import { 
  VocalHarmonizerEngine, 
  HARMONY_PRESETS, 
  HarmonyPresetId 
} from '../services/vocalHarmonizerEngine';

interface AccompanimentScreenProps {
  currentProject: StudioProject | null;
  onNavigate: (screen: ScreenId) => void;
  onSaveAccompanimentTrack: (buffer: AudioBuffer, genre: string, bpm: number, key: string) => void;
  onSaveHarmonyTrack?: (buffer: AudioBuffer, presetName: string) => void;
}

export const AccompanimentScreen: React.FC<AccompanimentScreenProps> = ({
  currentProject,
  onNavigate,
  onSaveAccompanimentTrack,
  onSaveHarmonyTrack,
}) => {
  const [activeTab, setActiveTab] = useState<'band' | 'harmonizer'>('band');

  // Band Accompaniment State
  const [selectedGenre, setSelectedGenre] = useState(currentProject?.genre || 'Pop Ballad');
  const [bpm, setBpm] = useState(currentProject?.bpm || 120);
  const [keyRoot, setKeyRoot] = useState(currentProject?.key || 'C');
  const [duration, setDuration] = useState(30);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [generatedBuffer, setGeneratedBuffer] = useState<AudioBuffer | null>(null);
  const [savedSuccess, setSavedSuccess] = useState(false);

  // AI Vocal Harmonizer State
  const [selectedHarmonyPreset, setSelectedHarmonyPreset] = useState<HarmonyPresetId>('high_third');
  const [harmonyMix, setHarmonyMix] = useState(0.85);
  const [stereoWidth, setStereoWidth] = useState(0.8);
  const [humanizeSpread, setHumanizeSpread] = useState(8);
  const [isSynthesizingHarmonies, setIsSynthesizingHarmonies] = useState(false);
  const [harmonyBuffer, setHarmonyBuffer] = useState<AudioBuffer | null>(null);
  const [isPlayingHarmony, setIsPlayingHarmony] = useState(false);
  const [savedHarmonySuccess, setSavedHarmonySuccess] = useState(false);
  const [vocalMissingError, setVocalMissingError] = useState<string | null>(null);

  const audioEngine = WebAudioEngine.getInstance();
  const harmonizerEngine = VocalHarmonizerEngine.getInstance();

  const GENRES = [
    'Pop Ballad',
    'Synthwave 80s',
    'Lo-Fi Chill',
    'R&B Groove',
    'Hip Hop Boom Bap',
    'Trap Heavy 808',
    'Acoustic Rock',
    'Jazz Swing',
    'Electronic EDM',
    'Indian Classical',
    'Reggae Roots',
    'Latin Bossa Nova',
    'Neo-Soul Warm',
    'Funk Groove',
    'Cyberpunk Dark',
    'Cinematic Strings',
    'Ambient Drone',
    'Afrobeat Vibes',
    'Deep House',
    'Future Bass',
    'Blues Rock',
    'Indie Pop',
    'Country Acoustic',
    'Gospel Soul',
    'Chillstep Relax'
  ];

  // 1. Band Generation Handler (Routed via MusicDirectorService Orchestration Layer)
  const handleGenerate = () => {
    setIsGenerating(true);
    audioEngine.stopAllPlayback();
    setIsPlaying(false);

    setTimeout(() => {
      try {
        const buffer = MusicDirectorService.getInstance().orchestrateAccompanimentPreview(selectedGenre, duration, bpm, keyRoot);
        setGeneratedBuffer(buffer);
      } catch (err) {
        console.error("Failed to generate accompaniment", err);
      } finally {
        setIsGenerating(false);
      }
    }, 400);
  };

  const handleTogglePlay = () => {
    if (isPlaying) {
      audioEngine.stopAllPlayback();
      setIsPlaying(false);
      return;
    }

    if (!generatedBuffer) {
      handleGenerate();
      return;
    }

    setIsPlaying(true);
    audioEngine.playBuffer(generatedBuffer, () => {
      setIsPlaying(false);
    });
  };

  const handleSaveToMixer = () => {
    if (!generatedBuffer) return;
    onSaveAccompanimentTrack(generatedBuffer, selectedGenre, bpm, keyRoot);
    setSavedSuccess(true);
    setTimeout(() => {
      setSavedSuccess(false);
      onNavigate('mixer');
    }, 1200);
  };

  // 2. Vocal Harmonizer Handler
  const handleGenerateHarmonies = () => {
    // Find vocal track buffer
    const vocalTrack = currentProject?.cleanedVocalBuffer || currentProject?.rawVocalBuffer || currentProject?.tracks.find(t => t.type === 'vocal')?.audioBuffer;

    if (!vocalTrack) {
      setVocalMissingError('No vocal take found in the current project. Please record or import a vocal take first to generate vocal harmonies.');
      setTimeout(() => setVocalMissingError(null), 5000);
      return;
    }

    setVocalMissingError(null);
    synthesizeFromBuffer(vocalTrack);
  };

  const synthesizeFromBuffer = (srcBuffer: AudioBuffer) => {
    setIsSynthesizingHarmonies(true);
    audioEngine.stopAllPlayback();
    setIsPlayingHarmony(false);

    setTimeout(() => {
      try {
        const ctx = audioEngine.getContext();
        const harmonyBuf = harmonizerEngine.generateHarmonyBuffer(srcBuffer, ctx, {
          presetId: selectedHarmonyPreset,
          rootKey: currentProject?.key || 'C',
          scaleType: currentProject?.scale || 'Major',
          harmonyMix,
          stereoWidth,
          humanizeSpread
        });

        setHarmonyBuffer(harmonyBuf);
      } catch (e) {
        console.error("Vocal harmony generation failed", e);
      } finally {
        setIsSynthesizingHarmonies(false);
      }
    }, 350);
  };

  const handleTogglePlayHarmony = () => {
    if (isPlayingHarmony) {
      audioEngine.stopAllPlayback();
      setIsPlayingHarmony(false);
      return;
    }

    if (!harmonyBuffer) {
      handleGenerateHarmonies();
      return;
    }

    setIsPlayingHarmony(true);
    audioEngine.playBuffer(harmonyBuffer, () => {
      setIsPlayingHarmony(false);
    });
  };

  const handleSaveHarmonyToProject = () => {
    if (!harmonyBuffer) return;
    const preset = HARMONY_PRESETS.find(p => p.id === selectedHarmonyPreset);
    const presetName = preset?.name || 'AI Vocal Harmony';

    if (onSaveHarmonyTrack) {
      onSaveHarmonyTrack(harmonyBuffer, presetName);
    } else {
      // Fallback save using standard accompaniment handler
      onSaveAccompanimentTrack(harmonyBuffer, `Harmony (${presetName})`, bpm, keyRoot);
    }

    setSavedHarmonySuccess(true);
    setTimeout(() => {
      setSavedHarmonySuccess(false);
      onNavigate('mixer');
    }, 1200);
  };

  const selectedPresetObj = HARMONY_PRESETS.find(p => p.id === selectedHarmonyPreset);

  return (
    <div className="space-y-4 pb-20">
      {/* Header */}
      <ProductionStageHeader
        currentScreen="accompaniment"
        currentProject={currentProject}
        onNavigate={onNavigate}
        title="Accompaniment & Vocal Harmonizer"
        subtitle="25-Genre Full Band Synthesis & Intelligent Diatonic Vocal Harmonies"
      />

      <ProductionProgress currentScreen="accompaniment" currentProject={currentProject} onNavigate={onNavigate} />

      {/* AI Music Director Direct Signal Integration Banner */}
      {currentProject?.semanticArrangementSheet ? (
        <div className="bg-gradient-to-r from-pink-950/40 via-purple-950/50 to-indigo-950/40 border border-pink-500/30 rounded-2xl p-3.5 flex items-center justify-between shadow-lg">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 rounded-lg bg-pink-500/20 text-pink-400 border border-pink-500/30 flex items-center justify-center shrink-0">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center space-x-1.5">
                <span className="text-xs font-bold text-white">AI Director Score Active</span>
                <span className="text-[9px] bg-pink-500/20 text-pink-300 font-bold px-1.5 py-0.2 rounded border border-pink-500/30">
                  {currentProject.semanticArrangementSheet.sections.length} Sections Orchestrated
                </span>
              </div>
              <p className="text-[10px] text-slate-300">
                Recommended: {currentProject.semanticArrangementSheet.recommendedBpm} BPM • {currentProject.semanticArrangementSheet.recommendedKey} ({currentProject.semanticArrangementSheet.scaleMode}) • Energy: {currentProject.semanticArrangementSheet.sections[0]?.energyLevel || 'balanced'}
              </p>
            </div>
          </div>
          <button
            onClick={() => onNavigate('director')}
            className="px-2.5 py-1.5 bg-pink-500/20 hover:bg-pink-500/30 text-pink-200 border border-pink-500/40 rounded-xl text-[11px] font-bold transition-all shrink-0"
          >
            Edit Score
          </button>
        </div>
      ) : (
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-3 flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <Sparkles className="w-4 h-4 text-purple-400" />
            <span className="text-xs text-slate-300">Want emotional lyrics & chord orchestration?</span>
          </div>
          <button
            onClick={() => onNavigate('director')}
            className="px-2.5 py-1 bg-purple-600/30 hover:bg-purple-600/50 text-purple-200 border border-purple-500/40 rounded-lg text-[10px] font-bold transition-all"
          >
            Generate AI Score
          </button>
        </div>
      )}

      {/* Tab Switcher: Full Band vs AI Vocal Harmonizer */}
      <div className="flex bg-slate-950 p-1 rounded-2xl border border-slate-800">
        <button
          onClick={() => {
            setActiveTab('band');
            audioEngine.stopAllPlayback();
            setIsPlaying(false);
            setIsPlayingHarmony(false);
          }}
          className={`flex-1 py-2.5 rounded-xl font-bold text-xs flex items-center justify-center space-x-2 transition-all ${
            activeTab === 'band' 
              ? 'bg-purple-600 text-white shadow-md shadow-purple-600/30' 
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <Music className="w-4 h-4" />
          <span>Full-Band Instrument Engine</span>
        </button>

        <button
          onClick={() => {
            setActiveTab('harmonizer');
            audioEngine.stopAllPlayback();
            setIsPlaying(false);
            setIsPlayingHarmony(false);
          }}
          className={`flex-1 py-2.5 rounded-xl font-bold text-xs flex items-center justify-center space-x-2 transition-all ${
            activeTab === 'harmonizer' 
              ? 'bg-pink-600 text-white shadow-md shadow-pink-600/30' 
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>AI Vocal Harmonizer (Duet/Choir)</span>
        </button>
      </div>

      {activeTab === 'band' ? (
        <>
          {/* Hero Generation Studio Card */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-white">Algorithmic Backing Engine</h3>
                <p className="text-[11px] text-slate-400">Deterministic chord synthesis & drum engine</p>
              </div>
              {generatedBuffer && (
                <span className="px-2.5 py-0.5 rounded-full bg-purple-500/20 text-purple-300 text-[10px] font-bold border border-purple-500/30 flex items-center space-x-1">
                  <CheckCircle2 className="w-3 h-3" />
                  <span>Track Rendered</span>
                </span>
              )}
            </div>

            {/* Action Controls */}
            <div className="grid grid-cols-2 gap-2.5">
              <button
                onClick={handleGenerate}
                disabled={isGenerating}
                className="py-3.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white rounded-xl font-bold text-xs flex items-center justify-center space-x-1.5 shadow-md shadow-purple-600/30 active:scale-[0.98] transition-all"
              >
                <Sparkles className="w-4 h-4 text-amber-300" />
                <span>{isGenerating ? 'Rendering Synthesizer...' : 'Generate Accompaniment'}</span>
              </button>

              <button
                onClick={handleTogglePlay}
                className={`py-3.5 rounded-xl font-bold text-xs flex items-center justify-center space-x-1.5 border active:scale-[0.98] transition-all ${
                  isPlaying 
                    ? 'bg-rose-600 border-rose-500 text-white' 
                    : 'bg-slate-800 border-slate-700 hover:bg-slate-700 text-slate-200'
                }`}
              >
                {isPlaying ? <Square className="w-4 h-4" /> : <Play className="w-4 h-4 text-purple-400" />}
                <span>{isPlaying ? 'Stop' : 'Play Preview'}</span>
              </button>
            </div>

            {/* Save to Project */}
            {generatedBuffer && (
              <button
                onClick={handleSaveToMixer}
                className={`w-full py-3 rounded-xl font-bold text-xs flex items-center justify-center space-x-1.5 transition-all shadow-md active:scale-[0.98] ${
                  savedSuccess
                    ? 'bg-emerald-600 text-white'
                    : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-indigo-600/20'
                }`}
              >
                <Save className="w-4 h-4" />
                <span>{savedSuccess ? 'Added to Studio Mixer!' : 'Save Track to Project Mixer'}</span>
              </button>
            )}
          </div>

          {/* 25+ Genre Selection Grid */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold text-white uppercase tracking-wider">Musical Genre (25 Styles)</h4>
              <span className="text-[11px] text-purple-400 font-semibold">{selectedGenre}</span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-48 overflow-y-auto pr-1">
              {GENRES.map((g) => (
                <button
                  key={g}
                  onClick={() => setSelectedGenre(g)}
                  className={`p-2.5 rounded-xl text-left text-xs font-semibold transition-all border ${
                    selectedGenre === g
                      ? 'bg-purple-600 border-purple-400 text-white shadow-md shadow-purple-600/30'
                      : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white hover:border-slate-700'
                  }`}
                >
                  <div className="truncate">{g}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Tempo & Key Settings */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-4">
            <h4 className="text-xs font-bold text-white uppercase tracking-wider">Tempo & Key Configuration</h4>

            {/* BPM */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs">
                <span className="text-slate-400">Tempo:</span>
                <span className="font-mono font-bold text-cyan-400">{bpm} BPM</span>
              </div>
              <input
                type="range"
                min="60"
                max="180"
                value={bpm}
                onChange={(e) => setBpm(Number(e.target.value))}
                className="w-full accent-cyan-500"
              />
            </div>

            {/* Root Key */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs">
                <span className="text-slate-400">Root Key:</span>
                <span className="font-mono font-bold text-purple-400">{keyRoot}</span>
              </div>
              <div className="grid grid-cols-6 gap-1.5">
                {['C', 'D', 'E', 'F', 'G', 'A'].map((k) => (
                  <button
                    key={k}
                    onClick={() => setKeyRoot(k)}
                    className={`py-1.5 rounded-lg text-xs font-mono font-bold transition-all border ${
                      keyRoot === k
                        ? 'bg-purple-600 border-purple-400 text-white'
                        : 'bg-slate-950 border-slate-800 text-slate-400'
                    }`}
                  >
                    {k}
                  </button>
                ))}
              </div>
            </div>

            {/* Duration */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs">
                <span className="text-slate-400">Duration:</span>
                <span className="font-mono font-bold text-slate-300">{duration} seconds</span>
              </div>
              <input
                type="range"
                min="10"
                max="60"
                step="5"
                value={duration}
                onChange={(e) => setDuration(Number(e.target.value))}
                className="w-full accent-indigo-500"
              />
            </div>
          </div>
        </>
      ) : (
        /* AI VOCAL HARMONIZER TAB */
        <div className="space-y-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4 shadow-md">
            <div>
              <div className="flex items-center space-x-2 text-pink-400">
                <Sparkles className="w-4 h-4" />
                <h3 className="text-sm font-bold text-white">Intelligent Diatonic Vocal Harmonizer</h3>
              </div>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Generates pitch-accurate backing vocals, 3-part chords, and choir layers locked to {currentProject?.key || 'C'} {currentProject?.scale || 'Major'}
              </p>
            </div>

            {/* Harmony Presets Selector */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Harmony Style / Voicing Preset</label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {HARMONY_PRESETS.map((preset) => (
                  <button
                    key={preset.id}
                    onClick={() => {
                      setSelectedHarmonyPreset(preset.id);
                      setHarmonyBuffer(null);
                    }}
                    className={`p-3 rounded-xl text-left transition-all border ${
                      selectedHarmonyPreset === preset.id
                        ? 'bg-pink-950/80 border-pink-500 text-white shadow-md shadow-pink-600/20'
                        : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-white">{preset.name}</span>
                      <span className="text-[9px] uppercase px-1.5 py-0.5 rounded bg-slate-800 font-mono text-pink-300">
                        {preset.voices.length} Voice{preset.voices.length > 1 ? 's' : ''}
                      </span>
                    </div>
                    <p className="text-[10px] text-slate-400 mt-1 leading-snug">{preset.description}</p>
                  </button>
                ))}
              </div>
            </div>

            {/* Harmony DSP Sliders */}
            <div className="bg-slate-950 p-4 rounded-xl border border-slate-800/80 space-y-3">
              <div className="space-y-1">
                <div className="flex justify-between text-xs">
                  <span className="text-slate-400">Harmony Volume Blend:</span>
                  <span className="font-mono text-pink-400 font-bold">{Math.round(harmonyMix * 100)}%</span>
                </div>
                <input
                  type="range"
                  min="0.2"
                  max="1.0"
                  step="0.05"
                  value={harmonyMix}
                  onChange={(e) => setHarmonyMix(parseFloat(e.target.value))}
                  className="w-full accent-pink-500"
                />
              </div>

              <div className="space-y-1">
                <div className="flex justify-between text-xs">
                  <span className="text-slate-400">Stereo Panning Width:</span>
                  <span className="font-mono text-indigo-400 font-bold">{Math.round(stereoWidth * 100)}%</span>
                </div>
                <input
                  type="range"
                  min="0.0"
                  max="1.0"
                  step="0.05"
                  value={stereoWidth}
                  onChange={(e) => setStereoWidth(parseFloat(e.target.value))}
                  className="w-full accent-indigo-500"
                />
              </div>

              <div className="space-y-1">
                <div className="flex justify-between text-xs">
                  <span className="text-slate-400">Organic Choir Detune (Humanize):</span>
                  <span className="font-mono text-purple-400 font-bold">{humanizeSpread} Cents</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="20"
                  step="1"
                  value={humanizeSpread}
                  onChange={(e) => setHumanizeSpread(parseInt(e.target.value))}
                  className="w-full accent-purple-500"
                />
              </div>
            </div>

            {/* Error banner when vocal is missing */}
            {vocalMissingError && (
              <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl text-amber-300 text-xs font-medium flex items-center space-x-2">
                <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />
                <span>{vocalMissingError}</span>
              </div>
            )}

            {/* Harmonizer Action Buttons */}
            <div className="grid grid-cols-2 gap-2.5">
              <button
                onClick={handleGenerateHarmonies}
                disabled={isSynthesizingHarmonies}
                className="py-3.5 bg-gradient-to-r from-pink-600 to-purple-600 hover:from-pink-500 hover:to-purple-500 text-white rounded-xl font-bold text-xs flex items-center justify-center space-x-1.5 shadow-md shadow-pink-600/30 active:scale-[0.98] transition-all"
              >
                <Zap className="w-4 h-4 text-amber-300" />
                <span>{isSynthesizingHarmonies ? 'Synthesizing Voices...' : 'Generate Vocal Harmonies'}</span>
              </button>

              <button
                onClick={handleTogglePlayHarmony}
                className={`py-3.5 rounded-xl font-bold text-xs flex items-center justify-center space-x-1.5 border active:scale-[0.98] transition-all ${
                  isPlayingHarmony 
                    ? 'bg-rose-600 border-rose-500 text-white' 
                    : 'bg-slate-800 border-slate-700 hover:bg-slate-700 text-slate-200'
                }`}
              >
                {isPlayingHarmony ? <Square className="w-4 h-4" /> : <Play className="w-4 h-4 text-pink-400" />}
                <span>{isPlayingHarmony ? 'Stop' : 'Audition Harmonies'}</span>
              </button>
            </div>

            {/* Save Harmony as Dedicated Stem Track */}
            {harmonyBuffer && (
              <button
                onClick={handleSaveHarmonyToProject}
                className={`w-full py-3.5 rounded-xl font-bold text-xs flex items-center justify-center space-x-2 transition-all shadow-md active:scale-[0.98] ${
                  savedHarmonySuccess
                    ? 'bg-emerald-600 text-white'
                    : 'bg-gradient-to-r from-pink-600 to-indigo-600 hover:from-pink-500 hover:to-indigo-500 text-white shadow-pink-600/20'
                }`}
              >
                <Save className="w-4 h-4" />
                <span>{savedHarmonySuccess ? 'Harmony Added to Studio Tracks!' : `Add "${selectedPresetObj?.name}" to Multi-Track Mixer`}</span>
              </button>
            )}
          </div>
        </div>
      )}

      {/* Forward Action to Multi-track Arrangement */}
      <div className="pt-2">
        <button
          onClick={() => onNavigate('pipeline')}
          className="w-full py-3.5 rounded-2xl font-bold text-xs flex items-center justify-center space-x-2 shadow-lg bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white shadow-indigo-600/30 active:scale-[0.98] transition-all"
        >
          <span>Continue to Song Arrangement Studio →</span>
        </button>
      </div>
    </div>
  );
};
