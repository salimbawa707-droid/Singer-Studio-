// ============================================================================
// AI MUSIC DIRECTOR & SEMANTIC LYRIC ORCHESTRATOR TYPES
// Models Word-by-Word Emotion, Musical Dynamics, Chords & Raga Alignments
// ============================================================================

export type DynamicVolume = 'pp' | 'p' | 'mp' | 'mf' | 'f' | 'ff';

export interface LyricLineAnalysis {
  lineIndex: number;
  text: string;
  sectionName: string; // 'Intro' | 'Mukhda / Verse 1' | 'Chorus / Hook' | 'Antara' | 'Bridge / Alaap' | 'Climax' | 'Outro'
  emotion: string; // e.g. 'Intimate Love / Pyar', 'Deep Melancholy / Dard', 'Sufi Ecstasy', 'High Anthem'
  intensity: number; // 1 to 10 scale
  recommendedChord: string; // e.g. 'Am', 'Fmaj7', 'G7', 'Cadd9', 'Dm9'
  ragaMood?: string; // e.g. 'Raga Yaman (Romantic)', 'Raga Bhairav (Morning Serenity)', 'Raga Kafi (Spring Joy)'
  dynamicLevel: DynamicVolume;
  instrumentation: string[]; // e.g. ['Acoustic Guitar', 'Soft Strings', 'Flute Interlude']
  vocalAccentWord?: string; // specific word where musical hit / crash / drop occurs
  productionNote: string; // music director's instructions to the mix/band
}

export interface SongArrangementSection {
  name: string;
  type: 'intro' | 'verse' | 'pre_chorus' | 'chorus' | 'interlude' | 'antara' | 'bridge' | 'climax' | 'outro';
  barCount: number;
  energyLevel: 'whisper' | 'sparse' | 'medium' | 'soaring' | 'climax';
  drumGroove: string; // e.g. 'Subtle Kick & Shaker', 'Full 4-on-Floor Pop Beat', 'Traditional Keherwa Tabla'
  lines: LyricLineAnalysis[];
}

export interface SongArrangementSheet {
  songTitle: string;
  genreStyle: string;
  overallMood: string;
  recommendedBpm: number;
  recommendedKey: string;
  scaleMode: 'major' | 'minor' | 'dorian' | 'raga_yaman' | 'raga_bhairav' | 'raga_kafi';
  producerDirectorSummary: string;
  sections: SongArrangementSection[];
  suggestedMixerPresets: {
    vocalReverb: 'plate' | 'hall' | 'chamber' | 'dry';
    compressionStyle: 'optical_warm' | 'fet_punchy' | 'transparent';
    stereoSpread: 'wide_cinematic' | 'intimate_center';
  };
  // Advanced Omni Director metadata
  source?: 'xai_grok' | 'gemini_ai' | 'local_deterministic' | string;
  provider?: string;
  modelUsed?: string;
  latencyMs?: number;
}
