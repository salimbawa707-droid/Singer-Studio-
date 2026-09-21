/**
 * MUSICBASE / SURGE STUDIO
 * UMR to Musical Intent Converter (Phase 5 - Prompt 2)
 *
 * Deterministically translates rich Multi-Dimensional UMR state into actionable
 * 10-dimensional MusicalIntent structures per beat and phrase.
 *
 * 100% Offline-First, Deterministic, Sample-Accurate & Safe Fallback Guaranteed.
 */

import { UnifiedMusicalRepresentation, SwaraName } from '../../types/musicalBrain';
import { MusicalIntent } from '../../types/generativeDecision';

export class MusicalIntentConverter {
  /**
   * Derives a full MusicalIntent at a specific beat from UMR.
   */
  public static deriveIntentAtBeat(
    umr: UnifiedMusicalRepresentation,
    beat: number,
    sectionType?: string
  ): MusicalIntent {
    const totalBeats = Math.max(1, umr.metadata.totalBeats || 1);
    const safeBeat = Math.max(0, Math.min(totalBeats - 0.001, beat));
    const intBeat = Math.floor(safeBeat);

    // 1. Section Identification
    const activeSection = umr.sections.find(s => safeBeat >= s.startBeat && safeBeat < s.endBeat);
    const resolvedSectionRole = (sectionType || activeSection?.category || 'verse_mukhda') as MusicalIntent['sectionRole'];

    // 2. Active Phrase & Role
    const activePhrase = umr.phrases.find(p => safeBeat >= p.startBeat && safeBeat <= p.endBeat);
    let phraseRole: MusicalIntent['phraseRole'] = 'background_hold';
    if (activePhrase) {
      if (resolvedSectionRole === 'chorus_hook' || resolvedSectionRole === 'chorus_climax') {
        phraseRole = 'hook_statement';
      } else if (activePhrase.id % 2 === 1) {
        phraseRole = 'antecedent';
      } else {
        phraseRole = 'consequent';
      }
      if (activePhrase.isHookClimax) {
        phraseRole = 'cadential_climax';
      }
    } else if (resolvedSectionRole === 'interlude') {
      phraseRole = 'interlude_solo';
    }

    // 3. Melodic & Rhythmic Density
    const melodicDensity = umr.beatTrajectories?.vocalDensity?.[intBeat] ?? 
      (activePhrase ? 0.6 : 0.0);
    const rhythmicDensity = umr.rhythmicProfile?.rhythmicDensityByBeat?.[intBeat] ?? 0.5;

    // 4. Harmonic Tension from UMR Trajectory
    const harmonicTension = umr.beatTrajectories?.harmonicTension?.[intBeat] ?? 
      (phraseRole === 'antecedent' ? 0.7 : 0.3);

    // 5. Silence Opportunity & Fill Potential
    const activeGap = umr.silenceGaps.find(g => safeBeat >= g.startBeat && safeBeat < g.endBeat);
    const silenceOpportunity: MusicalIntent['silenceOpportunity'] = {
      isGap: !!activeGap,
      durationBeats: activeGap ? activeGap.duration : 0,
      fillPotential: activeGap ? (activeGap.duration >= 2 ? 0.85 : 0.4) : 0,
      suggestedResponseRole: activeGap
        ? (activeGap.recommendedResponseInstrument === 'flute' ? 'flute_flourish' :
           activeGap.recommendedResponseInstrument === 'strings' ? 'strings_swell' :
           activeGap.recommendedResponseInstrument === 'piano' ? 'piano_turn' : 'guitar_riff')
        : 'rest'
    };

    // 6. Microtonal Ornament Activity
    const ornamentsAtBeat = umr.indianProfile?.ornaments?.filter(
      o => safeBeat >= o.startBeat && safeBeat <= o.endBeat
    ) || [];
    const hasMeend = ornamentsAtBeat.some(o => o.type === 'meend');
    const hasMurki = ornamentsAtBeat.some(o => o.type === 'murki');
    const hasGamak = ornamentsAtBeat.some(o => o.type === 'gamak');
    const ornamentIntensity = ornamentsAtBeat.length > 0
      ? Math.min(1.0, ornamentsAtBeat.length * 0.4)
      : (umr.beatTrajectories?.ornamentationDensity?.[intBeat] ?? 0.0);

    // 7. Indian / Modal Context
    const tonicSa = ((umr.indianProfile?.tonicSaMidi ?? 0) % 12 + 12) % 12;
    const ragaName = umr.indianProfile?.primaryRaga?.value?.ragaName || 'Bilawal';
    const dominantSwaras: SwaraName[] = umr.indianProfile?.swaraHistogram
      ? Object.entries(umr.indianProfile.swaraHistogram)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 5)
          .map(([s]) => s as SwaraName)
      : ['S', 'R', 'G', 'P', 'D'];

    // 8. Climax & Release State
    let climaxReleaseState: MusicalIntent['climaxReleaseState'] = 'steady';
    const isNearPeak = umr.expressiveProfile?.emotionalPeaks?.some(
      p => Math.abs(p.beat - safeBeat) <= 2
    );
    if (resolvedSectionRole === 'chorus_climax' || isNearPeak) {
      climaxReleaseState = 'climax';
    } else if (resolvedSectionRole === 'pre_chorus') {
      climaxReleaseState = 'pre_build';
    } else if (resolvedSectionRole === 'outro') {
      climaxReleaseState = 'release';
    }

    // 9. Emotional State & Energy
    const expressiveDim = umr.beatTrajectories?.expressiveDimensions?.[intBeat];
    let emotionalState: MusicalIntent['emotionalState'] = 'intimate';
    let energyDynamic = 0.5;

    if (expressiveDim) {
      energyDynamic = (expressiveDim.calm_vs_intense + expressiveDim.intimate_vs_powerful) * 0.5;
      if (expressiveDim.calm_vs_intense > 0.75) {
        emotionalState = 'climactic';
      } else if (expressiveDim.intimate_vs_powerful > 0.6) {
        emotionalState = 'energetic';
      } else if (expressiveDim.stable_vs_tense > 0.65) {
        emotionalState = 'building';
      } else if (expressiveDim.bright_vs_dark < 0.35) {
        emotionalState = 'melancholic';
      } else if (expressiveDim.calm_vs_intense < 0.3) {
        emotionalState = 'calm';
      } else {
        emotionalState = 'reflective';
      }
    } else {
      if (resolvedSectionRole === 'chorus_hook' || resolvedSectionRole === 'chorus_climax') {
        emotionalState = 'climactic';
        energyDynamic = 0.85;
      } else if (resolvedSectionRole === 'pre_chorus') {
        emotionalState = 'building';
        energyDynamic = 0.7;
      } else {
        emotionalState = 'intimate';
        energyDynamic = 0.4;
      }
    }

    return {
      emotionalState,
      phraseRole,
      melodicDensity: Math.max(0, Math.min(1.0, melodicDensity)),
      rhythmicDensity: Math.max(0, Math.min(1.0, rhythmicDensity)),
      harmonicTension: Math.max(0, Math.min(1.0, harmonicTension)),
      silenceOpportunity,
      ornamentActivity: {
        hasMeend,
        hasMurki,
        hasGamak,
        intensity: Math.max(0, Math.min(1.0, ornamentIntensity))
      },
      sectionRole: resolvedSectionRole,
      indianModalContext: {
        tonicSa,
        ragaName,
        dominantSwaras,
        isModalFocus: ragaName !== 'Bilawal',
        vadiSwara: umr.indianProfile?.primaryRaga?.value?.vadiSwara,
        samvadiSwara: umr.indianProfile?.primaryRaga?.value?.samvadiSwara
      },
      climaxReleaseState,
      energyDynamic: Math.max(0, Math.min(1.0, energyDynamic))
    };
  }
}
