// ============================================================================
// AI MUSIC DIRECTOR & SEMANTIC SONG ORCHESTRATION SERVICE
// Canonical Orchestration Layer:
// User/UI → MusicDirector → Composition → SongIdentity → Arrangement → Performance → Rendering → Mixing
// ============================================================================

import { SongArrangementSheet, SongArrangementSection, LyricLineAnalysis, DynamicVolume } from '../types/musicDirector';
import { StudioProject, ProjectTrack } from '../types/audio';
import { 
  ArrangementPlan, 
  ArrangementStyle, 
  EnergyLevel, 
  IntelligentArrangementEngine 
} from './intelligentArrangementEngine';
import { MusicalBrainEngine } from './aiMusicalBrain/musicalBrainEngine';
import { SongIdentityEngine } from './aiMusicalBrain/songIdentityEngine';
import { SongIdentity } from '../types/songIdentityMemory';
import { GenerativeMusicalMemory } from './aiMusicalBrain/generativeMemory';
import { GenerativeCompositionEngine } from './aiMusicalBrain/generativeCompositionEngine';
import { ComprehensiveCompositionPlan } from '../types/generativeComposition';
import { ProfessionalSongArrangementEngine } from './aiMusicalBrain/professionalSongArrangementEngine';
import { GenerativeArrangementRealizationEngine } from './aiMusicalBrain/generativeArrangementRealizationEngine';
import { MacroSongArrangement } from '../types/professionalSongArrangement';
import { UnifiedMusicalRepresentation } from '../types/musicalBrain';
import { LanguageUnderstandingEngine, LyricalSemanticAnalysis, SupportedLanguage } from './languageUnderstandingEngine';
import { WebAudioEngine } from './webAudioEngine';
import { CanonicalMusicDirector } from './musicIntelligence/canonicalMusicDirector';
import { CanonicalMusicPlan, CanonicalArrangement, CanonicalMusicalIntent } from '../types/musicPlan';
import { ProjectManager } from './projectManager';

export interface OrchestratedGenerationOptions {
  genre: string;
  vocalBuffer: AudioBuffer | null;
  bpm?: number;
  rootKey?: string;
  scale?: 'major' | 'minor';
  selectedInstruments?: string[];
  introSeconds?: number;
  arrangementStyle?: ArrangementStyle;
  energyLevel?: EnergyLevel;
  semanticAnalysis?: LyricalSemanticAnalysis | null;
  semanticArrangementSheet?: SongArrangementSheet | null;
  lyrics?: string;
  project?: StudioProject | null;
  seed?: number;
}

export interface OrchestratedGenerationResult {
  tracks: ProjectTrack[];
  totalDuration: number;
  masterMixBuffer: AudioBuffer;
  plan: ArrangementPlan;
  umr?: UnifiedMusicalRepresentation;
  songIdentity?: SongIdentity;
  compositionPlan?: ComprehensiveCompositionPlan;
  macroArrangement?: MacroSongArrangement;
  directorSheet?: SongArrangementSheet;
  canonicalMusicPlan?: CanonicalMusicPlan;
  canonicalArrangement?: CanonicalArrangement;
}

export class MusicDirectorService {
  private static instance: MusicDirectorService;

  public static getInstance(): MusicDirectorService {
    if (!MusicDirectorService.instance) {
      MusicDirectorService.instance = new MusicDirectorService();
    }
    return MusicDirectorService.instance;
  }

  /**
   * CANONICAL ORCHESTRATION PIPELINE:
   * UI → MusicDirectorService → Composition → Arrangement → Performance → Rendering → Mixing
   */
  public orchestrateAndGenerateFullSong(options: OrchestratedGenerationOptions): OrchestratedGenerationResult {
    const audioEngine = WebAudioEngine.getInstance();
    const ctx = audioEngine.getContext();

    const bpm = options.bpm || options.project?.bpm || 120;
    const rootKey = options.rootKey || options.project?.key || 'C';
    const scale = options.scale || (options.project?.scale === 'minor' ? 'minor' : 'major');
    const genre = options.genre || options.project?.genre || 'Bollywood Romantic';
    const introSeconds = typeof options.introSeconds === 'number' ? options.introSeconds : (options.project?.introDurationSeconds || 12);
    const arrangementStyle = options.arrangementStyle || (options.project?.arrangementStyle as ArrangementStyle) || 'romantic';
    const energyLevel = options.energyLevel || (options.project?.energyLevel as EnergyLevel) || 'balanced';
    const rawSelectedInstruments = options.selectedInstruments && options.selectedInstruments.length > 0
      ? options.selectedInstruments
      : (options.project?.selectedInstruments && options.project.selectedInstruments.length > 0
          ? options.project.selectedInstruments
          : ['Piano', 'Acoustic Guitar', 'Bass', 'Drums', 'Strings']);

    // 1. Map Genre to arrangement style & Indian instrumentation
    let mappedStyle = arrangementStyle;
    const lowerGenre = genre.toLowerCase();
    if (lowerGenre.includes('acoustic')) mappedStyle = 'acoustic';
    else if (lowerGenre.includes('emotional') || lowerGenre.includes('lo-fi')) mappedStyle = 'emotional';
    else if (lowerGenre.includes('dance') || lowerGenre.includes('pop')) mappedStyle = 'dance';
    else if (lowerGenre.includes('cinematic') || lowerGenre.includes('orchestral') || lowerGenre.includes('sufi')) mappedStyle = 'cinematic';
    else if (lowerGenre.includes('indian') || lowerGenre.includes('bollywood') || lowerGenre.includes('classical')) mappedStyle = 'indian';
    else if (lowerGenre.includes('modern')) mappedStyle = 'modern';

    const activeInstruments = [...rawSelectedInstruments];
    if (mappedStyle === 'indian' || options.semanticAnalysis?.dominantEmotion === 'devotion') {
      if (!activeInstruments.includes('Tabla')) activeInstruments.push('Tabla');
      if (!activeInstruments.includes('Sitar')) activeInstruments.push('Sitar');
      if (!activeInstruments.includes('Harmonium')) activeInstruments.push('Harmonium');
    }

    // 2. Semantic Analysis & Director Sheet resolution
    let effectiveSheet = options.semanticArrangementSheet || options.project?.semanticArrangementSheet || null;
    const effectiveLyrics = options.lyrics || options.project?.lyrics || '';
    if (!effectiveSheet && effectiveLyrics.trim().length > 0) {
      effectiveSheet = this.generateLocalDeterministicArrangement(effectiveLyrics, options.project);
    }

    let effectiveSemanticAnalysis = options.semanticAnalysis || null;
    if (!effectiveSemanticAnalysis && effectiveLyrics.trim().length > 0) {
      const explicitLang = (options.project?.selectedLanguage && options.project.selectedLanguage !== 'auto')
        ? (options.project.selectedLanguage as SupportedLanguage)
        : undefined;
      effectiveSemanticAnalysis = LanguageUnderstandingEngine.getInstance().analyzeLyrics(
        effectiveLyrics,
        explicitLang,
        (options.project?.semanticMode as any) || 'auto'
      );
    }

    // 3. Deep Musical Understanding & Unified Musical Representation (UMR)
    const brainEngine = MusicalBrainEngine.getInstance();
    const effectiveBuffer = options.vocalBuffer || ctx.createBuffer(1, Math.floor(ctx.sampleRate * 10), ctx.sampleRate);
    const umr = brainEngine.analyzeAndBuildUMRSync(effectiveBuffer, {
      explicitBpm: bpm,
      explicitKey: rootKey
    });

    // 4. Song Identity & Generative Musical Memory
    const memory = new GenerativeMusicalMemory();
    const songIdentityEngine = SongIdentityEngine.getInstance();
    const songIdentity = songIdentityEngine.extractSongIdentity(umr, undefined, undefined, options.project?.id || 'song_identity_001');

    // 5. AI Generative Composition Brain
    const compositionEngine = GenerativeCompositionEngine.getInstance();
    const compositionPlan = compositionEngine.composeFullSong(umr, memory);

    // 6. Professional Song Arrangement
    const professionalArrangementEngine = ProfessionalSongArrangementEngine.getInstance();
    const macroArrangement = professionalArrangementEngine.generateFullSongArrangement(umr, compositionPlan, memory);

    const realizationEngine = GenerativeArrangementRealizationEngine.getInstance();
    const generativeArrangementPlan = realizationEngine.realizeArrangement(umr, memory);

    // 7. Micro-Structure Planning & Human Performance Integration
    const arrangementEngine = IntelligentArrangementEngine.getInstance();
    const plan = arrangementEngine.planArrangement(
      options.vocalBuffer,
      bpm,
      rootKey,
      scale,
      introSeconds,
      mappedStyle,
      energyLevel,
      null,
      activeInstruments,
      effectiveSemanticAnalysis,
      effectiveSheet
    );

    // Attach generative layers to arrangement plan
    plan.generativeArrangementPlan = generativeArrangementPlan;

    // 8. Instrument Rendering & Performance Synthesis
    const { tracks, totalDuration } = arrangementEngine.generateArrangementStems(
      plan,
      activeInstruments,
      options.vocalBuffer,
      ctx
    );

    // 9. Canonical Music Intelligence & Arrangement (Phase 5 Single Authority)
    const canonicalDirector = CanonicalMusicDirector.getInstance();
    const canonicalIntent: Partial<CanonicalMusicalIntent> = {
      genre,
      mood: options.semanticAnalysis?.dominantEmotion || 'Romantic & Uplifting',
      energyLevel,
      tempoPreference: bpm,
      keyPreference: rootKey,
      scalePreference: scale,
      instrumentPreferences: activeInstruments
    };

    const canonicalMusicPlan = canonicalDirector.createMusicPlan({
      intent: canonicalIntent,
      project: options.project,
      pitchAnalysis: options.project?.detectedPitch,
      bpmKeyAnalysis: options.project?.detectedBpmKey,
      vocalSongMap: options.project?.vocalSongMap,
      lyrics: effectiveLyrics,
      seed: options.seed
    });

    const canonicalArrangement = canonicalDirector.realizeArrangement(canonicalMusicPlan, options.seed);

    if (options.project) {
      const pm = ProjectManager.getInstance();
      pm.setCanonicalMusicPlan(options.project.id, canonicalMusicPlan);
      pm.setCanonicalArrangement(options.project.id, canonicalArrangement);
    }

    // 10. Intelligent Mixing & Mastering
    const mixed = audioEngine.mixMasterStems(
      tracks,
      totalDuration,
      ctx,
      plan.vocalMap.rmsEnvelopeByBeat || [],
      plan.timeline
    );

    return {
      tracks: mixed.tracks,
      totalDuration: mixed.totalDuration,
      masterMixBuffer: mixed.masterMixBuffer,
      plan,
      umr,
      songIdentity,
      compositionPlan,
      macroArrangement,
      directorSheet: effectiveSheet || undefined,
      canonicalMusicPlan,
      canonicalArrangement
    };
  }

  /**
   * Orchestrated Accompaniment Preview Generator
   */
  public orchestrateAccompanimentPreview(
    genre: string,
    durationSec: number = 30,
    bpm: number = 120,
    rootKey: string = 'C',
    instruments: string[] = ['Piano', 'Acoustic Guitar', 'Bass', 'Drums', 'Strings']
  ): AudioBuffer {
    const arrangementEngine = IntelligentArrangementEngine.getInstance();
    const score = arrangementEngine.generatePreviewScore(genre, durationSec, bpm, rootKey);
    return WebAudioEngine.getInstance().renderStructuredScore(score, durationSec);
  }

  /**
   * Request full semantic lyric analysis and musical orchestration from Gemini API.
   * Gracefully falls back to local neural-heuristic generator if server is offline.
   */
  public async analyzeLyricsAndOrchestrate(
    lyrics: string,
    project?: StudioProject | null
  ): Promise<SongArrangementSheet> {
    const cleanLyrics = lyrics.trim();
    if (!cleanLyrics) {
      throw new Error('Please enter song lyrics for the AI Music Director to analyze.');
    }

    // Online-first Omni system. Only skip cloud if user explicitly chose Offline Only.
    const forceOffline = typeof window !== 'undefined'
      && localStorage.getItem('surge_hybrid_mode') === 'offline';

    if (forceOffline) {
      console.log('[MusicDirector] User forced Offline Only — using local engines');
      return this.generateLocalDeterministicArrangement(cleanLyrics, project);
    }

    try {
      const customXaiKey = typeof window !== 'undefined' ? (localStorage.getItem('surge_xai_key') || '') : '';
      const customGeminiKey = typeof window !== 'undefined' ? (localStorage.getItem('surge_gemini_key') || '') : '';
      let customKeysPool: any[] = [];
      if (typeof window !== 'undefined') {
        try {
          const raw = localStorage.getItem('surge_custom_api_keys');
          if (raw) customKeysPool = JSON.parse(raw);
        } catch {
          customKeysPool = [];
        }
      }

      const response = await fetch('/api/music-director/analyze', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(customXaiKey ? { 'x-xai-key': customXaiKey } : {}),
          ...(customGeminiKey ? { 'x-gemini-key': customGeminiKey } : {}),
        },
        body: JSON.stringify({
          lyrics: cleanLyrics,
          genre: project?.genre || 'Bollywood Romantic / Contemporary Fusion',
          currentKey: project?.key || 'C',
          currentBpm: project?.bpm || 120,
          mood: (project as any)?.mood || undefined,
          detectedKey: project?.key || undefined,
          detectedBpm: project?.bpm || undefined,
          customXaiKey: customXaiKey || undefined,
          customGeminiKey: customGeminiKey || undefined,
          customKeysPool: customKeysPool.length > 0 ? customKeysPool : undefined,
          vocalContext: project
            ? `Project: ${project.title || 'Untitled'} | Genre: ${project.genre || 'Bollywood'} | Key: ${project.key || 'C'} | BPM: ${project.bpm || 120}`
            : undefined,
        }),
      });

      if (response.ok) {
        const data: SongArrangementSheet = await response.json();
        console.log('[MusicDirector] Hybrid AI arrangement received, source:', (data as any).source || 'gemini');
        return data;
      } else {
        console.warn('AI Server endpoint returned error, engaging deterministic Music Director fallback...');
        return this.generateLocalDeterministicArrangement(cleanLyrics, project);
      }
    } catch (err) {
      console.warn('Network unreachable, engaging local Music Director fallback:', err);
      return this.generateLocalDeterministicArrangement(cleanLyrics, project);
    }
  }

  /**
   * Deterministic local fallback generator mapping lyrics to chords, emotions, and dynamics.
   */
  public generateLocalDeterministicArrangement(
    lyrics: string,
    project?: StudioProject | null
  ): SongArrangementSheet {
    const lines = lyrics
      .split('\n')
      .map(l => l.trim())
      .filter(l => l.length > 0);

    const rootKey = project?.key || 'C';
    const bpm = project?.bpm || 118;
    const genre = project?.genre || 'Pop Ballad';

    // Heuristic chord map for key
    const chordPalette = this.getDiatonicPalette(rootKey);
    const sections: SongArrangementSection[] = [];

    let currentSectionName = 'Mukhda / Verse 1';
    let currentSectionType: SongArrangementSection['type'] = 'verse';
    let currentLines: LyricLineAnalysis[] = [];
    let lineIdxCounter = 0;

    const getSectionEnergy = (secType: string): SongArrangementSection['energyLevel'] => {
      if (secType === 'chorus' || secType === 'climax') return 'soaring';
      if (secType === 'intro' || secType === 'outro') return 'whisper';
      return 'medium';
    };

    const getSectionGroove = (secType: string): string => {
      if (secType === 'chorus' || secType === 'climax') return 'Full Driving Groove + Tabla Theka';
      if (secType === 'intro' || secType === 'outro') return 'Subtle Atmospheric Pad & Chimes';
      return 'Subtle Hi-Hat & Soft Kick';
    };

    lines.forEach((lineText) => {
      // Check for section headers like [Verse 1], [Chorus], [Intro]
      if (lineText.startsWith('[') && lineText.endsWith(']')) {
        if (currentLines.length > 0) {
          sections.push({
            name: currentSectionName,
            type: currentSectionType,
            barCount: Math.max(4, currentLines.length * 2),
            energyLevel: getSectionEnergy(currentSectionType),
            drumGroove: getSectionGroove(currentSectionType),
            lines: currentLines,
          });
          currentLines = [];
        }

        const rawHeader = lineText.slice(1, -1).toLowerCase();
        if (rawHeader.includes('intro') || rawHeader.includes('alaap')) {
          currentSectionName = 'Intro Alaap';
          currentSectionType = 'intro';
        } else if (rawHeader.includes('chorus') || rawHeader.includes('hook') || rawHeader.includes('refrain')) {
          currentSectionName = 'Chorus / Refrain';
          currentSectionType = 'chorus';
        } else if (rawHeader.includes('antara') || rawHeader.includes('verse 2')) {
          currentSectionName = 'Antara / Verse 2';
          currentSectionType = 'antara';
        } else if (rawHeader.includes('bridge') || rawHeader.includes('interlude')) {
          currentSectionName = 'Bridge / Interlude';
          currentSectionType = 'bridge';
        } else if (rawHeader.includes('outro') || rawHeader.includes('ending')) {
          currentSectionName = 'Outro Refrain';
          currentSectionType = 'outro';
        } else {
          currentSectionName = lineText.slice(1, -1);
          currentSectionType = 'verse';
        }
        return;
      }

      lineIdxCounter++;
      const { emotion, intensity, dynamic, accentWord } = this.analyzeLineSentiment(lineText);
      const chord = chordPalette[(lineIdxCounter - 1) % chordPalette.length];

      currentLines.push({
        lineIndex: lineIdxCounter,
        text: lineText,
        sectionName: currentSectionName,
        emotion,
        intensity,
        recommendedChord: chord,
        ragaMood: 'Raga Yaman (Shringara & Kalyan)',
        dynamicLevel: dynamic,
        instrumentation:
          currentSectionType === 'chorus'
            ? ['Grand Piano', 'Strings Ensemble', 'Acoustic Guitar Strumming', 'Tabla / Drums']
            : ['Fingerpicked Acoustic Guitar', 'Soft Pad', 'Flute Counter-Melody'],
        vocalAccentWord: accentWord,
        productionNote: `Accentuate '${accentWord}' on beat 1; maintain ${dynamic} dynamic curve for vocal intimacy.`,
      });
    });

    // Push final pending section
    if (currentLines.length > 0) {
      sections.push({
        name: currentSectionName,
        type: currentSectionType,
        barCount: Math.max(4, currentLines.length * 2),
        energyLevel: getSectionEnergy(currentSectionType),
        drumGroove: getSectionGroove(currentSectionType),
        lines: currentLines,
      });
    }

    return {
      songTitle: project?.title || 'Studio Composition',
      genreStyle: genre,
      overallMood: 'Soulful, Expressive & Melodically Rich',
      recommendedBpm: bpm,
      recommendedKey: rootKey,
      scaleMode: 'major',
      producerDirectorSummary: `Musical arrangement orchestrated in the Key of ${rootKey} Major at ${bpm} BPM. Verse sections prioritize spacious acoustic intimacy to keep vocals center-stage, rising into lush harmonic swells and full rhythm during the Chorus/Refrain.`,
      suggestedMixerPresets: {
        vocalReverb: 'plate',
        compressionStyle: 'optical_warm',
        stereoSpread: 'wide_cinematic',
      },
      sections,
    };
  }

  private analyzeLineSentiment(text: string): {
    emotion: string;
    intensity: number;
    dynamic: DynamicVolume;
    accentWord: string;
  } {
    const lower = text.toLowerCase();
    const words = text.split(/\s+/).filter(w => w.length > 0);
    const accentWord = words[Math.floor(words.length / 2)] || words[0] || 'Vocal';

    if (
      lower.includes('dard') ||
      lower.includes('aah') ||
      lower.includes('khoya') ||
      lower.includes('tears') ||
      lower.includes('alone') ||
      lower.includes('cry') ||
      lower.includes('mushkil')
    ) {
      return { emotion: 'Deep Melancholy / Dard', intensity: 7, dynamic: 'mf', accentWord };
    }

    if (
      lower.includes('bin') ||
      lower.includes('jaan') ||
      lower.includes('pyaar') ||
      lower.includes('sanamm') ||
      lower.includes('love') ||
      lower.includes('heart') ||
      lower.includes('saathi')
    ) {
      return { emotion: 'Intimate Romance / Pyar', intensity: 8, dynamic: 'f', accentWord };
    }

    if (
      lower.includes('maula') ||
      lower.includes('chaap') ||
      lower.includes('tilak') ||
      lower.includes('rang') ||
      lower.includes('naina')
    ) {
      return { emotion: 'Sufi Ecstasy / Devotion', intensity: 9, dynamic: 'ff', accentWord };
    }

    if (
      lower.includes('dhoom') ||
      lower.includes('challa') ||
      lower.includes('nach') ||
      lower.includes('shine') ||
      lower.includes('dance')
    ) {
      return { emotion: 'High-Energy Anthem', intensity: 9, dynamic: 'ff', accentWord };
    }

    return { emotion: 'Lyrical Narrative', intensity: 5, dynamic: 'mp', accentWord };
  }

  private getDiatonicPalette(rootKey: string): string[] {
    const palettes: Record<string, string[]> = {
      C: ['C', 'G/B', 'Am', 'F', 'Em', 'Dm7', 'G7', 'Cmaj7'],
      D: ['D', 'A/C#', 'Bm', 'G', 'F#m', 'Em7', 'A7', 'Dmaj7'],
      E: ['E', 'B/D#', 'C#m', 'A', 'G#m', 'F#m7', 'B7', 'Emaj7'],
      F: ['F', 'C/E', 'Dm', 'Bb', 'Am', 'Gm7', 'C7', 'Fmaj7'],
      G: ['G', 'D/F#', 'Em', 'C', 'Bm', 'Am7', 'D7', 'Gmaj7'],
      A: ['A', 'E/G#', 'F#m', 'D', 'C#m', 'Bm7', 'E7', 'Amaj7'],
      B: ['B', 'F#/A#', 'G#m', 'E', 'D#m', 'C#m7', 'F#7', 'Bmaj7'],
    };

    return palettes[rootKey] || palettes['C'];
  }
}
