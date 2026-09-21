import React, { useState, useEffect, useMemo } from 'react';
import { 
  Sparkles, 
  Check, 
  Music, 
  Activity, 
  Clock, 
  ArrowRight, 
  CheckCircle2, 
  Heart, 
  Flame, 
  Play, 
  Square, 
  Sliders, 
  RefreshCw, 
  ChevronLeft,
  Brain,
  Waves,
  Eye,
  SlidersHorizontal,
  Volume2,
  Globe,
  Languages,
  FileText,
  Smile,
  Shield,
  Layers
} from 'lucide-react';
import { WebAudioEngine } from '../services/webAudioEngine';
import { 
  ArrangementStyle, 
  EnergyLevel, 
  ArrangementPlan, 
  SongSection 
} from '../services/intelligentArrangementEngine';
import { 
  VocalUnderstandingEngine, 
  VocalSongMap 
} from '../services/vocalUnderstandingEngine';
import {
  LanguageUnderstandingEngine,
  SupportedLanguage,
  SemanticIntelligenceMode,
  LyricalSemanticAnalysis
} from '../services/languageUnderstandingEngine';
import { AcousticRealismEngine, RealismMetrics } from '../services/acousticRealismEngine';
import { MusicDirectorService } from '../services/musicDirectorService';
import { 
  PitchAnalysisResult, 
  BpmKeyResult, 
  ProjectTrack, 
  ProductionStage, 
  ScreenId, 
  StudioProject 
} from '../types/audio';
import { ProductionProgress } from '../components/ProductionProgress';
import { ProductionStageHeader } from '../components/ProductionStageHeader';

export type MusicalIntelligenceMode = 'auto' | 'detailed' | 'manual';
export type ArrangementFeel = 'natural' | 'emotional' | 'cinematic' | 'modern';
export type MusicalDensity = 'light' | 'balanced' | 'full';

const LANGUAGE_OPTIONS: { id: SupportedLanguage; label: string; native: string }[] = [
  { id: 'auto', label: 'Auto-Detect', native: 'Multilingual' },
  { id: 'hindi', label: 'Hindi', native: 'हिन्दी' },
  { id: 'urdu', label: 'Urdu', native: 'اردو' },
  { id: 'marathi', label: 'Marathi', native: 'मराठी' },
  { id: 'gujarati', label: 'Gujarati', native: 'ગુજરાતી' },
  { id: 'bengali', label: 'Bengali', native: 'বাংলা' },
  { id: 'punjabi', label: 'Punjabi', native: 'ਪੰਜਾਬੀ' },
  { id: 'tamil', label: 'Tamil', native: 'தமிழ்' },
  { id: 'telugu', label: 'Telugu', native: 'తెలుగు' },
  { id: 'kannada', label: 'Kannada', native: 'ಕನ್ನಡ' },
  { id: 'malayalam', label: 'Malayalam', native: 'മലയാളം' },
  { id: 'english', label: 'English', native: 'English' },
  { id: 'hinglish', label: 'Hinglish / Mixed', native: 'Hinglish' },
];

const LYRIC_PRESETS = [
  {
    lang: 'Hindi',
    text: 'तेरे बिना ज़िन्दगी से कोई शिकवा तो नहीं, तेरे बिना ज़िन्दगी भी लेकिन ज़िन्दगी तो नहीं',
    desc: 'Classic Romantic Ghazal'
  },
  {
    lang: 'Urdu',
    text: 'हंगामा है क्यों बरपा थोड़ी सी जो पी ली है, डाका तो नहीं डाला चोरी तो नहीं की है',
    desc: 'Expressive Urdu Poetic'
  },
  {
    lang: 'Punjabi',
    text: 'नचदे ने सारे मिलके जश्न मनावांगे, भंगड़ा पाके आज ढोल बजावांगे',
    desc: 'High-Energy Celebration'
  },
  {
    lang: 'Tamil',
    text: 'உன் பார்வையில் ஓராயிரம் கவிதை நான் எழுதுவேன், அன்பே உன்னை என்றும் மறவேன்',
    desc: 'Soulful Melody'
  },
  {
    lang: 'Marathi',
    text: 'माझे माहेर पंढरी, सुख वाचे न समावे, विठ्ठल रखुमाई चरणी लीन व्हावे',
    desc: 'Devotional Abhang'
  },
  {
    lang: 'Hinglish',
    text: 'Tum hi ho my everything, fallen in love with your smile baby',
    desc: 'Contemporary Pop'
  }
];

interface ProductionPipelineScreenProps {
  currentProject: StudioProject | null;
  vocalBuffer: AudioBuffer | null;
  onNavigate: (screen: ScreenId) => void;
  onApplyCleanedVocal: (cleanedBuffer: AudioBuffer) => void;
  onUpdateBpmKey: (bpm: number, key: string, scale: 'major' | 'minor') => void;
  onUpdatePitch?: (pitch: PitchAnalysisResult) => void;
  onUpdateArrangementSettings?: (
    instruments: string[],
    introDurationSeconds: number,
    style?: string,
    energy?: string
  ) => void;
  onSetProjectTracks: (tracks: ProjectTrack[], totalDuration: number, plan?: any) => void;
  onUpdateProjectStage: (stage: ProductionStage) => void;
}

export const ProductionPipelineScreen: React.FC<ProductionPipelineScreenProps> = ({
  currentProject,
  vocalBuffer,
  onNavigate,
  onApplyCleanedVocal,
  onUpdateBpmKey,
  onUpdatePitch,
  onSetProjectTracks,
  onUpdateProjectStage,
}) => {
  const audioEngine = WebAudioEngine.getInstance();
  const hasExistingTracks = Boolean(currentProject?.tracks && currentProject.tracks.some(t => t.type !== 'vocal'));

  // Workflow Pipeline Stages
  const [activeStep, setActiveStep] = useState<number>(hasExistingTracks ? 5 : 4);
  const [cleaningStatus, setCleaningStatus] = useState<'pending' | 'running' | 'done'>('done');
  const [pitchStatus, setPitchStatus] = useState<'pending' | 'running' | 'done'>('done');
  const [bpmStatus, setBpmStatus] = useState<'pending' | 'running' | 'done'>('done');
  const [musicGenStatus, setMusicGenStatus] = useState<'idle' | 'generating' | 'ready'>(
    hasExistingTracks ? 'ready' : 'idle'
  );

  // Analysis Data
  const [detectedPitch, setDetectedPitch] = useState<PitchAnalysisResult | null>(currentProject?.detectedPitch || null);
  const [detectedBpmKey, setDetectedBpmKey] = useState<BpmKeyResult | null>(currentProject?.detectedBpmKey || null);
  const [cleanedAudioBuffer, setCleanedAudioBuffer] = useState<AudioBuffer | null>(currentProject?.cleanedVocalBuffer || null);
  const [generatedPlan, setGeneratedPlan] = useState<ArrangementPlan | null>(currentProject?.arrangementPlan || null);
  const [vocalSongMap, setVocalSongMap] = useState<VocalSongMap | null>(null);

  // Multilingual & Lyrical Intelligence State (Phase 21 & 22)
  const [lyricsInput, setLyricsInput] = useState<string>(currentProject?.lyrics || '');
  const [selectedLanguage, setSelectedLanguage] = useState<SupportedLanguage>((currentProject?.selectedLanguage as SupportedLanguage) || 'auto');
  const [semanticMode, setSemanticMode] = useState<SemanticIntelligenceMode>(currentProject?.semanticMode || 'auto');
  const [engineExecutionMode, setEngineExecutionMode] = useState<'auto' | 'ml' | 'fallback'>('auto');
  const [showLyricsEditor, setShowLyricsEditor] = useState<boolean>(Boolean(currentProject?.lyrics));
  const [neuralAnalysis, setNeuralAnalysis] = useState<LyricalSemanticAnalysis | null>(null);
  const [isNeuralInferring, setIsNeuralInferring] = useState<boolean>(false);

  // Synchronize lyrics from currentProject when it updates
  useEffect(() => {
    if (currentProject?.lyrics && currentProject.lyrics.trim().length > 0) {
      setLyricsInput(currentProject.lyrics);
      setShowLyricsEditor(true);
    }
  }, [currentProject?.lyrics]);

  // Synchronous analysis as immediate baseline
  const syncSemanticAnalysis = useMemo<LyricalSemanticAnalysis | null>(() => {
    if (!lyricsInput || lyricsInput.trim().length === 0) return null;
    try {
      const engine = LanguageUnderstandingEngine.getInstance();
      engine.setEngineMode(engineExecutionMode);
      return engine.analyzeLyrics(
        lyricsInput,
        selectedLanguage === 'auto' ? undefined : selectedLanguage,
        semanticMode,
        vocalSongMap || undefined
      );
    } catch {
      return null;
    }
  }, [lyricsInput, selectedLanguage, semanticMode, vocalSongMap, engineExecutionMode]);

  // Background Neural Transformer inference (Non-blocking ML)
  useEffect(() => {
    if (!lyricsInput || lyricsInput.trim().length === 0) {
      setNeuralAnalysis(null);
      return;
    }
    if (engineExecutionMode === 'fallback') {
      setNeuralAnalysis(null);
      return;
    }

    let isCancelled = false;
    const runAsyncInference = async () => {
      setIsNeuralInferring(true);
      try {
        const engine = LanguageUnderstandingEngine.getInstance();
        engine.setEngineMode(engineExecutionMode);
        const res = await engine.analyzeLyricsAsync(
          lyricsInput,
          selectedLanguage === 'auto' ? undefined : selectedLanguage,
          semanticMode,
          vocalSongMap || undefined
        );
        if (!isCancelled) {
          setNeuralAnalysis(res);
        }
      } catch (err) {
        console.warn('Neural inference caught error, using fallback:', err);
      } finally {
        if (!isCancelled) {
          setIsNeuralInferring(false);
        }
      }
    };

    const timer = setTimeout(runAsyncInference, 250);
    return () => {
      isCancelled = true;
      clearTimeout(timer);
    };
  }, [lyricsInput, selectedLanguage, semanticMode, vocalSongMap, engineExecutionMode]);

  const liveSemanticAnalysis = neuralAnalysis || syncSemanticAnalysis;

  // User Creative Controls (Phase 3 Spec)
  const [intelligenceMode, setIntelligenceMode] = useState<MusicalIntelligenceMode>('auto');
  const [arrangementFeel, setArrangementFeel] = useState<ArrangementFeel>('natural');
  const [musicalDensity, setMusicalDensity] = useState<MusicalDensity>('balanced');
  const [selectedGenre, setSelectedGenre] = useState<string>(currentProject?.genre || 'Bollywood Romantic');
  const [arrangementStyle, setArrangementStyle] = useState<ArrangementStyle>((currentProject?.arrangementStyle as ArrangementStyle) || 'romantic');
  const [energyLevel, setEnergyLevel] = useState<EnergyLevel>((currentProject?.energyLevel as EnergyLevel) || 'balanced');
  const [introLength, setIntroLength] = useState<number>(currentProject?.introDurationSeconds || 12);
  const [selectedInstruments, setSelectedInstruments] = useState<string[]>(
    currentProject?.selectedInstruments && currentProject.selectedInstruments.length > 0
      ? currentProject.selectedInstruments
      : ['Piano', 'Acoustic Guitar', 'Bass', 'Drums', 'Strings', 'Flute']
  );
  const [isPlayingPreview, setIsPlayingPreview] = useState(false);

  // Forensic Studio Realism & Master Quality Score
  const realismMetrics = useMemo<RealismMetrics>(() => {
    return AcousticRealismEngine.getInstance().evaluateRealismMetrics(
      cleanedAudioBuffer || vocalBuffer,
      selectedInstruments.length,
      Boolean(currentProject?.semanticArrangementSheet)
    );
  }, [cleanedAudioBuffer, vocalBuffer, selectedInstruments.length, currentProject?.semanticArrangementSheet]);

  const ARRANGEMENT_STYLES: { id: ArrangementStyle; label: string; desc: string }[] = [
    { id: 'romantic', label: 'Bollywood Romantic', desc: 'Warm harmony, gentle guitar, lush strings & expressive flute responses' },
    { id: 'acoustic', label: 'Bollywood Acoustic', desc: 'Fingerpicked acoustic guitar, subtle upright bass & intimate grand piano' },
    { id: 'emotional', label: 'Bollywood Emotional', desc: 'Minor harmonies, soaring string swells & melancholic pause fills' },
    { id: 'modern', label: 'Bollywood Modern', desc: 'Contemporary syncopated rhythm, analog synth textures & clean drops' },
    { id: 'dance', label: 'Bollywood Dance', desc: 'Driving acoustic drums, upbeat chord progressions & energetic chorus' },
    { id: 'cinematic', label: 'Bollywood Cinematic', desc: 'Dramatic orchestral movements, brass/string swells & dynamic transitions' },
    { id: 'indian', label: 'Bollywood Indian Classical', desc: 'Authentic Tabla grooves, melodic Sitar leads & Harmonium chordal support' }
  ];

  const INSTRUMENT_OPTIONS = [
    { id: 'Piano', name: 'Grand Piano', icon: '🎹', desc: 'Harmonic foundation & phrase endings' },
    { id: 'Acoustic Guitar', name: 'Acoustic Guitar', icon: '🎸', desc: 'Fingerpicked rhythmic texture' },
    { id: 'Bass', name: 'Bassline (Sub/Acoustic)', icon: '🎻', desc: 'Root anchor & walking chorus' },
    { id: 'Drums', name: 'Studio Drums', icon: '🥁', desc: 'Groove & BPM transition fills' },
    { id: 'Strings', name: 'Symphonic Strings', icon: '🎼', desc: 'High-note swells & emotional bloom' },
    { id: 'Flute', name: 'Woodwind Flute', icon: '🪈', desc: 'Lyrical call-and-response lead' },
    { id: 'Synth', name: 'Analog Poly Synth', icon: '🎛️', desc: 'Atmospheric counter-melody layer' },
    { id: 'Tabla', name: 'Tabla (Dayun/Bayun)', icon: '🪘', desc: 'Rhythmic Bols & dynamic pitch-drops' },
    { id: 'Sitar', name: 'Melodic Sitar', icon: '🪕', desc: 'Javari buzz, Meend bends & Tarab resonance' },
    { id: 'Harmonium', name: 'Harmonium Organ', icon: '🎹', desc: 'Warm reed harmonic foundation' }
  ];

  // Automatic Audio DSP Pipeline Execution on Mount
  useEffect(() => {
    let isMounted = true;

    const runAutomatedPipeline = async () => {
      if (hasExistingTracks && currentProject?.arrangementPlan) {
        setGeneratedPlan(currentProject.arrangementPlan);
        return;
      }

      const targetBuffer = vocalBuffer || currentProject?.tracks.find(t => t.type === 'vocal')?.audioBuffer;
      
      // Step 1: Vocal Cleanup
      setActiveStep(1);
      setCleaningStatus('running');
      await new Promise(r => setTimeout(r, 400));

      let cleaned: AudioBuffer | null = null;
      if (targetBuffer) {
        try {
          cleaned = await audioEngine.processVocalAutoCleanup(targetBuffer);
          if (isMounted) {
            setCleanedAudioBuffer(cleaned);
            onApplyCleanedVocal(cleaned);
          }
        } catch {
          cleaned = targetBuffer;
        }
      }
      if (!isMounted) return;
      setCleaningStatus('done');

      // Step 2: Pitch Detection
      setActiveStep(2);
      setPitchStatus('running');
      await new Promise(r => setTimeout(r, 200));

      const activeBuffer = cleaned || targetBuffer;
      let pitchResult: PitchAnalysisResult;
      if (activeBuffer) {
        pitchResult = audioEngine.analyzeBufferPitch(activeBuffer);
      } else {
        pitchResult = {
          frequency: 0,
          noteName: 'Unvoiced',
          midiNumber: 0,
          centsOff: 0,
          confidence: 0,
          inTune: false
        };
      }
      if (!isMounted) return;
      setDetectedPitch(pitchResult);
      if (onUpdatePitch) onUpdatePitch(pitchResult);
      setPitchStatus('done');

      // Step 3: BPM & Key Analysis
      setActiveStep(3);
      setBpmStatus('running');
      await new Promise(r => setTimeout(r, 250));

      let bpmResult: BpmKeyResult;
      if (activeBuffer) {
        bpmResult = audioEngine.analyzeBufferBpmKey(activeBuffer);
      } else {
        bpmResult = {
          bpm: currentProject?.bpm || 120,
          key: currentProject?.key || 'C',
          scale: currentProject?.scale || 'major',
          confidence: 0.8
        };
      }
      if (!isMounted) return;
      setDetectedBpmKey(bpmResult);
      onUpdateBpmKey(bpmResult.bpm, bpmResult.key, bpmResult.scale === 'minor' ? 'minor' : 'major');
      setBpmStatus('done');

      // Deep Vocal Understanding Extraction for UI preview
      let vocalMap: VocalSongMap | null = null;
      try {
        vocalMap = VocalUnderstandingEngine.getInstance().analyzeVocalPerformance(
          cleaned || targetBuffer || null,
          bpmResult.bpm,
          bpmResult.key,
          bpmResult.scale === 'minor' ? 'minor' : 'major',
          introLength,
          pitchResult
        );
        if (isMounted) setVocalSongMap(vocalMap);
      } catch (err) {
        console.error("Vocal understanding error:", err);
      }

      // Step 4: Automatic AI Music Director & Multi-Track Arrangement
      if (!isMounted) return;
      setActiveStep(4);
      setMusicGenStatus('generating');
      onUpdateProjectStage('generatingAccompaniment');
      await new Promise(r => setTimeout(r, 500));

      let semanticAnalysisResult: LyricalSemanticAnalysis | null = null;
      const lyricsToUse = (lyricsInput || currentProject?.lyrics || '').trim();
      if (lyricsToUse.length > 0) {
        try {
          semanticAnalysisResult = LanguageUnderstandingEngine.getInstance().analyzeLyrics(
            lyricsToUse,
            selectedLanguage === 'auto' ? undefined : selectedLanguage,
            semanticMode,
            vocalMap || undefined
          );
        } catch {}
      }

      // Canonical Orchestration Layer (UI → MusicDirectorService → Composition → Arrangement → Performance → Rendering → Mixing)
      const result = MusicDirectorService.getInstance().orchestrateAndGenerateFullSong({
        genre: selectedGenre,
        vocalBuffer: cleaned || targetBuffer || null,
        bpm: bpmResult.bpm,
        rootKey: bpmResult.key,
        scale: bpmResult.scale === 'minor' ? 'minor' : 'major',
        selectedInstruments,
        introSeconds: introLength,
        arrangementStyle,
        energyLevel,
        semanticAnalysis: semanticAnalysisResult,
        semanticArrangementSheet: currentProject?.semanticArrangementSheet || null,
        lyrics: lyricsToUse,
        project: currentProject
      });

      if (!isMounted) return;
      setGeneratedPlan(result.plan);
      setVocalSongMap(result.plan.vocalMap);
      onSetProjectTracks(result.tracks, result.totalDuration, result.plan);
      onUpdateProjectStage('arranging');
      setMusicGenStatus('ready');
      setActiveStep(5);
    };

    runAutomatedPipeline();

    return () => {
      isMounted = false;
      audioEngine.stopAllPlayback();
    };
  }, []);

  const toggleInstrument = (id: string) => {
    setSelectedInstruments(prev => 
      prev.includes(id) 
        ? prev.length > 1 ? prev.filter(item => item !== id) : prev
        : [...prev, id]
    );
  };

  // Maps arrangement feel & density to internal parameters
  const handleFeelChange = (feel: ArrangementFeel) => {
    setArrangementFeel(feel);
    if (feel === 'emotional') setArrangementStyle('emotional');
    else if (feel === 'cinematic') setArrangementStyle('cinematic');
    else if (feel === 'modern') setArrangementStyle('modern');
    else setArrangementStyle('romantic');
  };

  const handleDensityChange = (density: MusicalDensity) => {
    setMusicalDensity(density);
    if (density === 'light') setEnergyLevel('soft');
    else if (density === 'full') setEnergyLevel('powerful');
    else setEnergyLevel('balanced');
  };

  const handleGenerateAccompanimentAndIntro = async () => {
    setMusicGenStatus('generating');
    onUpdateProjectStage('generatingAccompaniment');
    audioEngine.stopAllPlayback();
    setIsPlayingPreview(false);

    // Realistic synthesis feedback
    await new Promise(r => setTimeout(r, 800));

    const targetVocal = cleanedAudioBuffer || vocalBuffer || currentProject?.tracks.find(t => t.type === 'vocal')?.audioBuffer || null;
    const bpm = detectedBpmKey?.bpm || currentProject?.bpm || 120;
    const key = detectedBpmKey?.key || currentProject?.key || 'C';
    const scale = (detectedBpmKey?.scale?.toLowerCase() === 'minor' || currentProject?.scale === 'minor') ? 'minor' : 'major';

    // Perform fresh lyrical semantic analysis if lyrics are present
    let semanticAnalysisResult: LyricalSemanticAnalysis | null = null;
    if (lyricsInput && lyricsInput.trim().length > 0) {
      semanticAnalysisResult = LanguageUnderstandingEngine.getInstance().analyzeLyrics(
        lyricsInput,
        selectedLanguage === 'auto' ? undefined : selectedLanguage,
        semanticMode,
        vocalSongMap || undefined
      );
    }

    // Canonical Orchestration Layer (UI → MusicDirectorService → Composition → Arrangement → Performance → Rendering → Mixing)
    const result = MusicDirectorService.getInstance().orchestrateAndGenerateFullSong({
      genre: selectedGenre,
      vocalBuffer: targetVocal,
      bpm,
      rootKey: key,
      scale,
      selectedInstruments,
      introSeconds: introLength,
      arrangementStyle,
      energyLevel,
      semanticAnalysis: semanticAnalysisResult,
      semanticArrangementSheet: currentProject?.semanticArrangementSheet || null,
      lyrics: lyricsInput || currentProject?.lyrics || '',
      project: currentProject
    });

    setGeneratedPlan(result.plan);
    setVocalSongMap(result.plan.vocalMap);
    onSetProjectTracks(result.tracks, result.totalDuration, result.plan);
    onUpdateProjectStage('arranging');
    setMusicGenStatus('ready');
    setActiveStep(5);
  };

  const handlePlayMasterMixPreview = () => {
    if (isPlayingPreview) {
      audioEngine.stopAllPlayback();
      setIsPlayingPreview(false);
      return;
    }

    if (currentProject && currentProject.tracks.length > 0) {
      setIsPlayingPreview(true);
      currentProject.tracks.forEach(track => {
        if (!track.isMuted && track.audioBuffer) {
          audioEngine.playBuffer(track.audioBuffer, () => {
            setIsPlayingPreview(false);
          });
        }
      });
    }
  };

  const handleModifySelection = () => {
    audioEngine.stopAllPlayback();
    setIsPlayingPreview(false);
    setMusicGenStatus('idle');
    setActiveStep(4);
  };

  return (
    <div className="space-y-4 pb-20">
      {/* Header */}
      <ProductionStageHeader
        currentScreen="pipeline"
        currentProject={currentProject}
        onNavigate={onNavigate}
        title="AI-Like Vocal-Aware Arranger"
        subtitle="Listens to vocal melody, lyrics semantics, phrases & pauses"
      />

      {/* Production Pipeline Steps Tracker */}
      <ProductionProgress currentScreen="pipeline" currentProject={currentProject} onNavigate={onNavigate} />

      {/* NEW: AI Music Director & Word-by-Word Orchestrator Callout */}
      <div className="bg-gradient-to-r from-purple-950/90 via-slate-900 to-indigo-950/90 border border-purple-500/40 rounded-2xl p-4 shadow-xl flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-purple-500/20 text-purple-300 border border-purple-500/40 flex items-center justify-center shrink-0">
            <Sparkles className="w-5 h-5 text-purple-400" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h4 className="text-xs font-bold text-white uppercase tracking-wide">AI Music Director & Lyric Brain</h4>
              <span className="px-1.5 py-0.2 bg-purple-500/20 text-purple-300 rounded text-[9px] font-bold border border-purple-500/30">
                Word-by-Word Score
              </span>
            </div>
            <p className="text-[11px] text-slate-300 mt-0.5">
              Deep semantic sentiment analysis, dynamic chord progressions & instrument drops.
            </p>
          </div>
        </div>

        <button
          onClick={() => onNavigate('director')}
          className="w-full sm:w-auto px-4 py-2.5 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white rounded-xl text-xs font-bold flex items-center justify-center space-x-1.5 shadow-lg shadow-purple-600/30 active:scale-95 transition-all shrink-0"
        >
          <span>Open Director Score</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Analysis Status Cards */}
      <div className="bg-slate-900 border border-slate-800/90 rounded-2xl p-4 space-y-3 shadow-xl">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center space-x-1.5">
            <Brain className="w-3.5 h-3.5 text-indigo-400" />
            <span>Deep Acoustic & Linguistic Intelligence</span>
          </h3>
          <span className="text-[10px] font-mono text-emerald-400 bg-emerald-950/60 border border-emerald-500/30 px-2 py-0.5 rounded-full">
            100% Offline Engine
          </span>
        </div>

        <div className="space-y-2">
          {/* Step 1: Vocal Cleanup */}
          <div className={`p-3 rounded-xl border flex items-center justify-between transition-all ${
            cleaningStatus === 'done'
              ? 'bg-emerald-950/20 border-emerald-500/30 text-emerald-300'
              : cleaningStatus === 'running'
              ? 'bg-indigo-950/40 border-indigo-500/40 text-indigo-200 animate-pulse'
              : 'bg-slate-950/40 border-slate-800 text-slate-400'
          }`}>
            <div className="flex items-center space-x-3">
              <div className={`p-2 rounded-lg ${cleaningStatus === 'done' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-slate-800 text-slate-400'}`}>
                <Sparkles className="w-4 h-4" />
              </div>
              <div>
                <div className="text-xs font-bold">1. Vocal Cleanup (7-Stage DSP)</div>
                <div className="text-[11px] text-slate-400">
                  {cleaningStatus === 'running' && 'Removing noise, DC offset & sibilance...'}
                  {cleaningStatus === 'done' && 'Cleaned take rendered (HPF, De-Esser, Soft Limiter)'}
                  {cleaningStatus === 'pending' && 'Queued for processing'}
                </div>
              </div>
            </div>
            {cleaningStatus === 'done' && (
              <span className="text-[11px] bg-emerald-500/20 text-emerald-400 font-bold px-2 py-0.5 rounded-full flex items-center space-x-1">
                <Check className="w-3 h-3" />
                <span>Cleaned</span>
              </span>
            )}
          </div>

          {/* Step 2: Pitch Detection */}
          <div className={`p-3 rounded-xl border flex items-center justify-between transition-all ${
            pitchStatus === 'done'
              ? 'bg-emerald-950/20 border-emerald-500/30 text-emerald-300'
              : pitchStatus === 'running'
              ? 'bg-indigo-950/40 border-indigo-500/40 text-indigo-200 animate-pulse'
              : 'bg-slate-950/40 border-slate-800 text-slate-400'
          }`}>
            <div className="flex items-center space-x-3">
              <div className={`p-2 rounded-lg ${pitchStatus === 'done' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-slate-800 text-slate-400'}`}>
                <Activity className="w-4 h-4" />
              </div>
              <div>
                <div className="text-xs font-bold">2. Melodic Pitch & Register Tracking</div>
                <div className="text-[11px] text-slate-400">
                  {pitchStatus === 'running' && 'Extracting fundamental frequency via YIN/Autocorrelation...'}
                  {pitchStatus === 'done' && `Dominant Note: ${detectedPitch?.noteName || 'A4'} (${detectedPitch?.frequency || 440} Hz) • ${Math.round((detectedPitch?.confidence || 0.9) * 100)}% Match`}
                  {pitchStatus === 'pending' && 'Awaiting pitch extraction'}
                </div>
              </div>
            </div>
            {pitchStatus === 'done' && (
              <span className="text-[11px] bg-emerald-500/20 text-emerald-400 font-bold px-2 py-0.5 rounded-full flex items-center space-x-1">
                <Check className="w-3 h-3" />
                <span>Detected</span>
              </span>
            )}
          </div>

          {/* Step 3: BPM & Key Tonality */}
          <div className={`p-3 rounded-xl border flex items-center justify-between transition-all ${
            bpmStatus === 'done'
              ? 'bg-emerald-950/20 border-emerald-500/30 text-emerald-300'
              : bpmStatus === 'running'
              ? 'bg-indigo-950/40 border-indigo-500/40 text-indigo-200 animate-pulse'
              : 'bg-slate-950/40 border-slate-800 text-slate-400'
          }`}>
            <div className="flex items-center space-x-3">
              <div className={`p-2 rounded-lg ${bpmStatus === 'done' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-slate-800 text-slate-400'}`}>
                <Music className="w-4 h-4" />
              </div>
              <div>
                <div className="text-xs font-bold">3. Tempo & Key Tonality</div>
                <div className="text-[11px] text-slate-400">
                  {bpmStatus === 'running' && 'Computing chromagram & transient tempo...'}
                  {bpmStatus === 'done' && `Tempo: ${detectedBpmKey?.bpm || 120} BPM • Tonality: ${detectedBpmKey?.key || 'C'} ${detectedBpmKey?.scale || 'Major'}`}
                  {bpmStatus === 'pending' && 'Awaiting tonality computation'}
                </div>
              </div>
            </div>
            {bpmStatus === 'done' && (
              <span className="text-[11px] bg-emerald-500/20 text-emerald-400 font-bold px-2 py-0.5 rounded-full flex items-center space-x-1">
                <Check className="w-3 h-3" />
                <span>{detectedBpmKey?.bpm || 120} BPM</span>
              </span>
            )}
          </div>
        </div>

        {/* Deep Vocal Insights Preview (Phrases, Gaps, Peaks) */}
        {vocalSongMap && (
          <div className="pt-2 border-t border-slate-800/80">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center">
              <div className="bg-slate-950/60 p-2 rounded-xl border border-slate-800">
                <div className="text-[10px] text-slate-400">Vocal Phrases</div>
                <div className="text-xs font-bold text-indigo-300">{vocalSongMap.phrases.length} Detected</div>
              </div>
              <div className="bg-slate-950/60 p-2 rounded-xl border border-slate-800">
                <div className="text-[10px] text-slate-400">Silence Gaps</div>
                <div className="text-xs font-bold text-emerald-300">{vocalSongMap.silenceGaps.length} Fills Available</div>
              </div>
              <div className="bg-slate-950/60 p-2 rounded-xl border border-slate-800">
                <div className="text-[10px] text-slate-400">Emotional Peaks</div>
                <div className="text-xs font-bold text-pink-300">{vocalSongMap.emotionalPeaks.length} High Moments</div>
              </div>
              <div className="bg-slate-950/60 p-2 rounded-xl border border-slate-800">
                <div className="text-[10px] text-slate-400">Harmonic Fit</div>
                <div className="text-xs font-bold text-amber-300">Vocal-First Scored</div>
              </div>
            </div>
          </div>
        )}

        {/* Realism Grade & Analog Master Enhancer Status */}
        <div className="pt-3 border-t border-slate-800/80">
          <div className="bg-gradient-to-r from-emerald-950/40 via-teal-950/30 to-indigo-950/40 border border-emerald-500/30 rounded-xl p-3">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center space-x-2">
                <div className="w-6 h-6 rounded-lg bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center">
                  <Shield className="w-3.5 h-3.5" />
                </div>
                <div>
                  <span className="text-xs font-bold text-white">Studio Realism Grade: </span>
                  <span className="text-xs font-extrabold text-emerald-400 font-mono">{realismMetrics.overallRealismPercentage}% Real Audio</span>
                </div>
              </div>
              <span className="text-[9px] bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-bold px-2 py-0.5 rounded-full">
                Broadcast Ready
              </span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 text-[10px]">
              <div className="bg-slate-900/80 px-2 py-1.5 rounded-lg border border-slate-800 text-slate-300 flex items-center space-x-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                <span>Human Groove: <b>{realismMetrics.humanGrooveFactor}%</b></span>
              </div>
              <div className="bg-slate-900/80 px-2 py-1.5 rounded-lg border border-slate-800 text-slate-300 flex items-center space-x-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-teal-400"></span>
                <span>Acoustic Body: <b>{realismMetrics.acousticWarmthScore}%</b></span>
              </div>
              <div className="bg-slate-900/80 px-2 py-1.5 rounded-lg border border-slate-800 text-slate-300 flex items-center space-x-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-indigo-400"></span>
                <span>Vocal Air Sheen: <b>{realismMetrics.vocalPurityScore}%</b></span>
              </div>
              <div className="bg-slate-900/80 px-2 py-1.5 rounded-lg border border-slate-800 text-slate-300 flex items-center space-x-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-purple-400"></span>
                <span>Stereo Depth: <b>{realismMetrics.stereoDepthScore}%</b></span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Multilingual & Semantic Intelligence Module (Phase 21) */}
      {activeStep >= 4 && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-4 shadow-xl">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div>
              <h3 className="text-sm font-bold text-white flex items-center space-x-2">
                <Globe className="w-4 h-4 text-emerald-400" />
                <span>Multilingual & Lyrical Intelligence</span>
              </h3>
              <p className="text-xs text-slate-400">
                Understands language, emotion & cultural meaning to sculpt authentic harmonies
              </p>
            </div>
            <button
              onClick={() => setShowLyricsEditor(!showLyricsEditor)}
              className="text-xs text-emerald-400 hover:text-emerald-300 font-bold bg-emerald-950/40 border border-emerald-500/30 px-2.5 py-1 rounded-lg flex items-center space-x-1 transition-all"
            >
              <FileText className="w-3.5 h-3.5" />
              <span>{showLyricsEditor ? 'Hide Lyrics' : lyricsInput ? 'Edit Lyrics' : 'Add Lyrics'}</span>
            </button>
          </div>

          {/* Quick Select Language & Semantic Mode */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Language Selector */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-300 flex items-center space-x-1.5">
                <Languages className="w-3.5 h-3.5 text-emerald-400" />
                <span>Language Recognition</span>
              </label>
              <select
                value={selectedLanguage}
                onChange={(e) => setSelectedLanguage(e.target.value as SupportedLanguage)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs font-bold text-slate-200 focus:outline-none focus:border-emerald-500 transition-all cursor-pointer"
              >
                {LANGUAGE_OPTIONS.map((opt) => (
                  <option key={opt.id} value={opt.id}>
                    {opt.label} ({opt.native})
                  </option>
                ))}
              </select>
            </div>

            {/* Semantic Mode Selector */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-300 flex items-center space-x-1.5">
                <Sparkles className="w-3.5 h-3.5 text-pink-400" />
                <span>Semantic Intelligence Mode</span>
              </label>
              <div className="grid grid-cols-3 gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800">
                {(['auto', 'conservative', 'expressive'] as SemanticIntelligenceMode[]).map((mode) => (
                  <button
                    key={mode}
                    onClick={() => setSemanticMode(mode)}
                    className={`py-1.5 text-[10px] font-bold rounded-lg capitalize transition-all ${
                      semanticMode === mode
                        ? 'bg-emerald-600 text-white shadow-sm'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    {mode}
                  </button>
                ))}
              </div>
            </div>

            {/* Phase 22 Engine Architecture Switcher (ML vs Fallback) */}
            <div className="space-y-1.5 sm:col-span-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-300 flex items-center space-x-1.5">
                  <Brain className="w-3.5 h-3.5 text-indigo-400" />
                  <span>Intelligence Backend Engine (Phase 22)</span>
                </label>
                <div className="flex items-center space-x-1.5">
                  {liveSemanticAnalysis?.activeEngine === 'ml' ? (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 flex items-center space-x-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                      <span>[ML] Neural Transformer</span>
                    </span>
                  ) : (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40 flex items-center space-x-1">
                      <span>[⚙️ Fallback] Phase 21 Rules</span>
                    </span>
                  )}
                  {isNeuralInferring && (
                    <span className="text-[9px] text-indigo-400 animate-pulse font-mono">Running ONNX...</span>
                  )}
                </div>
              </div>
              <div className="grid grid-cols-3 gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800">
                <button
                  onClick={() => setEngineExecutionMode('auto')}
                  className={`py-1.5 text-[10px] font-bold rounded-lg transition-all ${
                    engineExecutionMode === 'auto'
                      ? 'bg-indigo-600 text-white shadow-sm'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  ⚡ Auto (ML + Fallback)
                </button>
                <button
                  onClick={() => setEngineExecutionMode('ml')}
                  className={`py-1.5 text-[10px] font-bold rounded-lg transition-all ${
                    engineExecutionMode === 'ml'
                      ? 'bg-indigo-600 text-white shadow-sm'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  🧠 Force Neural ML (ONNX)
                </button>
                <button
                  onClick={() => setEngineExecutionMode('fallback')}
                  className={`py-1.5 text-[10px] font-bold rounded-lg transition-all ${
                    engineExecutionMode === 'fallback'
                      ? 'bg-amber-600 text-white shadow-sm'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  🛡️ Force Fallback (Zero-Lag)
                </button>
              </div>
            </div>
          </div>

          {/* Lyrics Input Box */}
          {showLyricsEditor && (
            <div className="space-y-2 pt-1 border-t border-slate-800/80">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-300 flex items-center space-x-1.5">
                  <FileText className="w-3.5 h-3.5 text-indigo-400" />
                  <span>Vocal Lyrics (Native Script or Romanized)</span>
                </label>
                {lyricsInput && (
                  <button
                    onClick={() => setLyricsInput('')}
                    className="text-[10px] text-slate-400 hover:text-rose-400 transition-colors"
                  >
                    Clear
                  </button>
                )}
              </div>
              <textarea
                value={lyricsInput}
                onChange={(e) => setLyricsInput(e.target.value)}
                placeholder="Paste lyrics in Hindi, Urdu, Marathi, Punjabi, Tamil, Telugu, English, Hinglish etc. (e.g. तेरे बिना ज़िन्दगी से कोई शिकवा तो नहीं...)"
                rows={3}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-all font-sans leading-relaxed"
              />

              {/* Sample Lyrics Quick-Fill Chips */}
              <div className="space-y-1">
                <div className="text-[10px] text-slate-400 font-semibold">Try sample lyrics:</div>
                <div className="flex flex-wrap gap-1.5">
                  {LYRIC_PRESETS.map((preset, idx) => (
                    <button
                      key={idx}
                      onClick={() => {
                        setLyricsInput(preset.text);
                        setSelectedLanguage(preset.lang.toLowerCase() as SupportedLanguage);
                      }}
                      className="text-[10px] px-2 py-1 rounded-lg bg-slate-950 hover:bg-slate-800 border border-slate-800 text-slate-300 hover:text-white transition-all flex items-center space-x-1"
                    >
                      <span className="text-emerald-400 font-bold">{preset.lang}:</span>
                      <span className="truncate max-w-[140px]">{preset.desc}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Live Semantic Intelligence Feedback Card */}
          {liveSemanticAnalysis && (
            <div className="p-3 bg-gradient-to-br from-slate-950 via-slate-950 to-indigo-950/30 rounded-xl border border-emerald-500/30 space-y-2.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <div className={`w-2 h-2 rounded-full ${liveSemanticAnalysis.isNeuralModel ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'}`} />
                  <span className="text-xs font-bold text-emerald-300 capitalize">
                    {liveSemanticAnalysis.detectedLanguage} ({liveSemanticAnalysis.scriptFamily} script)
                  </span>
                  <span className="text-[10px] text-slate-400 font-mono">
                    {liveSemanticAnalysis.isNeuralModel
                      ? `${Math.round((liveSemanticAnalysis.modelConfidence || 0.8) * 100)}% Neural Conf (${liveSemanticAnalysis.inferenceLatencyMs || 0}ms)`
                      : `${Math.round((liveSemanticAnalysis.languageConfidence || 0.8) * 100)}% Rule Match`}
                  </span>
                </div>
                <div className="flex items-center space-x-1.5">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-pink-400 bg-pink-950/50 border border-pink-500/30 px-2 py-0.5 rounded-full">
                    {liveSemanticAnalysis.dominantEmotion}
                  </span>
                </div>
              </div>

              {/* Neural Model Metadata Provenance */}
              <div className="text-[10px] text-slate-400 bg-slate-900/60 px-2.5 py-1 rounded-lg border border-slate-800 flex items-center justify-between">
                <span className="truncate">
                  Model: <span className="text-indigo-300 font-mono">{liveSemanticAnalysis.modelName || 'Xenova/paraphrase-multilingual-MiniLM-L12-v2'}</span>
                </span>
                <span className="font-mono text-slate-400 ml-2 shrink-0">
                  {liveSemanticAnalysis.semanticEmbedding ? `384-dim Tensor Active` : `Deterministic Lexicon`}
                </span>
              </div>

              {/* Emotional Breakdown & Cultural Context */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                <div className="bg-slate-900/80 p-2 rounded-lg border border-slate-800 text-left">
                  <div className="text-[10px] text-slate-400">Context</div>
                  <div className="text-[11px] font-bold text-indigo-300 truncate">
                    {liveSemanticAnalysis.culturalContext}
                  </div>
                </div>
                <div className="bg-slate-900/80 p-2 rounded-lg border border-slate-800 text-left">
                  <div className="text-[10px] text-slate-400">Valence</div>
                  <div className="text-[11px] font-bold text-emerald-300">
                    {liveSemanticAnalysis.valence >= 0 ? '+' : ''}{liveSemanticAnalysis.valence.toFixed(2)}
                  </div>
                </div>
                <div className="bg-slate-900/80 p-2 rounded-lg border border-slate-800 text-left">
                  <div className="text-[10px] text-slate-400">Arousal</div>
                  <div className="text-[11px] font-bold text-pink-300">
                    {Math.round(liveSemanticAnalysis.arousal * 100)}%
                  </div>
                </div>
                <div className="bg-slate-900/80 p-2 rounded-lg border border-slate-800 text-left">
                  <div className="text-[10px] text-slate-400">Phonetics</div>
                  <div className="text-[11px] font-bold text-amber-300">
                    {Math.round(liveSemanticAnalysis.phoneticFeatures.vowelOpenness * 100)}% Open
                  </div>
                </div>
              </div>

              {/* Sub-emotions & Phrase Summary */}
              {liveSemanticAnalysis.secondaryEmotions.length > 0 && (
                <div className="flex items-center space-x-1.5 text-[11px] text-slate-400">
                  <span>Sub-emotions:</span>
                  <div className="flex flex-wrap gap-1">
                    {liveSemanticAnalysis.secondaryEmotions.map((emo, eIdx) => (
                      <span key={eIdx} className="bg-slate-900 px-1.5 py-0.5 rounded text-[10px] text-slate-300 border border-slate-800 capitalize">
                        {emo}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Step 4: Musical Intelligence & Creative Arrangement Controls */}
      {activeStep >= 4 && musicGenStatus !== 'ready' && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-4 shadow-xl">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div>
              <h3 className="text-sm font-bold text-white flex items-center space-x-1.5">
                <Brain className="w-4 h-4 text-indigo-400" />
                <span>AI-Like Musical Understanding Engine</span>
              </h3>
              <p className="text-xs text-slate-400">Composes phrase-by-phrase around the singer's performance</p>
            </div>
            <span className="text-xs font-mono font-bold text-emerald-400 bg-emerald-950/50 border border-emerald-500/30 px-2 py-1 rounded-lg">
              {detectedBpmKey?.bpm || 120} BPM • {detectedBpmKey?.key || 'C'} {detectedBpmKey?.scale || 'Major'}
            </span>
          </div>

          {/* Core Phase 3 Controls: Musical Intelligence / Arrangement Feel / Musical Density */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {/* Control 1: Musical Intelligence */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-300 flex items-center space-x-1">
                <Brain className="w-3.5 h-3.5 text-indigo-400" />
                <span>Musical Intelligence</span>
              </label>
              <div className="grid grid-cols-3 gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800">
                {(['auto', 'detailed', 'manual'] as MusicalIntelligenceMode[]).map((mode) => (
                  <button
                    key={mode}
                    onClick={() => setIntelligenceMode(mode)}
                    className={`py-1.5 text-[11px] font-bold rounded-lg capitalize transition-all ${
                      intelligenceMode === mode
                        ? 'bg-indigo-600 text-white shadow-sm'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    {mode}
                  </button>
                ))}
              </div>
            </div>

            {/* Control 2: Arrangement Feel */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-300 flex items-center space-x-1">
                <Heart className="w-3.5 h-3.5 text-pink-400" />
                <span>Arrangement Feel</span>
              </label>
              <div className="grid grid-cols-4 gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800">
                {(['natural', 'emotional', 'cinematic', 'modern'] as ArrangementFeel[]).map((feel) => (
                  <button
                    key={feel}
                    onClick={() => handleFeelChange(feel)}
                    className={`py-1.5 text-[10px] font-bold rounded-lg capitalize transition-all ${
                      arrangementFeel === feel
                        ? 'bg-pink-600 text-white shadow-sm'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    {feel}
                  </button>
                ))}
              </div>
            </div>

            {/* Control 3: Musical Density */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-300 flex items-center space-x-1">
                <Waves className="w-3.5 h-3.5 text-amber-400" />
                <span>Musical Density</span>
              </label>
              <div className="grid grid-cols-3 gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800">
                {(['light', 'balanced', 'full'] as MusicalDensity[]).map((d) => (
                  <button
                    key={d}
                    onClick={() => handleDensityChange(d)}
                    className={`py-1.5 text-[11px] font-bold rounded-lg capitalize transition-all ${
                      musicalDensity === d
                        ? 'bg-amber-600 text-white shadow-sm'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    {d}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Musical Genre Selection */}
          <div className="space-y-1.5 pt-1">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-300 flex items-center space-x-1.5">
                <Music className="w-3.5 h-3.5 text-pink-400" />
                <span>Song Music Genre</span>
              </label>
              <span className="text-[11px] font-bold text-pink-300">{selectedGenre}</span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {[
                { id: 'Bollywood Romantic', name: 'Bollywood Romantic', icon: '❤️', style: 'romantic' as ArrangementStyle },
                { id: 'Bollywood Acoustic', name: 'Bollywood Acoustic', icon: '🎸', style: 'acoustic' as ArrangementStyle },
                { id: 'Punjabi Beats & Dhol', name: 'Punjabi Beats', icon: '🪘', style: 'dance' as ArrangementStyle },
                { id: 'Sufi Ghazal Fusion', name: 'Sufi Ghazal', icon: '🕊️', style: 'cinematic' as ArrangementStyle },
                { id: 'Pop Ballad', name: 'Pop Ballad', icon: '✨', style: 'modern' as ArrangementStyle },
                { id: 'Lo-Fi Chill & Rain', name: 'Lo-Fi Chill', icon: '☕', style: 'emotional' as ArrangementStyle },
                { id: 'Indian Classical Raga', name: 'Indian Classical', icon: '🪕', style: 'indian' as ArrangementStyle },
                { id: 'Rock Energy Anthem', name: 'Rock Anthem', icon: '⚡', style: 'dance' as ArrangementStyle },
              ].map((g) => {
                const isSelected = selectedGenre === g.id;
                return (
                  <button
                    key={g.id}
                    onClick={() => {
                      setSelectedGenre(g.id);
                      setArrangementStyle(g.style);
                    }}
                    className={`p-2.5 rounded-xl border text-left transition-all ${
                      isSelected
                        ? 'bg-gradient-to-br from-indigo-950/70 to-pink-950/70 border-pink-500 text-white shadow-md shadow-pink-500/10'
                        : 'bg-slate-950/50 border-slate-800 text-slate-400 hover:border-slate-700 hover:text-slate-300'
                    }`}
                  >
                    <div className="flex items-center space-x-1.5">
                      <span className="text-base">{g.icon}</span>
                      <div className="text-xs font-bold truncate">{g.name}</div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Detailed Mode: Shows Arrangement Style Options */}
          {intelligenceMode !== 'auto' && (
            <div className="space-y-1.5 pt-1">
              <label className="text-xs font-bold text-slate-300">Arrangement Style Preset</label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {ARRANGEMENT_STYLES.map((style) => (
                  <button
                    key={style.id}
                    onClick={() => setArrangementStyle(style.id)}
                    className={`p-2.5 rounded-xl border text-left transition-all ${
                      arrangementStyle === style.id
                        ? 'bg-pink-950/40 border-pink-500 text-white shadow-md shadow-pink-500/10'
                        : 'bg-slate-950/50 border-slate-800 text-slate-400 hover:border-slate-700'
                    }`}
                  >
                    <div className="text-xs font-bold truncate">{style.label}</div>
                    <div className="text-[10px] text-slate-400 line-clamp-2 mt-0.5">{style.desc}</div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Intro Duration Selection */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-300 flex items-center space-x-1.5">
                <Clock className="w-3.5 h-3.5 text-indigo-400" />
                <span>Song-Specific Musical Intro</span>
              </label>
              <span className="text-xs font-mono font-bold text-indigo-300">{introLength} Seconds</span>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {[10, 12, 15].map((sec) => (
                <button
                  key={sec}
                  onClick={() => setIntroLength(sec)}
                  className={`py-2 rounded-xl text-xs font-bold border transition-all ${
                    introLength === sec
                      ? 'bg-indigo-600 border-indigo-500 text-white shadow-md'
                      : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {sec}s Intro
                </button>
              ))}
            </div>
            <p className="text-[11px] text-slate-400">
              Derives melodic motifs directly from vocal key & tonality with 3-stage dynamic build.
            </p>
          </div>

          {/* Multi-Select Instruments */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-300">
                Active Instruments ({selectedInstruments.length} Selected)
              </label>
              <span className="text-[11px] text-indigo-400">Tap to toggle roles</span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {INSTRUMENT_OPTIONS.map((inst) => {
                const isSelected = selectedInstruments.includes(inst.id);
                return (
                  <button
                    key={inst.id}
                    onClick={() => toggleInstrument(inst.id)}
                    className={`p-2.5 rounded-xl border text-left flex items-center space-x-2 transition-all ${
                      isSelected
                        ? 'bg-indigo-950/40 border-indigo-500 text-white shadow-md shadow-indigo-500/10'
                        : 'bg-slate-950/50 border-slate-800/80 text-slate-400 hover:border-slate-700'
                    }`}
                  >
                    <span className="text-base">{inst.icon}</span>
                    <div className="truncate">
                      <div className="text-xs font-bold truncate">{inst.name}</div>
                      <div className="text-[10px] text-slate-400 truncate">
                        {isSelected ? inst.desc : 'Off'}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Primary Generation Action */}
          <button
            onClick={handleGenerateAccompanimentAndIntro}
            disabled={musicGenStatus === 'generating' || selectedInstruments.length === 0}
            className="w-full py-3.5 bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 hover:from-indigo-500 hover:to-pink-500 text-white rounded-xl font-bold text-xs flex items-center justify-center space-x-2 shadow-lg shadow-indigo-600/30 active:scale-[0.98] transition-all disabled:opacity-50"
          >
            {musicGenStatus === 'generating' ? (
              <>
                <Sparkles className="w-4 h-4 animate-spin" />
                <span>Composing Multilingual Vocal-Aware Arrangement...</span>
              </>
            ) : (
              <>
                <Brain className="w-4 h-4" />
                <span>Generate Vocal-Aware Song Arrangement</span>
              </>
            )}
          </button>
        </div>
      )}

      {/* Step 5: Music Generated - Arrangement Overview & Studio Mixer */}
      {musicGenStatus === 'ready' && (
        <div className="bg-slate-900 border border-emerald-500/30 rounded-2xl p-5 space-y-4 shadow-xl">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="p-2.5 rounded-xl bg-emerald-500/20 text-emerald-400">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white">Vocal-Aware Arrangement Composed</h3>
                <p className="text-xs text-slate-400">
                  {currentProject?.tracks?.length || selectedInstruments.length + 1} multi-track stems generated with phrase-by-phrase intelligence
                </p>
              </div>
            </div>

            {/* Modify & Regenerate Button */}
            <button
              onClick={handleModifySelection}
              className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-bold text-slate-200 flex items-center space-x-1.5 transition-all"
              title="Change instruments or settings and regenerate"
            >
              <RefreshCw className="w-3.5 h-3.5 text-indigo-400" />
              <span>Modify / Regenerate</span>
            </button>
          </div>

          {/* Lyrical Intelligence Summary (Phase 21) */}
          {generatedPlan?.semanticAnalysis && (
            <div className="p-3 bg-gradient-to-r from-emerald-950/40 via-indigo-950/40 to-pink-950/30 rounded-xl border border-emerald-500/30 space-y-2">
              <div className="text-xs font-bold text-emerald-300 flex items-center justify-between">
                <span className="flex items-center space-x-1.5">
                  <Globe className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Multilingual Semantic Intelligence</span>
                </span>
                <span className="text-[10px] uppercase font-mono text-pink-300 bg-pink-950/60 px-2 py-0.5 rounded-full border border-pink-500/30">
                  {generatedPlan.semanticAnalysis.dominantEmotion} • {generatedPlan.semanticAnalysis.detectedLanguage}
                </span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 text-center">
                <div className="bg-slate-900/80 p-2 rounded-lg border border-slate-800/80">
                  <div className="text-[10px] text-slate-400">Language Script</div>
                  <div className="text-xs font-bold text-slate-200 capitalize">
                    {generatedPlan.semanticAnalysis.scriptFamily}
                  </div>
                </div>
                <div className="bg-slate-900/80 p-2 rounded-lg border border-slate-800/80">
                  <div className="text-[10px] text-slate-400">Genre Context</div>
                  <div className="text-xs font-bold text-indigo-300">
                    {generatedPlan.semanticAnalysis.culturalContext}
                  </div>
                </div>
                <div className="bg-slate-900/80 p-2 rounded-lg border border-slate-800/80">
                  <div className="text-[10px] text-slate-400">Emotional Valence</div>
                  <div className="text-xs font-bold text-emerald-300">
                    {generatedPlan.semanticAnalysis.valence >= 0 ? '+' : ''}{generatedPlan.semanticAnalysis.valence.toFixed(2)}
                  </div>
                </div>
                <div className="bg-slate-900/80 p-2 rounded-lg border border-slate-800/80">
                  <div className="text-[10px] text-slate-400">Vocal Openness</div>
                  <div className="text-xs font-bold text-amber-300">
                    {Math.round(generatedPlan.semanticAnalysis.phoneticFeatures.vowelOpenness * 100)}%
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Structural Sections Breakdown */}
          {generatedPlan && generatedPlan.sections.length > 0 && (
            <div className="p-3 bg-slate-950/70 rounded-xl border border-slate-800 space-y-2">
              <div className="text-xs font-bold text-slate-300 flex items-center justify-between">
                <span>Song Structure Plan ({generatedPlan.sections.length} Sections)</span>
                <span className="text-[10px] text-pink-400 uppercase font-mono">{generatedPlan.style} • {generatedPlan.energy}</span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                {generatedPlan.sections.map((sec, idx) => (
                  <div key={idx} className="bg-slate-900/90 border border-slate-800 p-2 rounded-lg text-left">
                    <div className="text-[11px] font-bold text-slate-200 truncate">{sec.name}</div>
                    <div className="flex items-center justify-between text-[10px] text-slate-400 mt-1">
                      <span>{Math.round(sec.startTime)}s-{Math.round(sec.endTime)}s</span>
                      <span className="text-emerald-400 font-mono">D:{Math.round(sec.density * 100)}%</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-400">Generated Stems:</span>
              <span className="font-mono text-indigo-300 font-bold">
                {currentProject?.tracks?.map(t => t.name.split(' ')[0]).join(', ')}
              </span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-400">Tempo & Tonality:</span>
              <span className="font-mono text-emerald-400 font-bold">
                {detectedBpmKey?.bpm || 120} BPM • {detectedBpmKey?.key || 'C'} {detectedBpmKey?.scale || 'Major'}
              </span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-400">Musical Intelligence:</span>
              <span className="text-emerald-400 text-[11px] font-medium">
                Vocal-First Diatonic Harmony • Dynamic Call & Response • String Bloom Active
              </span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={handlePlayMasterMixPreview}
              className={`py-3 rounded-xl font-bold text-xs flex items-center justify-center space-x-1.5 border active:scale-[0.98] transition-all ${
                isPlayingPreview
                  ? 'bg-rose-600 border-rose-500 text-white'
                  : 'bg-slate-800 border-slate-700 hover:bg-slate-700 text-slate-200'
              }`}
            >
              {isPlayingPreview ? <Square className="w-4 h-4" /> : <Play className="w-4 h-4 text-emerald-400" />}
              <span>{isPlayingPreview ? 'Stop' : 'Preview Mix'}</span>
            </button>

            <button
              onClick={() => onNavigate('mixer')}
              className="py-3 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white rounded-xl font-bold text-xs flex items-center justify-center space-x-1.5 shadow-md shadow-indigo-600/30 active:scale-[0.98] transition-all"
            >
              <span>Open Studio Mixer</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
