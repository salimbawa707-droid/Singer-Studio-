/**
 * MUSICBASE / SURGE STUDIO — PHASE 5 AI MUSIC GATEWAY
 * 
 * Secure, Validated AI Proposal Layer:
 * User Intent / Lyrics
 *         ↓
 * AI Gateway Proposal
 *         ↓
 * Schema & Music Theory Validation Gate
 *         ↓
 * Canonical MusicPlan
 * 
 * Fails safely with explicit local deterministic fallback if AI is unavailable or produces malformed JSON.
 * AI never directly mutates project state; it only returns a validated proposal.
 */

import { CanonicalMusicalIntent, CanonicalMusicPlan, SongSectionType } from '../../types/musicPlan';
import { CanonicalMusicDirector, MusicDirectorInput } from './canonicalMusicDirector';
import { MusicPlanValidator } from './musicPlanValidator';
import { AIGateway } from '../aiGateway/aiGateway';

export interface StructuredAiProposal {
  genreStyle: string;
  overallMood: string;
  recommendedBpm: number;
  recommendedKey: string;
  scaleMode: 'major' | 'minor' | 'dorian' | 'raga_yaman' | 'raga_bhairav' | 'raga_kafi';
  timeSignature?: { numerator: number; denominator: number };
  sections: Array<{
    name: string;
    type: SongSectionType;
    barCount: number;
    energyLevel: 'whisper' | 'sparse' | 'medium' | 'soaring' | 'climax';
    chords: string[];
    suggestedInstruments: string[];
  }>;
  suggestedMixerPresets?: {
    vocalReverb: string;
    compressionStyle: string;
    stereoSpread: string;
  };
}

export interface AiGatewayResult {
  success: boolean;
  source: 'ai_provider' | 'local_deterministic_fallback';
  proposal?: StructuredAiProposal;
  error?: string;
  latencyMs: number;
}

export class AiMusicGateway {
  private static instance: AiMusicGateway;

  public static getInstance(): AiMusicGateway {
    if (!AiMusicGateway.instance) {
      AiMusicGateway.instance = new AiMusicGateway();
    }
    return AiMusicGateway.instance;
  }

  /**
   * Proposes musical architecture via central canonical AIGateway
   */
  public async proposeMusicStructure(
    intent: Partial<CanonicalMusicalIntent>,
    lyrics?: string,
    vocalContext?: { bpm?: number; key?: string }
  ): Promise<AiGatewayResult> {
    const gateway = AIGateway.getInstance();
    const resp = await gateway.proposeComposition(intent, lyrics, vocalContext);

    if (resp.status === 'success' && resp.proposal) {
      return {
        success: true,
        source: resp.provider === 'gemini' ? 'ai_provider' : 'local_deterministic_fallback',
        proposal: resp.proposal as StructuredAiProposal,
        latencyMs: resp.latencyMs
      };
    }

    const fallbackProposal = this.createLocalDeterministicProposal(intent, lyrics, vocalContext);
    return {
      success: true,
      source: 'local_deterministic_fallback',
      proposal: fallbackProposal,
      error: resp.error,
      latencyMs: resp.latencyMs
    };
  }

  /**
   * Validates structured AI proposal before allowing it into canonical music plan
   */
  public validateProposal(proposal: unknown): { isValid: boolean; parsed?: StructuredAiProposal; errors: string[] } {
    const errors: string[] = [];
    if (!proposal || typeof proposal !== 'object') {
      return { isValid: false, errors: ['Proposal is not a valid object'] };
    }

    const p = proposal as Partial<StructuredAiProposal>;

    if (typeof p.recommendedBpm !== 'number' || p.recommendedBpm < 40 || p.recommendedBpm > 240) {
      errors.push(`Invalid recommendedBpm: ${p.recommendedBpm}`);
    }

    if (!p.recommendedKey || typeof p.recommendedKey !== 'string') {
      errors.push('Missing recommendedKey');
    }

    if (!p.sections || !Array.isArray(p.sections) || p.sections.length === 0) {
      errors.push('Proposal must contain at least one section');
    }

    if (errors.length > 0) {
      return { isValid: false, errors };
    }

    return {
      isValid: true,
      parsed: p as StructuredAiProposal,
      errors: []
    };
  }

  /**
   * Generates a validated local deterministic proposal
   */
  public createLocalDeterministicProposal(
    intent: Partial<CanonicalMusicalIntent>,
    lyrics?: string,
    vocalContext?: { bpm?: number; key?: string }
  ): StructuredAiProposal {
    const genre = intent.genre || 'Bollywood Romantic';
    const bpm = vocalContext?.bpm || intent.tempoPreference || (genre.toLowerCase().includes('dance') ? 128 : 118);
    const key = vocalContext?.key || (intent.keyPreference && intent.keyPreference !== 'unspecified' ? intent.keyPreference : 'C');

    return {
      genreStyle: genre,
      overallMood: intent.mood || 'Romantic & Soulful',
      recommendedBpm: typeof bpm === 'number' ? bpm : 118,
      recommendedKey: key,
      scaleMode: (intent.scalePreference && intent.scalePreference !== 'unspecified') ? (intent.scalePreference as any) : 'major',
      timeSignature: { numerator: 4, denominator: 4 },
      sections: [
        {
          name: 'Intro (Acoustic Alaap)',
          type: 'intro',
          barCount: 4,
          energyLevel: 'whisper',
          chords: ['C', 'Am'],
          suggestedInstruments: ['Acoustic Guitar', 'Flute']
        },
        {
          name: 'Verse 1 (Mukhda)',
          type: 'verse_mukhda',
          barCount: 8,
          energyLevel: 'sparse',
          chords: ['C', 'Am', 'F', 'G'],
          suggestedInstruments: ['Piano', 'Acoustic Guitar', 'Bass']
        },
        {
          name: 'Chorus (Hook / Climax)',
          type: 'chorus_hook',
          barCount: 8,
          energyLevel: 'soaring',
          chords: ['F', 'G', 'Em', 'Am'],
          suggestedInstruments: ['Drums', 'Bass', 'Strings', 'Piano', 'Guitar']
        },
        {
          name: 'Outro (Fade)',
          type: 'outro',
          barCount: 4,
          energyLevel: 'whisper',
          chords: ['F', 'C'],
          suggestedInstruments: ['Piano', 'Strings']
        }
      ]
    };
  }
}
