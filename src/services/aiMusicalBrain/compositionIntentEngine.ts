/**
 * SURGE STUDIO — PHASE 7 COMPOSITION INTENT ENGINE
 * 
 * Translates UMR + Section Hierarchy + Generative Musical Memory into
 * explicit, section-by-section musical composition intentions.
 * 
 * 100% Offline-First, Deterministic, Zero Math.random().
 */

import { UnifiedMusicalRepresentation, StructuralSectionHypothesis } from '../../types/musicalBrain';
import { GenerativeMusicalMemory } from './generativeMemory';
import { CompositionIntent, CompositionalSectionType, RhythmicCharacterType, HarmonicMovementType } from '../../types/generativeComposition';
import { InstrumentKey } from '../../types/generativeArrangement';

function clamp(val: number, min = 0.0, max = 1.0): number {
  if (Number.isNaN(val) || !Number.isFinite(val)) return min;
  return Math.max(min, Math.min(max, val));
}

export class CompositionIntentEngine {
  private static instance: CompositionIntentEngine;

  public static getInstance(): CompositionIntentEngine {
    if (!CompositionIntentEngine.instance) {
      CompositionIntentEngine.instance = new CompositionIntentEngine();
    }
    return CompositionIntentEngine.instance;
  }

  /**
   * Generates composition intentions across all sections in the song
   */
  public generateSongCompositionIntents(
    umr: UnifiedMusicalRepresentation,
    memory?: GenerativeMusicalMemory
  ): CompositionIntent[] {
    const mem = memory || new GenerativeMusicalMemory();
    const sections = umr.sections || [];
    const intents: CompositionIntent[] = [];

    const totalBeats = umr.metadata.totalBeats || 64;
    const raga = umr.indianProfile?.ragaCandidates?.[0]?.ragaName || 'Standard Diatonic';

    for (let i = 0; i < sections.length; i++) {
      const sec = sections[i];
      const repCount = mem.getSectionRepetitionCount(sec.category);
      const varMult = mem.getVariationMultiplier(sec.category);

      const mappedType = this.mapSectionCategoryToCompositionalType(sec.category);
      const intent = this.buildSectionCompositionIntent(sec, mappedType, umr, repCount, varMult, i, sections.length);
      intents.push(intent);

      mem.recordSection(sec.category, intent.melodicDensity);
    }

    return intents;
  }

  private mapSectionCategoryToCompositionalType(category: StructuralSectionHypothesis['category']): CompositionalSectionType {
    switch (category) {
      case 'intro': return 'intro';
      case 'verse_mukhda': return 'verse';
      case 'pre_chorus': return 'pre_chorus';
      case 'chorus_hook': return 'chorus';
      case 'interlude': return 'interlude';
      case 'verse_antara': return 'antara';
      case 'bridge': return 'bridge';
      case 'chorus_climax': return 'climax';
      case 'outro': return 'outro';
      default: return 'verse';
    }
  }

  private buildSectionCompositionIntent(
    section: StructuralSectionHypothesis,
    type: CompositionalSectionType,
    umr: UnifiedMusicalRepresentation,
    repetitionCount: number,
    variationMultiplier: number,
    sectionIndex: number,
    totalSections: number
  ): CompositionIntent {
    const isIndian = Boolean(umr.indianProfile?.ragaCandidates?.length || umr.beatTrajectories?.ornamentationDensity?.length);
    const progressRatio = totalSections > 1 ? sectionIndex / (totalSections - 1) : 0.5;

    let primaryIdea = '';
    let supportingIdea = '';
    let tension = 0.3;
    let release = 0.7;
    let rhythmicChar: RhythmicCharacterType = 'steady_pulse';
    let harmonicMovement: HarmonicMovementType = 'diatonic_flow';
    let density = section.instrumentationTargetDensity || 0.5;
    let register: 'low' | 'mid' | 'high' | 'ultra_high' = 'mid';
    let instrumentation: InstrumentKey[] = ['piano', 'bass', 'drums'];
    let motifUsage: CompositionIntent['motifUsage'] = 'thematic_statement';
    let callResponseStrategy: CompositionIntent['callResponseStrategy'] = 'none';
    let transitionStrategy: CompositionIntent['transitionStrategy'] = 'smooth_swell';
    let climaxStrategy: CompositionIntent['climaxStrategy'] = 'none';

    switch (type) {
      case 'intro':
        primaryIdea = 'Establish tonal grounding, tanpura/pedal root, and hint thematic melodic motif seeds';
        supportingIdea = 'Subtle textural wash with sparse percussion pulses';
        tension = 0.2;
        release = 0.8;
        rhythmicChar = isIndian ? 'rubato_expressive' : 'sparse_floating';
        harmonicMovement = 'tonic_pedal';
        density = 0.25;
        register = 'mid';
        instrumentation = isIndian ? ['sitar', 'harmonium', 'flute'] : ['piano', 'strings', 'guitar'];
        motifUsage = 'seed_establishment';
        callResponseStrategy = 'none';
        transitionStrategy = 'smooth_swell';
        break;

      case 'verse':
      case 'mukhda':
        primaryIdea = 'Support vocal storytelling with clear frequency headroom and sympathetic counter-motifs';
        supportingIdea = 'Gentle rhythmic groove and foundational bass anchoring roots';
        tension = 0.3 + (repetitionCount * 0.08);
        release = 0.7;
        rhythmicChar = isIndian ? 'syncopated_groove' : 'steady_pulse';
        harmonicMovement = 'diatonic_flow';
        density = clamp(0.4 * variationMultiplier, 0.2, 0.7);
        register = 'mid';
        instrumentation = isIndian ? ['tabla', 'harmonium', 'flute', 'bass'] : ['piano', 'guitar', 'bass', 'drums'];
        motifUsage = repetitionCount === 0 ? 'thematic_statement' : 'development';
        callResponseStrategy = 'short_pickup';
        transitionStrategy = 'rhythmic_fill';
        break;

      case 'pre_chorus':
        primaryIdea = 'Drive forward harmonic and rhythmic momentum with ascending pitch contours';
        supportingIdea = 'Accelerating percussion subdivisions and rising string/sitar arpeggios';
        tension = 0.65;
        release = 0.35;
        rhythmicChar = 'driving_dynamic';
        harmonicMovement = 'suspended_build';
        density = 0.65;
        register = 'high';
        instrumentation = isIndian ? ['tabla', 'sitar', 'flute', 'bass', 'harmonium'] : ['drums', 'bass', 'piano', 'strings', 'guitar'];
        motifUsage = 'development';
        callResponseStrategy = 'short_pickup';
        transitionStrategy = isIndian ? 'tihai_drop' : 'tutti_hit';
        break;

      case 'chorus':
      case 'hook':
        primaryIdea = 'Maximum thematic memorability with fully orchestrated vocal unison and hook motifs';
        supportingIdea = 'Driving full rhythm section and rich multi-octave harmonic voicings';
        tension = 0.5 + (repetitionCount * 0.05);
        release = 0.8;
        rhythmicChar = 'driving_dynamic';
        harmonicMovement = 'cadence_arrival';
        density = clamp(0.85 * variationMultiplier, 0.6, 1.0);
        register = 'high';
        instrumentation = isIndian ? ['tabla', 'sitar', 'flute', 'harmonium', 'bass', 'strings'] : ['drums', 'bass', 'piano', 'guitar', 'strings'];
        motifUsage = repetitionCount === 0 ? 'thematic_statement' : 'climax_fusion';
        callResponseStrategy = 'two_bar_phrase';
        transitionStrategy = 'tutti_hit';
        break;

      case 'interlude':
        primaryIdea = 'Foreground instrumental virtuosity and develop vocal motifs into instrumental variations';
        supportingIdea = 'Polyphonic dialogues between flute, sitar, or piano';
        tension = 0.45;
        release = 0.55;
        rhythmicChar = isIndian ? 'syncopated_groove' : 'steady_pulse';
        harmonicMovement = 'modal_color';
        density = 0.6;
        register = 'high';
        instrumentation = isIndian ? ['flute', 'sitar', 'tabla', 'harmonium'] : ['piano', 'guitar', 'strings', 'bass', 'drums'];
        motifUsage = 'development';
        callResponseStrategy = 'polyphonic_interlock';
        transitionStrategy = 'smooth_swell';
        break;

      case 'antara':
        primaryIdea = 'Higher melodic register exploration with modal variations and emotive phrasing';
        supportingIdea = 'Deep bass counter-melodies and responsive percussion accents';
        tension = 0.55;
        release = 0.6;
        rhythmicChar = 'syncopated_groove';
        harmonicMovement = 'chromatic_passing';
        density = 0.65;
        register = 'high';
        instrumentation = isIndian ? ['harmonium', 'tabla', 'sitar', 'flute', 'bass'] : ['piano', 'strings', 'bass', 'drums', 'guitar'];
        motifUsage = 'development';
        callResponseStrategy = 'two_bar_phrase';
        transitionStrategy = 'rhythmic_fill';
        break;

      case 'climax':
        primaryIdea = 'Culmination of song emotional arc combining highest dynamic energy and unified thematic motifs';
        supportingIdea = 'All instrument voices interacting in dense harmonic, rhythmic, and melodic sync';
        tension = 0.95;
        release = 0.4;
        rhythmicChar = isIndian ? 'tihai_cadence' : 'driving_dynamic';
        harmonicMovement = 'cadence_arrival';
        density = 0.95;
        register = 'ultra_high';
        instrumentation = isIndian ? ['tabla', 'sitar', 'flute', 'harmonium', 'bass', 'strings', 'drums'] : ['drums', 'bass', 'piano', 'guitar', 'strings'];
        motifUsage = 'climax_fusion';
        callResponseStrategy = 'polyphonic_interlock';
        transitionStrategy = isIndian ? 'tihai_drop' : 'tutti_hit';
        climaxStrategy = 'maximum_polyphony';
        break;

      case 'outro':
        primaryIdea = 'Cadential resolution and gentle thematic dissipation back to root tonic peace';
        supportingIdea = 'Tapering rhythm into solo instrumental resonance and natural reverb decay';
        tension = 0.15;
        release = 0.95;
        rhythmicChar = 'sparse_floating';
        harmonicMovement = 'tonic_pedal';
        density = 0.3;
        register = 'low';
        instrumentation = isIndian ? ['tanpura', 'flute', 'harmonium'] as any : ['piano', 'strings', 'guitar'];
        motifUsage = 'dissolution';
        callResponseStrategy = 'none';
        transitionStrategy = 'subtle_fade';
        break;
    }

    return {
      intentId: `intent_${section.startBeat}`,
      sectionId: `sec_${section.startBeat}`,
      sectionType: type,
      startBeat: section.startBeat,
      endBeat: section.endBeat,
      durationBeats: section.durationBeats || (section.endBeat - section.startBeat),
      primaryMusicalIdea: primaryIdea,
      supportingIdea,
      tensionLevel: clamp(tension),
      releaseLevel: clamp(release),
      rhythmicCharacter: rhythmicChar,
      melodicDensity: clamp(density),
      harmonicMovement,
      primaryRegister: register,
      targetInstrumentation: instrumentation,
      motifUsage,
      callResponseStrategy,
      transitionStrategy,
      climaxStrategy
    };
  }
}
