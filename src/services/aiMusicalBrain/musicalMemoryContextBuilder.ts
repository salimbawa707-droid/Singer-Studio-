/**
 * MUSICBASE / SURGE STUDIO
 * Musical Memory Context Builder (Phase 11)
 *
 * Formats canonical SongIdentity and MusicalMemory state into structured context
 * objects for consumption by AI Gateway, Composition, and Arrangement engines.
 * 
 * Ensures:
 * 1. Strict user intent priority (Absolute Rule #1)
 * 2. Complete absence of parallel state (Absolute Rule #2)
 * 3. Non-exposure of internal system tokens or API keys
 * 4. Filtering of historical rejected suggestions to prevent repeat errors
 */

import { SongIdentity, MusicalMemory, GenerationMode } from '../../types/songIdentityMemory';

export interface MusicalMemoryAIContext {
  songId: string;
  projectId: string;
  generationMode: GenerationMode;
  identitySummary: {
    title: string;
    key: string;
    scale: string;
    bpm: number;
    meter: string;
    genre: string;
    mood: string;
  };
  activeLocks: Array<{ lockKey: string; lockedValue: any }>;
  userDecisions: {
    acceptedMotifIds: string[];
    rejectedMotifIds: string[];
    userApprovedChanges: string[];
  };
  rejectedSuggestions: string[];
  vocalProfile: {
    tessitura: string;
    contour: string;
    rangeMidi: { min: number; max: number };
  };
  coreMotifs: Array<{
    motifId: string;
    pitches: number[];
    isVocalHook: boolean;
    importanceScore: number;
    preservationPriority: string;
  }>;
  contextPromptBlock: string;
}

export class MusicalMemoryContextBuilder {
  /**
   * Builds an AI Context object suitable for prompt inclusion or structured AI proposals.
   */
  public static buildAIContext(
    identity?: SongIdentity | null,
    memory?: MusicalMemory | null,
    generationMode: GenerationMode = 'PRESERVE_IDENTITY',
    userPromptOverride?: string
  ): MusicalMemoryAIContext {
    const songId = identity?.songId || 'song_default';
    const projectId = identity?.projectId || 'proj_default';

    const title = identity?.title?.value || 'Untitled';
    const key = identity?.key?.value || identity?.harmonicIdentity?.tonicRoot || 'C';
    const scale = identity?.scale?.value || identity?.harmonicIdentity?.scaleMode || 'major';
    const bpm = identity?.tempo?.value || identity?.rhythmicIdentity?.bpm || 120;
    const meter = identity?.timeSignature?.value || identity?.rhythmicIdentity?.meter || '4/4';
    const genre = identity?.genre?.value || 'Pop';
    const mood = identity?.mood?.value || identity?.emotionalDynamicSignature?.mood || 'Uplifting';

    const activeLocks: Array<{ lockKey: string; lockedValue: any }> = [];
    if (identity?.locks) {
      Object.entries(identity.locks).forEach(([k, lock]) => {
        if (lock.isLocked) {
          activeLocks.push({ lockKey: k, lockedValue: lock.lockedValue });
        }
      });
    }

    const acceptedMotifIds = memory?.acceptedMotifIds || [];
    const rejectedMotifIds = memory?.rejectedMotifIds || [];
    const userApprovedChanges = memory?.userApprovedChanges || [];
    const rejectedSuggestions = (memory?.rejectedSuggestions || []).map(s => s.suggestionText);

    const vocalProfile = {
      tessitura: identity?.vocalMelodicSignature?.tessitura || 'MID',
      contour: identity?.vocalMelodicSignature?.contourArchetype || 'WAVE',
      rangeMidi: {
        min: identity?.vocalMelodicSignature?.pitchRangeMidi?.min || 60,
        max: identity?.vocalMelodicSignature?.pitchRangeMidi?.max || 72
      }
    };

    const coreMotifs = (identity?.importantMotifs || []).map(m => ({
      motifId: m.motifId,
      pitches: m.pitches,
      isVocalHook: m.isVocalHook,
      importanceScore: m.importanceScore,
      preservationPriority: m.preservationPriority
    }));

    // Construct human-readable prompt block for LLM prompts
    const promptLines: string[] = [
      `[SONG IDENTITY CONTEXT - Mode: ${generationMode}]`,
      `Song: "${title}" | Key: ${key} ${scale} | Tempo: ${bpm} BPM (${meter}) | Genre: ${genre}`,
      `Vocal Tessitura: ${vocalProfile.tessitura} (Range: MIDI ${vocalProfile.rangeMidi.min}-${vocalProfile.rangeMidi.max})`
    ];

    if (activeLocks.length > 0) {
      promptLines.push(`ACTIVE LOCKS (MUST PRESERVE): ${activeLocks.map(l => `${l.lockKey}=${JSON.stringify(l.lockedValue)}`).join(', ')}`);
    }

    if (coreMotifs.length > 0) {
      promptLines.push(`CORE MOTIFS: ${coreMotifs.map(m => `${m.motifId} [${m.pitches.join('-')}] priority:${m.preservationPriority}`).join('; ')}`);
    }

    if (rejectedSuggestions.length > 0) {
      promptLines.push(`PREVIOUSLY REJECTED BY USER (DO NOT REPEAT): ${rejectedSuggestions.slice(-3).join('; ')}`);
    }

    if (userPromptOverride) {
      promptLines.push(`USER OVERRIDE INSTRUCTION: "${userPromptOverride}"`);
    }

    return {
      songId,
      projectId,
      generationMode,
      identitySummary: { title, key, scale, bpm, meter, genre, mood },
      activeLocks,
      userDecisions: { acceptedMotifIds, rejectedMotifIds, userApprovedChanges },
      rejectedSuggestions,
      vocalProfile,
      coreMotifs,
      contextPromptBlock: promptLines.join('\n')
    };
  }
}
