import React, { useState } from 'react';
import { 
  Sparkles, 
  Music, 
  Sliders, 
  CheckCircle2, 
  Layers, 
  Play, 
  Square, 
  Volume2, 
  Flame, 
  Heart, 
  Zap, 
  Radio, 
  ArrowRight,
  BookOpen,
  Check,
  Disc,
  Compass,
  Cpu,
  RefreshCw,
  Info
} from 'lucide-react';
import { ScreenId, StudioProject } from '../types/audio';
import { SongArrangementSheet, LyricLineAnalysis, SongArrangementSection } from '../types/musicDirector';
import { MusicDirectorService } from '../services/musicDirectorService';
import { WebAudioEngine } from '../services/webAudioEngine';
import { ProductionProgress } from '../components/ProductionProgress';
import { ProductionStageHeader } from '../components/ProductionStageHeader';

interface MusicDirectorScreenProps {
  currentProject: StudioProject | null;
  vocalBuffer?: AudioBuffer | null;
  onNavigate: (screen: ScreenId) => void;
  onApplyDirectorPlan: (sheet: SongArrangementSheet) => void;
  onSetProjectTracks?: (tracks: any[], totalDuration: number, plan?: any) => void;
}

export const MusicDirectorScreen: React.FC<MusicDirectorScreenProps> = ({
  currentProject,
  vocalBuffer,
  onNavigate,
  onApplyDirectorPlan,
  onSetProjectTracks,
}) => {
  const [lyrics, setLyrics] = useState(
    currentProject?.lyrics ||
`[Verse 1 - Mukhda]
Khoya rehta hoon teri yaadon mein har pal,
Tere bina yeh dil lagta nahi be-kal.

[Chorus - Refrain]
Tere bin... jeena ab mushkil hai,
Tu meri jaan, tu hi meri manzil hai!

[Antara - Verse 2]
Chandni raaton mein tera chehra khile,
Jaise sehra mein koi phool mile.

[Climax]
Maula mere... tu hi mera saathi,
Tere bina andheri hai yeh raatein!`
  );

  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [directorSheet, setDirectorSheet] = useState<SongArrangementSheet | null>(
    (currentProject as any)?.semanticArrangementSheet || null
  );
  const [auditioningLineIdx, setAuditioningLineIdx] = useState<number | null>(null);
  const [isGeneratingStems, setIsGeneratingStems] = useState(false);
  const [isPlayingFullMix, setIsPlayingFullMix] = useState(false);
  const [appliedSuccess, setAppliedSuccess] = useState(false);

  // User Custom Music Options
  const [selectedGenre, setSelectedGenre] = useState<string>(currentProject?.genre || 'Bollywood Romantic');
  const [selectedBpm, setSelectedBpm] = useState<number>(currentProject?.bpm || 118);
  const [selectedKey, setSelectedKey] = useState<string>(currentProject?.key || 'C');
  const [selectedScale, setSelectedScale] = useState<'major' | 'minor'>((currentProject?.scale as any) || 'major');
  const [selectedFeel, setSelectedFeel] = useState<'romantic' | 'acoustic' | 'emotional' | 'modern' | 'dance' | 'cinematic' | 'indian'>('romantic');
  const [selectedInstruments, setSelectedInstruments] = useState<string[]>([
    'Piano', 'Acoustic Guitar', 'Bass', 'Drums', 'Strings', 'Flute', 'Tabla'
  ]);

  const directorService = MusicDirectorService.getInstance();
  const audioEngine = WebAudioEngine.getInstance();

  // Synchronize lyrics from currentProject whenever updated (e.g. from RecordScreen)
  React.useEffect(() => {
    if (currentProject?.lyrics && currentProject.lyrics.trim().length > 0) {
      setLyrics(currentProject.lyrics);
    }
  }, [currentProject?.lyrics]);

  // Auto-analyze lyrics when screen loads or if lyrics exist without score
  React.useEffect(() => {
    if (lyrics && lyrics.trim().length > 0 && !directorSheet && !isAnalyzing) {
      handleAnalyze();
    }
  }, []);

  const handleAnalyze = async () => {
    setIsAnalyzing(true);
    try {
      const sheet = await directorService.analyzeLyricsAndOrchestrate(lyrics, {
        ...currentProject,
        genre: selectedGenre,
        bpm: selectedBpm,
        key: selectedKey,
      } as any);
      setDirectorSheet(sheet);
      if (sheet.recommendedBpm) setSelectedBpm(sheet.recommendedBpm);
      if (sheet.recommendedKey) setSelectedKey(sheet.recommendedKey);
      if (sheet.scaleMode) setSelectedScale(sheet.scaleMode === 'minor' ? 'minor' : 'major');
    } catch (err) {
      console.error('Analysis failed:', err);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const toggleInstrument = (instName: string) => {
    setSelectedInstruments(prev =>
      prev.includes(instName)
        ? prev.length > 1 ? prev.filter(i => i !== instName) : prev
        : [...prev, instName]
    );
  };

  const handleAuditionLine = (line: LyricLineAnalysis) => {
    if (auditioningLineIdx === line.lineIndex) {
      audioEngine.stopAllPlayback();
      setAuditioningLineIdx(null);
      return;
    }

    setAuditioningLineIdx(line.lineIndex);
    // Synthesize preview chord & rhythmic pulse based on line emotion & chord via MusicDirectorService
    const genre = selectedGenre || currentProject?.genre || 'Bollywood Romantic';
    const bpm = selectedBpm || directorSheet?.recommendedBpm || currentProject?.bpm || 118;
    const key = selectedKey || directorSheet?.recommendedKey || currentProject?.key || 'C';

    const previewBuffer = MusicDirectorService.getInstance().orchestrateAccompanimentPreview(genre, 6, bpm, key, selectedInstruments);
    audioEngine.playBuffer(previewBuffer, () => {
      setAuditioningLineIdx(null);
    });
  };

  const handleGenerateAndBondMusic = async () => {
    setIsGeneratingStems(true);
    audioEngine.stopAllPlayback();
    setIsPlayingFullMix(false);

    try {
      const targetVocal = vocalBuffer || currentProject?.cleanedVocalBuffer || currentProject?.rawVocalBuffer || currentProject?.tracks.find(t => t.type === 'vocal')?.audioBuffer || null;
      const bpmToUse = selectedBpm || directorSheet?.recommendedBpm || currentProject?.bpm || 118;
      const keyToUse = selectedKey || directorSheet?.recommendedKey || currentProject?.key || 'C';
      const scaleToUse = selectedScale || (directorSheet?.scaleMode === 'minor' ? 'minor' : 'major');

      // Canonical Orchestration Layer (UI → MusicDirectorService → Composition → Arrangement → Performance → Rendering → Mixing)
      const result = MusicDirectorService.getInstance().orchestrateAndGenerateFullSong({
        genre: selectedGenre,
        vocalBuffer: targetVocal,
        bpm: bpmToUse,
        rootKey: keyToUse,
        scale: scaleToUse,
        selectedInstruments,
        introSeconds: 12,
        arrangementStyle: selectedFeel,
        energyLevel: 'balanced',
        semanticAnalysis: null,
        semanticArrangementSheet: directorSheet || currentProject?.semanticArrangementSheet || null,
        lyrics: currentProject?.lyrics || '',
        project: currentProject
      });

      if (directorSheet) {
        onApplyDirectorPlan(directorSheet);
      }

      if (onSetProjectTracks) {
        onSetProjectTracks(result.tracks, result.totalDuration, result.plan);
      }

      setAppliedSuccess(true);
      setTimeout(() => {
        setAppliedSuccess(false);
        onNavigate('mixer');
      }, 800);
    } catch (err) {
      console.error('Failed to generate full multi-track music:', err);
    } finally {
      setIsGeneratingStems(false);
    }
  };

  const handleTogglePlayFullMix = () => {
    if (isPlayingFullMix) {
      audioEngine.stopAllPlayback();
      setIsPlayingFullMix(false);
      return;
    }

    if (currentProject && currentProject.tracks.length > 0) {
      setIsPlayingFullMix(true);
      currentProject.tracks.forEach(track => {
        if (!track.isMuted && track.audioBuffer) {
          audioEngine.playBuffer(track.audioBuffer, () => {
            setIsPlayingFullMix(false);
          });
        }
      });
    } else {
      // If no stems generated yet, generate preview accompaniment via MusicDirectorService
      const previewBuffer = directorService.orchestrateAccompanimentPreview(selectedGenre, 15, selectedBpm, selectedKey);
      setIsPlayingFullMix(true);
      audioEngine.playBuffer(previewBuffer, () => {
        setIsPlayingFullMix(false);
      });
    }
  };

  const handleApplyToStudio = () => {
    handleGenerateAndBondMusic();
  };

  const GENRE_CHOICES = [
    { id: 'Bollywood Romantic', icon: '❤️', label: 'Bollywood Romantic', desc: 'Acoustic guitar, warm piano & strings' },
    { id: 'Bollywood Acoustic', icon: '🎸', label: 'Bollywood Acoustic', desc: 'Intimate fingerpicking & soft upright bass' },
    { id: 'Punjabi Beats & Dhol', icon: '🪘', label: 'Punjabi Beats', desc: 'Energetic Dhol, modern 808s & syncopated groove' },
    { id: 'Sufi Ghazal Fusion', icon: '🕊️', label: 'Sufi Ghazal Fusion', desc: 'Harmonium, Tabla theka & soaring Sarangi' },
    { id: 'Pop Ballad', icon: '✨', label: 'Pop Ballad', desc: 'Modern radio pop drums, piano & synth bass' },
    { id: 'Lo-Fi Chill & Rain', icon: '☕', label: 'Lo-Fi Chill', desc: 'Warm Rhodes, vinyl dust & laid-back beats' },
    { id: 'Indian Classical Raga', icon: '🪕', label: 'Indian Classical', desc: 'Authentic Tabla, Sitar meend & Tanpura drone' },
    { id: 'Rock Energy Anthem', icon: '⚡', label: 'Rock Anthem', desc: 'Driving electric riffs & powerful drums' },
  ];

  const INSTRUMENT_LIST = [
    { id: 'Piano', name: 'Grand Piano', icon: '🎹' },
    { id: 'Acoustic Guitar', name: 'Acoustic Guitar', icon: '🎸' },
    { id: 'Bass', name: 'Bassline (Sub/Acoustic)', icon: '🎻' },
    { id: 'Drums', name: 'Studio Drums', icon: '🥁' },
    { id: 'Strings', name: 'Symphonic Strings', icon: '🎼' },
    { id: 'Flute', name: 'Woodwind Flute', icon: '🪈' },
    { id: 'Tabla', name: 'Tabla (Dayun/Bayun)', icon: '🪘' },
    { id: 'Sitar', name: 'Melodic Sitar', icon: '🪕' },
    { id: 'Harmonium', name: 'Harmonium Organ', icon: '🎹' },
    { id: 'Synth', name: 'Analog Poly Synth', icon: '🎛️' },
  ];

  const getDynamicBadgeColor = (dynamic: string) => {
    switch (dynamic) {
      case 'pp':
      case 'p':
        return 'bg-blue-500/20 text-blue-300 border-blue-500/30';
      case 'mp':
      case 'mf':
        return 'bg-purple-500/20 text-purple-300 border-purple-500/30';
      case 'f':
      case 'ff':
        return 'bg-rose-500/20 text-rose-300 border-rose-500/30';
      default:
        return 'bg-slate-800 text-slate-300';
    }
  };

  return (
    <div className="space-y-4 pb-24">
      {/* Header */}
      <ProductionStageHeader
        currentScreen="pipeline"
        currentProject={currentProject}
        onNavigate={onNavigate}
        title="AI Music Director & Lyric Orchestrator"
        subtitle="Deep Word-by-Word Emotional Analysis, Semantic Chords & Dynamic Score"
      />

      <ProductionProgress currentScreen="pipeline" currentProject={currentProject} onNavigate={onNavigate} />

      {/* Hero AI Director Banner */}
      <div className="bg-gradient-to-r from-purple-950/80 via-slate-900 to-indigo-950/80 border border-purple-500/30 rounded-2xl p-5 space-y-4 shadow-xl">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center space-x-2">
              <span className="p-1.5 rounded-lg bg-purple-500/20 text-purple-300 border border-purple-500/30">
                <Cpu className="w-4 h-4 text-purple-400" />
              </span>
              <h3 className="text-sm font-bold text-white">Full Song Director & Semantic Arrangement Brain</h3>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed max-w-2xl">
              Analyzes the poetic emotion of every word in your song, maps dynamic chord progressions, assigns Indian Raga mood nuances, and schedules instrument drops to match vocal intensity.
            </p>
          </div>
          <div className="flex flex-col items-end text-right">
            <button
              type="button"
              onClick={() => onNavigate('omni_test')}
              className="inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-full bg-purple-500/20 hover:bg-purple-500/30 border border-purple-500/40 text-purple-300 text-xs font-semibold transition-all active:scale-95"
            >
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>Omni Route Online</span>
              <span className="text-[10px] text-purple-200 bg-purple-900/60 px-1 rounded ml-1">Keys & Test →</span>
            </button>
            <span className="text-[10px] text-slate-400 mt-1 font-mono">xAI Grok → Gemini → Local</span>
          </div>
        </div>

        {/* Lyric Input Box */}
        <div className="bg-slate-950/90 rounded-xl border border-slate-800 p-3 space-y-2">
          <div className="flex items-center justify-between text-xs text-slate-400 font-medium">
            <span className="flex items-center space-x-1.5 text-slate-300">
              <BookOpen className="w-3.5 h-3.5 text-purple-400" />
              <span>Song Lyrics & Section Stanzas</span>
            </span>
            <span className="text-[10px] text-slate-500 font-mono">
              {lyrics.split('\n').filter(l => l.trim().length > 0).length} lines detected
            </span>
          </div>

          <textarea
            value={lyrics}
            onChange={(e) => setLyrics(e.target.value)}
            rows={5}
            className="w-full bg-transparent text-slate-200 text-xs leading-relaxed resize-none focus:outline-none placeholder:text-slate-600 font-mono"
            placeholder="Paste or write your full song lyrics here with [Verse 1], [Chorus], [Antara]..."
          />

          <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-900">
            <div className="text-[11px] text-slate-400 font-mono">
              Key: <span className="text-purple-300 font-bold">{currentProject?.key || 'C'}</span> • Tempo:{' '}
              <span className="text-cyan-300 font-bold">{currentProject?.bpm || 120} BPM</span>
            </div>

            <button
              onClick={handleAnalyze}
              disabled={isAnalyzing}
              className="py-2.5 px-5 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white rounded-xl font-bold text-xs flex items-center space-x-2 shadow-lg shadow-purple-600/30 active:scale-[0.98] transition-all disabled:opacity-50"
            >
              <Sparkles className="w-4 h-4 text-amber-300" />
              <span>{isAnalyzing ? 'Orchestrating Word-by-Word...' : 'Analyze Lyrics & Generate Score'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Analysis Output: Director Score & Arrangements */}
      {directorSheet && (
        <div className="space-y-4">
          {/* Summary Vision Card */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Compass className="w-4 h-4 text-indigo-400" />
                <h4 className="text-xs font-bold text-white uppercase tracking-wider">
                  Director's Production Blueprint
                </h4>
              </div>
              <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-[10px] font-bold">
                {directorSheet.sections.length} Sections Orchestrated
              </span>
            </div>

            {directorSheet.source && (
              <div className="flex items-center justify-between px-3 py-2 rounded-xl bg-indigo-950/40 border border-indigo-500/30 text-xs">
                <div className="flex items-center space-x-2">
                  <Cpu className="w-3.5 h-3.5 text-indigo-400" />
                  <span className="text-[11px] text-slate-300">
                    Engine:{' '}
                    <span className="font-bold text-white">
                      {directorSheet.source === 'xai_grok'
                        ? `xAI Grok (${directorSheet.modelUsed || 'grok-4.6'})`
                        : directorSheet.source === 'gemini_ai'
                        ? `Google Gemini (${directorSheet.modelUsed || 'gemini-2.0-flash'})`
                        : 'Local Deterministic Brain'}
                    </span>
                  </span>
                </div>
                {directorSheet.latencyMs && (
                  <span className="text-[10px] text-indigo-300/80 font-mono">
                    {directorSheet.latencyMs}ms
                  </span>
                )}
              </div>
            )}

            <p className="text-xs text-slate-300 leading-relaxed bg-slate-950 p-3 rounded-xl border border-slate-800/80">
              "{directorSheet.producerDirectorSummary}"
            </p>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
              <div className="p-2.5 bg-slate-950 rounded-xl border border-slate-800">
                <span className="text-[10px] text-slate-500 block uppercase">Root Key & Scale</span>
                <span className="font-bold text-purple-400 text-sm font-mono">
                  {selectedKey} {selectedScale}
                </span>
              </div>

              <div className="p-2.5 bg-slate-950 rounded-xl border border-slate-800">
                <span className="text-[10px] text-slate-500 block uppercase">Target Tempo</span>
                <span className="font-bold text-cyan-400 text-sm font-mono">
                  {selectedBpm} BPM
                </span>
              </div>

              <div className="p-2.5 bg-slate-950 rounded-xl border border-slate-800">
                <span className="text-[10px] text-slate-500 block uppercase">Vocal Space</span>
                <span className="font-bold text-indigo-400 text-sm capitalize">
                  {directorSheet.suggestedMixerPresets.vocalReverb} Reverb
                </span>
              </div>

              <div className="p-2.5 bg-slate-950 rounded-xl border border-slate-800">
                <span className="text-[10px] text-slate-500 block uppercase">Stereo Field</span>
                <span className="font-bold text-pink-400 text-sm capitalize">
                  {directorSheet.suggestedMixerPresets.stereoSpread.replace('_', ' ')}
                </span>
              </div>
            </div>
          </div>

          {/* Interactive Music Arrangement & Instrument Selection Box */}
          <div className="bg-slate-900 border border-indigo-500/30 rounded-2xl p-4 space-y-4 shadow-xl">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 pb-3">
              <div>
                <h4 className="text-sm font-bold text-white flex items-center space-x-2">
                  <Music className="w-4 h-4 text-pink-400" />
                  <span>Choose Music Style & Instrument Arrangement</span>
                </h4>
                <p className="text-xs text-slate-400">
                  Select your desired genre, instruments, and let the AI synthesize backing music tailored to your vocal.
                </p>
              </div>

              <div className="flex items-center space-x-2">
                <button
                  onClick={handleTogglePlayFullMix}
                  className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-bold text-slate-200 flex items-center space-x-1.5 transition-all"
                >
                  {isPlayingFullMix ? (
                    <>
                      <Square className="w-3.5 h-3.5 text-rose-400 fill-rose-400" />
                      <span>Stop Preview</span>
                    </>
                  ) : (
                    <>
                      <Play className="w-3.5 h-3.5 text-emerald-400 fill-emerald-400" />
                      <span>Audition Style Preview</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Genre Cards */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-300">Select Song Music Genre</label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {GENRE_CHOICES.map((g) => {
                  const isSelected = selectedGenre === g.id;
                  return (
                    <button
                      key={g.id}
                      onClick={() => setSelectedGenre(g.id)}
                      className={`p-2.5 rounded-xl border text-left transition-all ${
                        isSelected
                          ? 'bg-gradient-to-br from-indigo-950/70 to-purple-950/70 border-indigo-500 text-white shadow-md shadow-indigo-500/20'
                          : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:border-slate-700 hover:text-slate-300'
                      }`}
                    >
                      <div className="flex items-center space-x-1.5">
                        <span className="text-base">{g.icon}</span>
                        <span className="text-xs font-bold truncate">{g.label}</span>
                      </div>
                      <div className="text-[10px] text-slate-400 truncate mt-1">{g.desc}</div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Instrument Selection Toggles */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-300">
                  Active Instruments ({selectedInstruments.length} selected)
                </label>
                <span className="text-[10px] text-slate-400">Click to add/remove instruments</span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-1.5">
                {INSTRUMENT_LIST.map((inst) => {
                  const isSelected = selectedInstruments.includes(inst.id);
                  return (
                    <button
                      key={inst.id}
                      onClick={() => toggleInstrument(inst.id)}
                      className={`p-2 rounded-xl border text-left flex items-center space-x-2 transition-all ${
                        isSelected
                          ? 'bg-purple-950/40 border-purple-500 text-white shadow-sm'
                          : 'bg-slate-950/40 border-slate-800/80 text-slate-500 hover:border-slate-700'
                      }`}
                    >
                      <span className="text-sm">{inst.icon}</span>
                      <span className="text-xs font-semibold truncate">{inst.name}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Tempo & Key Quick Adjustment */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1">
              <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-800 flex items-center justify-between">
                <span className="text-xs text-slate-400 font-medium">Tempo (BPM):</span>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => setSelectedBpm(prev => Math.max(60, prev - 4))}
                    className="w-6 h-6 rounded bg-slate-800 text-slate-300 font-bold hover:bg-slate-700 text-xs flex items-center justify-center"
                  >
                    -
                  </button>
                  <span className="text-xs font-bold text-cyan-300 font-mono w-10 text-center">{selectedBpm}</span>
                  <button
                    onClick={() => setSelectedBpm(prev => Math.min(180, prev + 4))}
                    className="w-6 h-6 rounded bg-slate-800 text-slate-300 font-bold hover:bg-slate-700 text-xs flex items-center justify-center"
                  >
                    +
                  </button>
                </div>
              </div>

              <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-800 flex items-center justify-between">
                <span className="text-xs text-slate-400 font-medium">Musical Key:</span>
                <select
                  value={selectedKey}
                  onChange={(e) => setSelectedKey(e.target.value)}
                  className="bg-slate-900 border border-slate-700 text-xs text-purple-300 font-bold font-mono rounded px-2 py-1 focus:outline-none"
                >
                  {['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'].map((k) => (
                    <option key={k} value={k}>{k}</option>
                  ))}
                </select>
              </div>

              <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-800 flex items-center justify-between">
                <span className="text-xs text-slate-400 font-medium">Scale Type:</span>
                <div className="flex items-center space-x-1">
                  <button
                    onClick={() => setSelectedScale('major')}
                    className={`px-2 py-1 text-[11px] font-bold rounded ${selectedScale === 'major' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'}`}
                  >
                    Major
                  </button>
                  <button
                    onClick={() => setSelectedScale('minor')}
                    className={`px-2 py-1 text-[11px] font-bold rounded ${selectedScale === 'minor' ? 'bg-pink-600 text-white' : 'text-slate-400 hover:text-white'}`}
                  >
                    Minor
                  </button>
                </div>
              </div>
            </div>

            {/* Primary Generate Multi-Track & Attach to Song Action */}
            <button
              onClick={handleGenerateAndBondMusic}
              disabled={isGeneratingStems || selectedInstruments.length === 0}
              className="w-full py-4 bg-gradient-to-r from-emerald-600 via-teal-600 to-indigo-600 hover:from-emerald-500 hover:to-indigo-500 text-white rounded-xl font-bold text-xs flex items-center justify-center space-x-2 shadow-xl shadow-emerald-600/30 active:scale-[0.98] transition-all disabled:opacity-50"
            >
              {isGeneratingStems ? (
                <>
                  <Sparkles className="w-4 h-4 animate-spin text-amber-300" />
                  <span>Synthesizing Multi-Track Stems & Bonding to Vocals...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 text-amber-300" />
                  <span>⚡ Synthesize Full Music & Attach to Sung Vocals (Open Mixer)</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </div>

          {/* Section-by-Section & Line-by-Line Dynamic Score Sheet */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider px-1">
              Word-by-Word Orchestration Score
            </h4>

            {directorSheet.sections.map((section, sIdx) => (
              <div
                key={sIdx}
                className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-3 shadow-md"
              >
                {/* Section Header */}
                <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-slate-800">
                  <div className="flex items-center space-x-2">
                    <span className="w-2 h-2 rounded-full bg-purple-500" />
                    <h5 className="text-xs font-bold text-white uppercase">{section.name}</h5>
                    <span className="text-[10px] px-2 py-0.5 rounded bg-slate-800 text-slate-300 font-mono">
                      {section.barCount} Bars
                    </span>
                  </div>

                  <div className="flex items-center space-x-2 text-[10px]">
                    <span className="text-slate-400 font-mono">Groove: {section.drumGroove}</span>
                    <span className="px-2 py-0.5 rounded bg-purple-500/20 text-purple-300 font-bold uppercase">
                      {section.energyLevel}
                    </span>
                  </div>
                </div>

                {/* Line Items */}
                <div className="space-y-2">
                  {section.lines.map((line) => (
                    <div
                      key={line.lineIndex}
                      className="p-3 bg-slate-950 rounded-xl border border-slate-800/80 hover:border-slate-700 transition-all space-y-2"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        {/* Lyric text with highlighted accent */}
                        <div className="flex-1 min-w-[200px]">
                          <span className="text-xs text-white font-medium">"{line.text}"</span>
                          {line.vocalAccentWord && (
                            <span className="ml-2 text-[10px] px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-300 border border-amber-500/20 font-mono">
                              Accent: {line.vocalAccentWord}
                            </span>
                          )}
                        </div>

                        {/* Chord & Dynamic Badges */}
                        <div className="flex items-center space-x-2">
                          <span className="px-2 py-0.5 rounded bg-indigo-600/30 border border-indigo-500/40 text-indigo-300 font-mono font-bold text-xs">
                            {line.recommendedChord}
                          </span>

                          <span
                            className={`px-1.5 py-0.5 rounded text-[10px] font-mono font-bold border ${getDynamicBadgeColor(
                              line.dynamicLevel
                            )}`}
                          >
                            {line.dynamicLevel} ({line.intensity}/10)
                          </span>

                          <button
                            onClick={() => handleAuditionLine(line)}
                            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
                            title="Audition musical section"
                          >
                            {auditioningLineIdx === line.lineIndex ? (
                              <Square className="w-3.5 h-3.5 text-rose-400" />
                            ) : (
                              <Play className="w-3.5 h-3.5 text-purple-400" />
                            )}
                          </button>
                        </div>
                      </div>

                      {/* Emotion & Instrumentation Breakdown */}
                      <div className="flex flex-wrap items-center justify-between gap-1 text-[10px] text-slate-400 pt-1 border-t border-slate-900">
                        <div className="flex items-center space-x-1.5">
                          <Heart className="w-3 h-3 text-pink-400 shrink-0" />
                          <span className="text-pink-300 font-semibold">{line.emotion}</span>
                          {line.ragaMood && (
                            <span className="text-slate-500 font-mono">({line.ragaMood})</span>
                          )}
                        </div>

                        <div className="flex items-center space-x-1 text-slate-400">
                          <Music className="w-3 h-3 text-indigo-400 shrink-0" />
                          <span>{line.instrumentation.slice(0, 2).join(', ')}</span>
                        </div>
                      </div>

                      {/* Producer Note */}
                      <div className="text-[10px] text-slate-400 italic bg-slate-900/60 p-1.5 rounded-lg border border-slate-800/40 flex items-start space-x-1">
                        <Info className="w-3 h-3 text-cyan-400 shrink-0 mt-0.5" />
                        <span>{line.productionNote}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* 1-Click Apply to Studio Project Button */}
          <div className="p-4 bg-slate-900 border border-slate-800 rounded-2xl space-y-2">
            <button
              onClick={handleApplyToStudio}
              className={`w-full py-4 rounded-xl font-bold text-xs flex items-center justify-center space-x-2 shadow-xl active:scale-[0.98] transition-all ${
                appliedSuccess
                  ? 'bg-emerald-600 text-white'
                  : 'bg-gradient-to-r from-purple-600 via-indigo-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white shadow-purple-600/30'
              }`}
            >
              {appliedSuccess ? (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Applied AI Director Blueprint to Studio!</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 text-amber-300" />
                  <span>Apply AI Orchestration to Song & Synthesize Stems</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
            <p className="text-[10px] text-slate-400 text-center">
              Reconfigures tempo ({directorSheet.recommendedBpm} BPM), key ({directorSheet.recommendedKey}), chord timeline, and dynamic instrument layers.
            </p>
          </div>
        </div>
      )}
    </div>
  );
};
