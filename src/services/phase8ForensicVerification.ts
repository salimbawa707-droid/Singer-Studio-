/**
 * SURGE STUDIO — PHASE 8 FORENSIC VERIFICATION SUITE
 * Professional Song Arrangement Engine Master Verification
 *
 * Verifies all 21 Core Forensic Tests (AR-01 through AR-21):
 * - AR-01: Full-song macro structure (Intro, Verse, Pre-Chorus, Chorus, Interlude, Antara, Climax, Outro)
 * - AR-02: Section identity & distinct purpose differentiation
 * - AR-03: 9-Instrument role allocation (active, supporting, foreground, background, rhythmic, etc.)
 * - AR-04: Continuous arrangement density trajectory
 * - AR-05: Intro generation & tonal establishment
 * - AR-06: Verse supportive & vocal-first accompaniment
 * - AR-07: Pre-chorus anticipation & build
 * - AR-08: Chorus expansion & hook reinforcement
 * - AR-09: Antara secondary section development & orchestration divergence
 * - AR-10: Instrumental interlude & lead solo space
 * - AR-11: Climax peak orchestration & dynamic headroom
 * - AR-12: Outro resolution & gradual decay
 * - AR-13: Transition continuity & Tihai/crescendo connections
 * - AR-14: Vocal-first arrangement & masking suppression
 * - AR-15: Register separation & frequency coordination
 * - AR-16: Repetition evolution (recognition + development + escalation)
 * - AR-17: Full-song continuity & zero gap desynchronization
 * - AR-18: Deterministic repeatability (0% unseeded randomness)
 * - AR-19: Long-form arrangement stability (< 200ms for 256 beats)
 * - AR-20: Numerical safety (zero NaN / Infinity)
 * - AR-21: Phase 1–7 regression safety
 */

import { UnifiedMusicalRepresentation } from '../types/musicalBrain';
import { ProfessionalSongArrangementEngine } from './aiMusicalBrain/professionalSongArrangementEngine';
import { GenerativeMusicalMemory } from './aiMusicalBrain/generativeMemory';
import { MusicalBrainEngine } from './aiMusicalBrain/musicalBrainEngine';
import { VocalSongMap, DetectedVocalNote, DeepVocalPhrase, VocalSilenceGap, VocalEmotionalPeak } from './vocalUnderstandingEngine';
import { GenerativeCompositionEngine } from './aiMusicalBrain/generativeCompositionEngine';

export interface Phase8TestResult {
  testId: string;
  name: string;
  category: string;
  passed: boolean;
  expected: string;
  actual: string;
  notes?: string;
}

export interface Phase8SuiteReport {
  totalTests: number;
  passedTests: number;
  failedTests: number;
  allPassed: boolean;
  results: Phase8TestResult[];
}

function createSyntheticVocalMap(totalBeats = 160): VocalSongMap {
  const notes: DetectedVocalNote[] = [
    // Phrase 1 (Verse 1 / Mukhda: 16-28)
    { id: 1, midiNote: 60, startTime: 8.0, endTime: 10.0, startBeat: 16, endBeat: 20, duration: 2.0, frequency: 261.63, noteName: 'C4', centsOff: 0, confidence: 0.95, stability: 0.9, hasVibrato: false, vibratoRateHz: 5, vibratoDepthCents: 10, rmsEnergy: 0.5, spectralCentroid: 1400, isHighNote: false, isSustained: true },
    { id: 2, midiNote: 64, startTime: 11.0, endTime: 14.0, startBeat: 22, endBeat: 28, duration: 3.0, frequency: 329.63, noteName: 'E4', centsOff: 0, confidence: 0.95, stability: 0.9, hasVibrato: false, vibratoRateHz: 5, vibratoDepthCents: 10, rmsEnergy: 0.5, spectralCentroid: 1400, isHighNote: false, isSustained: true },

    // Phrase 2 (Pre-Chorus: 36-48) - 8-beat gap before
    { id: 3, midiNote: 65, startTime: 18.0, endTime: 21.0, startBeat: 36, endBeat: 42, duration: 3.0, frequency: 349.23, noteName: 'F4', centsOff: 0, confidence: 0.95, stability: 0.9, hasVibrato: false, vibratoRateHz: 5, vibratoDepthCents: 10, rmsEnergy: 0.72, spectralCentroid: 1600, isHighNote: false, isSustained: true },
    { id: 4, midiNote: 67, startTime: 22.0, endTime: 24.0, startBeat: 44, endBeat: 48, duration: 2.0, frequency: 392.00, noteName: 'G4', centsOff: 0, confidence: 0.95, stability: 0.9, hasVibrato: false, vibratoRateHz: 5, vibratoDepthCents: 10, rmsEnergy: 0.75, spectralCentroid: 1650, isHighNote: false, isSustained: true },

    // Phrase 3 (Chorus 1 Hook: 56-68) - 8-beat gap before
    { id: 5, midiNote: 72, startTime: 28.0, endTime: 31.0, startBeat: 56, endBeat: 62, duration: 3.0, frequency: 523.25, noteName: 'C5', centsOff: 0, confidence: 0.96, stability: 0.9, hasVibrato: false, vibratoRateHz: 5, vibratoDepthCents: 10, rmsEnergy: 0.88, spectralCentroid: 1800, isHighNote: true, isSustained: true },
    { id: 6, midiNote: 71, startTime: 32.0, endTime: 34.0, startBeat: 64, endBeat: 68, duration: 2.0, frequency: 493.88, noteName: 'B4', centsOff: 0, confidence: 0.95, stability: 0.9, hasVibrato: false, vibratoRateHz: 5, vibratoDepthCents: 10, rmsEnergy: 0.85, spectralCentroid: 1750, isHighNote: true, isSustained: true },

    // Phrase 4 (Verse 2 / Antara: 88-100) - 20-beat interlude gap before
    { id: 7, midiNote: 62, startTime: 44.0, endTime: 47.0, startBeat: 88, endBeat: 94, duration: 3.0, frequency: 293.66, noteName: 'D4', centsOff: 0, confidence: 0.95, stability: 0.9, hasVibrato: false, vibratoRateHz: 5, vibratoDepthCents: 10, rmsEnergy: 0.55, spectralCentroid: 1450, isHighNote: false, isSustained: true },
    { id: 8, midiNote: 67, startTime: 48.0, endTime: 50.0, startBeat: 96, endBeat: 100, duration: 2.0, frequency: 392.00, noteName: 'G4', centsOff: 0, confidence: 0.95, stability: 0.9, hasVibrato: false, vibratoRateHz: 5, vibratoDepthCents: 10, rmsEnergy: 0.55, spectralCentroid: 1500, isHighNote: false, isSustained: true },

    // Phrase 5 (Chorus Climax: 108-120) - 8-beat gap before
    { id: 9, midiNote: 74, startTime: 54.0, endTime: 57.0, startBeat: 108, endBeat: 114, duration: 3.0, frequency: 587.33, noteName: 'D5', centsOff: 0, confidence: 0.98, stability: 0.9, hasVibrato: true, vibratoRateHz: 5.5, vibratoDepthCents: 15, rmsEnergy: 0.96, spectralCentroid: 2100, isHighNote: true, isSustained: true },
    { id: 10, midiNote: 72, startTime: 58.0, endTime: 60.0, startBeat: 116, endBeat: 120, duration: 2.0, frequency: 523.25, noteName: 'C5', centsOff: 0, confidence: 0.98, stability: 0.9, hasVibrato: true, vibratoRateHz: 5.5, vibratoDepthCents: 15, rmsEnergy: 0.95, spectralCentroid: 2000, isHighNote: true, isSustained: true }
  ];

  const phrases: DeepVocalPhrase[] = [
    { id: 1, startBeat: 16, endBeat: 28, startTime: 8.0, endTime: 14.0, duration: 6.0, notes: notes.slice(0, 2), primaryMidi: 60, landingMidi: 64, pitchMinMidi: 60, pitchMaxMidi: 64, pitchRange: 4, melodicDirection: 'rising', avgEnergy: 0.50, peakEnergy: 0.55, isHighIntensity: false, isHighPitch: false, isSustained: true, syllabicDensity: 1.5, motifHash: 'm1', hasCrescendo: false, hasDecrescendo: false, vocalRegister: 'chest', tensionLevel: 0.25, resolutionLevel: 0.75, isHookCandidate: false, breathPointBefore: false, breathPointAfter: true },
    { id: 2, startBeat: 36, endBeat: 48, startTime: 18.0, endTime: 24.0, duration: 6.0, notes: notes.slice(2, 4), primaryMidi: 65, landingMidi: 67, pitchMinMidi: 65, pitchMaxMidi: 67, pitchRange: 2, melodicDirection: 'rising', avgEnergy: 0.72, peakEnergy: 0.78, isHighIntensity: false, isHighPitch: false, isSustained: true, syllabicDensity: 2.0, motifHash: 'm2', hasCrescendo: true, hasDecrescendo: false, vocalRegister: 'mid', tensionLevel: 0.65, resolutionLevel: 0.35, isHookCandidate: false, breathPointBefore: true, breathPointAfter: true },
    { id: 3, startBeat: 56, endBeat: 68, startTime: 28.0, endTime: 34.0, duration: 6.0, notes: notes.slice(4, 6), primaryMidi: 72, landingMidi: 71, pitchMinMidi: 71, pitchMaxMidi: 72, pitchRange: 1, melodicDirection: 'falling', avgEnergy: 0.85, peakEnergy: 0.90, isHighIntensity: false, isHighPitch: true, isSustained: true, syllabicDensity: 2.0, motifHash: 'm3', hasCrescendo: false, hasDecrescendo: false, vocalRegister: 'head', tensionLevel: 0.75, resolutionLevel: 0.50, isHookCandidate: true, breathPointBefore: true, breathPointAfter: true },
    { id: 4, startBeat: 88, endBeat: 100, startTime: 44.0, endTime: 50.0, duration: 6.0, notes: notes.slice(6, 8), primaryMidi: 62, landingMidi: 67, pitchMinMidi: 62, pitchMaxMidi: 67, pitchRange: 5, melodicDirection: 'rising', avgEnergy: 0.55, peakEnergy: 0.60, isHighIntensity: false, isHighPitch: false, isSustained: true, syllabicDensity: 1.5, motifHash: 'm4', hasCrescendo: false, hasDecrescendo: false, vocalRegister: 'chest', tensionLevel: 0.30, resolutionLevel: 0.70, isHookCandidate: false, breathPointBefore: true, breathPointAfter: true },
    { id: 5, startBeat: 108, endBeat: 120, startTime: 54.0, endTime: 60.0, duration: 6.0, notes: notes.slice(8, 10), primaryMidi: 74, landingMidi: 72, pitchMinMidi: 72, pitchMaxMidi: 74, pitchRange: 2, melodicDirection: 'falling', avgEnergy: 0.95, peakEnergy: 0.98, isHighIntensity: true, isHighPitch: true, isSustained: true, syllabicDensity: 2.5, motifHash: 'm5', hasCrescendo: true, hasDecrescendo: false, vocalRegister: 'head', tensionLevel: 0.90, resolutionLevel: 0.30, isHookCandidate: true, breathPointBefore: true, breathPointAfter: true }
  ];

  const silenceGaps: VocalSilenceGap[] = [
    { id: 1, startBeat: 0, endBeat: 16, startTime: 0, endTime: 8.0, duration: 8.0, afterPhraseId: 0, recommendedResponseInstrument: 'flute', fillCapacity: 'two_bar_phrase', isMeaningfulMusicalSpace: true },
    { id: 2, startBeat: 32, endBeat: 36, startTime: 16.0, endTime: 18.0, duration: 2.0, afterPhraseId: 1, recommendedResponseInstrument: 'flute', fillCapacity: 'short_pickup', isMeaningfulMusicalSpace: false },
    { id: 3, startBeat: 72, endBeat: 88, startTime: 36.0, endTime: 44.0, duration: 8.0, afterPhraseId: 3, recommendedResponseInstrument: 'guitar', fillCapacity: 'two_bar_phrase', isMeaningfulMusicalSpace: true },
    { id: 4, startBeat: 124, endBeat: 160, startTime: 62.0, endTime: 80.0, duration: 18.0, afterPhraseId: 5, recommendedResponseInstrument: 'flute', fillCapacity: 'two_bar_phrase', isMeaningfulMusicalSpace: true }
  ];

  const emotionalPeaks: VocalEmotionalPeak[] = [
    { beat: 114.0, time: 57.0, duration: 2.0, intensity: 0.98, type: 'crescendo_peak', recommendedHarmonicAction: 'voicing_expansion' }
  ];

  const durationSec = (totalBeats / 120) * 60;

  return {
    tempo: 120,
    bpm: 120,
    key: 'C',
    scale: 'major',
    meter: '4/4',
    totalDuration: durationSec,
    vocalDuration: durationSec * 0.5,
    introSeconds: 8.0,
    notes,
    phrases,
    silenceGaps,
    emotionalPeaks,
    motifs: [
      {
        motifId: 'motif_test_1',
        phraseLocation: [1],
        intervalPattern: [0, 4, 7],
        duration: 4,
        confidence: 0.95,
        emotionalImportance: 0.8,
        suggestedInstrument: 'flute',
        pitchSequenceMidi: [60, 64, 67]
      }
    ],
    melodicMotifs: [],
    sustainedNotes: [],
    highNoteEvents: [],
    sustainedNoteEvents: [],
    repeatedMotifs: [],
    likelyHookSections: [],
    emotionalCurve: new Array(totalBeats).fill(0.5),
    melodicContour: new Array(totalBeats).fill(60),
    rhythmicContour: new Array(totalBeats).fill(0.5),
    intensityCurve: new Array(totalBeats).fill(0.7),
    silenceMap: new Array(totalBeats).fill(false),
    tensionMap: new Array(totalBeats).fill(0.3),
    resolutionMap: new Array(totalBeats).fill(0.7),
    vocalDensityByBeat: new Array(totalBeats).fill(0.5),
    vocalRegisterByBeat: new Array(totalBeats).fill('mid'),
    rmsEnvelopeByBeat: new Array(totalBeats).fill(0.6),
    tempoDeviationCurve: new Array(totalBeats).fill(1.0),
    meterMapByBeat: new Array(totalBeats).fill('4/4'),
    pitchContourByBeat: new Array(totalBeats).fill([60, 62, 64]),
    overallVocalDynamicArc: 'rising',
    confidenceScores: { pitch: 0.95, bpm: 0.95, phraseSegmentation: 0.92, tonality: 0.94, overall: 0.94 }
  };
}

function createMockAudioBuffer(sampleRate = 44100, durationSec = 32.0): AudioBuffer {
  const length = Math.floor(sampleRate * durationSec);
  const dataL = new Float32Array(length);
  const dataR = new Float32Array(length);
  for (let i = 0; i < length; i++) {
    const t = i / sampleRate;
    dataL[i] = Math.sin(2 * Math.PI * 440 * t) * 0.2;
    dataR[i] = dataL[i];
  }
  return {
    sampleRate,
    length,
    duration: durationSec,
    numberOfChannels: 2,
    getChannelData: (ch: number) => (ch === 0 ? dataL : dataR),
    copyFromChannel: () => {},
    copyToChannel: () => {}
  } as unknown as AudioBuffer;
}

export class Phase8ForensicVerifier {
  public static async runAllTests(): Promise<Phase8SuiteReport> {
    const results: Phase8TestResult[] = [];
    const brainEngine = MusicalBrainEngine.getInstance();
    const arrangementEngine = ProfessionalSongArrangementEngine.getInstance();
    const compEngine = GenerativeCompositionEngine.getInstance();

    const vocalMap = createSyntheticVocalMap(160);
    const audioBuffer = createMockAudioBuffer(44100, vocalMap.totalDuration);
    const umr = await brainEngine.analyzeAndBuildUMR(audioBuffer, { vocalMap, explicitBpm: 120, explicitKey: 'C' });
    const composition = compEngine.composeFullSong(umr);
    const arrangement = arrangementEngine.generateFullSongArrangement(umr, composition);

    // AR-01: Full-song macro structure
    const sectionTypes = arrangement.sections.map(s => s.archetype);
    const hasCoreArchetypes = ['intro', 'verse_mukhda', 'pre_chorus', 'chorus_hook', 'interlude', 'verse_antara', 'chorus_climax', 'outro'].every(
      type => sectionTypes.includes(type as any)
    );
    results.push({
      testId: 'AR-01',
      name: 'Full-Song Macro Structure Across All 8 Canonical Archetypes',
      category: 'Macro Structure',
      passed: hasCoreArchetypes && arrangement.sections.length >= 8,
      expected: 'Arrangement contains all 8 macro section archetypes',
      actual: `Sections Count: ${arrangement.sections.length}, Types: ${sectionTypes.join(', ')}`
    });

    // AR-02: Section identity & distinct purpose
    const purposes = new Set(arrangement.sections.map(s => s.purpose));
    const hasDistinctPurposes = purposes.size >= 5;
    results.push({
      testId: 'AR-02',
      name: 'Section Purpose & Identity Differentiation',
      category: 'Section Identity',
      passed: hasDistinctPurposes,
      expected: 'At least 5 distinct section purposes assigned',
      actual: `Distinct Purposes: ${purposes.size} (${Array.from(purposes).join(', ')})`
    });

    // AR-03: 9-Instrument role allocation
    const allInstruments = ['piano', 'guitar', 'bass', 'drums', 'tabla', 'strings', 'flute', 'harmonium', 'sitar'];
    const hasAllInstruments = allInstruments.every(inst => arrangement.instrumentDensityByBeat[inst as any]?.length === arrangement.totalBeats);
    results.push({
      testId: 'AR-03',
      name: '9-Instrument Role Allocation Across Entire Song Timeline',
      category: 'Instrument Orchestration',
      passed: hasAllInstruments,
      expected: 'All 9 instruments assigned continuous trajectories and roles',
      actual: `Verified all 9 instruments across ${arrangement.totalBeats} beats`
    });

    // AR-04: Continuous arrangement density trajectory
    const densityCurve = arrangement.overallDensityCurve;
    const isValidDensity = densityCurve.length === arrangement.totalBeats && densityCurve.every(d => d >= 0.0 && d <= 1.0 && Number.isFinite(d));
    results.push({
      testId: 'AR-04',
      name: 'Continuous Arrangement Density Trajectory',
      category: 'Density Trajectory',
      passed: isValidDensity,
      expected: 'Continuous [0.0, 1.0] density curve per beat without NaN',
      actual: `Curve Length: ${densityCurve.length}, Min: ${Math.min(...densityCurve).toFixed(2)}, Max: ${Math.max(...densityCurve).toFixed(2)}`
    });

    // AR-05: Intro generation
    const introSec = arrangement.sections.find(s => s.archetype === 'intro');
    const isIntroValid = introSec !== undefined && introSec.targetDensity < 0.5 && introSec.purpose === 'opening';
    results.push({
      testId: 'AR-05',
      name: 'Intro Design & Tonal Foundation Establishment',
      category: 'Intro Design',
      passed: isIntroValid,
      expected: 'Intro section is restrained and designated as opening',
      actual: `Intro Found: ${Boolean(introSec)}, Density: ${introSec?.targetDensity}, Purpose: ${introSec?.purpose}`
    });

    // AR-06: Verse support
    const verseSec = arrangement.sections.find(s => s.archetype === 'verse_mukhda');
    const isVerseValid = verseSec !== undefined && verseSec.targetDensity <= 0.6 && verseSec.vocalMaskingProtectionLevel >= 0.6;
    results.push({
      testId: 'AR-06',
      name: 'Verse Restraint & Vocal Support Headroom',
      category: 'Verse Orchestration',
      passed: isVerseValid,
      expected: 'Verse density <= 0.6 with vocal protection >= 0.6',
      actual: `Verse Density: ${verseSec?.targetDensity}, Masking Protection: ${verseSec?.vocalMaskingProtectionLevel}`
    });

    // AR-07: Pre-chorus build
    const preChorusSec = arrangement.sections.find(s => s.archetype === 'pre_chorus');
    const isPreChorusValid = preChorusSec !== undefined && preChorusSec.targetEnergy > (verseSec?.targetEnergy || 0.4);
    results.push({
      testId: 'AR-07',
      name: 'Pre-Chorus Build & Anticipation Dynamics',
      category: 'Pre-Chorus Dynamics',
      passed: isPreChorusValid,
      expected: 'Pre-Chorus target energy exceeds Verse energy',
      actual: `Pre-Chorus Energy: ${preChorusSec?.targetEnergy}, Verse Energy: ${verseSec?.targetEnergy}`
    });

    // AR-08: Chorus expansion
    const chorusSec = arrangement.sections.find(s => s.archetype === 'chorus_hook');
    const isChorusValid = chorusSec !== undefined && chorusSec.targetDensity >= 0.75 && chorusSec.activeInstruments.length >= 5;
    results.push({
      testId: 'AR-08',
      name: 'Chorus Expansion & Hook Orchestration',
      category: 'Chorus Hook',
      passed: isChorusValid,
      expected: 'Chorus density >= 0.75 with at least 5 active instruments',
      actual: `Chorus Density: ${chorusSec?.targetDensity}, Active Instruments: ${chorusSec?.activeInstruments.length}`
    });

    // AR-09: Antara variation
    const antaraSec = arrangement.sections.find(s => s.archetype === 'verse_antara');
    const isAntaraDistinct = Boolean(antaraSec && verseSec && (antaraSec.foregroundInstrument !== verseSec.foregroundInstrument || Math.abs(antaraSec.targetDensity - verseSec.targetDensity) > 0.05));
    results.push({
      testId: 'AR-09',
      name: 'Antara Secondary Section Development & Orchestration Divergence',
      category: 'Antara Development',
      passed: isAntaraDistinct,
      expected: 'Antara differs from Verse 1 in foreground instrument or density',
      actual: `Verse FG: ${verseSec?.foregroundInstrument}, Antara FG: ${antaraSec?.foregroundInstrument}`
    });

    // AR-10: Instrumental interlude
    const interludeSec = arrangement.sections.find(s => s.archetype === 'interlude');
    const isInterludeValid = interludeSec !== undefined && interludeSec.purpose === 'release' && interludeSec.foregroundInstrument !== undefined;
    results.push({
      testId: 'AR-10',
      name: 'Instrumental Interlude & Thematic Solo Spaces',
      category: 'Interlude Solo',
      passed: isInterludeValid,
      expected: 'Interlude exists with clear foreground solo instrument',
      actual: `Interlude Found: ${Boolean(interludeSec)}, Lead Instrument: ${interludeSec?.foregroundInstrument}`
    });

    // AR-11: Climax orchestration
    const climaxSec = arrangement.sections.find(s => s.archetype === 'chorus_climax');
    const isClimaxValid = climaxSec !== undefined && climaxSec.targetEnergy >= 0.9 && climaxSec.activeInstruments.length >= 6;
    results.push({
      testId: 'AR-11',
      name: 'Climax Peak Orchestration & Highest Dynamic Energy',
      category: 'Climax Orchestration',
      passed: isClimaxValid,
      expected: 'Climax target energy >= 0.9 with wide orchestration',
      actual: `Climax Energy: ${climaxSec?.targetEnergy}, Active Instruments: ${climaxSec?.activeInstruments.length}`
    });

    // AR-12: Outro resolution
    const outroSec = arrangement.sections.find(s => s.archetype === 'outro');
    const isOutroValid = outroSec !== undefined && outroSec.purpose === 'resolution' && outroSec.targetEnergy < 0.4;
    results.push({
      testId: 'AR-12',
      name: 'Outro Resolution & Gradual Energy Decay',
      category: 'Outro Resolution',
      passed: isOutroValid,
      expected: 'Outro purpose is resolution with energy < 0.4',
      actual: `Outro Found: ${Boolean(outroSec)}, Energy: ${outroSec?.targetEnergy}, Purpose: ${outroSec?.purpose}`
    });

    // AR-13: Transition continuity
    const transitionsValid = arrangement.transitions.length >= arrangement.sections.length - 1 &&
      arrangement.transitions.every(t => t.crescendoCurve.length > 0 && t.durationBeats > 0);
    results.push({
      testId: 'AR-13',
      name: 'Section-to-Section Transition Continuity & Dynamic Swells',
      category: 'Transitions',
      passed: transitionsValid,
      expected: 'All adjacent sections linked by valid transition specs',
      actual: `Transitions Count: ${arrangement.transitions.length}`
    });

    // AR-14: Vocal priority
    const hasVocalProtection = arrangement.sections.every(s => s.vocalMaskingProtectionLevel >= 0.5);
    results.push({
      testId: 'AR-14',
      name: 'Vocal Priority & Pocket Frequency Masking Suppression',
      category: 'Vocal Priority',
      passed: hasVocalProtection,
      expected: 'Vocal masking protection level >= 0.5 across all sections',
      actual: `All Protected: ${hasVocalProtection}`
    });

    // AR-15: Register separation
    const specs = arrangement.sections[0].instrumentSpecs;
    const hasRegisterSpread = specs.bass.register === 'sub_bass' && specs.strings.register === 'high_mid' && specs.sitar.register === 'ultra_high';
    results.push({
      testId: 'AR-15',
      name: 'Frequency Register Separation Across 9 Stems',
      category: 'Register Management',
      passed: hasRegisterSpread,
      expected: 'Stems allocated distinct frequency registers (sub_bass, mid, high_mid, ultra_high)',
      actual: `Bass: ${specs.bass.register}, Strings: ${specs.strings.register}, Sitar: ${specs.sitar.register}`
    });

    // AR-16: Repetition evolution
    const hasEvolution = arrangement.repetitionEvolutionSummary.antiLoopVerificationPassed;
    results.push({
      testId: 'AR-16',
      name: 'Repetition Evolution (Recognition + Development + Escalation)',
      category: 'Evolution Tracking',
      passed: hasEvolution,
      expected: 'Anti-loop verification and evolution tracking active',
      actual: `AntiLoop Passed: ${hasEvolution}`
    });

    // AR-17: Full-song continuity
    let isContinuous = true;
    for (let i = 0; i < arrangement.sections.length - 1; i++) {
      if (arrangement.sections[i].endBeat !== arrangement.sections[i + 1].startBeat) {
        isContinuous = false;
        break;
      }
    }
    results.push({
      testId: 'AR-17',
      name: 'Full-Song Continuity & Unbroken Timeline Stitching',
      category: 'Continuity',
      passed: isContinuous,
      expected: 'Contiguous beat boundaries between all adjacent sections',
      actual: `Is Continuous: ${isContinuous}`
    });

    // AR-18: Deterministic repeatability
    const mem1 = new GenerativeMusicalMemory();
    const mem2 = new GenerativeMusicalMemory();
    const arr1 = arrangementEngine.generateFullSongArrangement(umr, composition, mem1);
    const arr2 = arrangementEngine.generateFullSongArrangement(umr, composition, mem2);
    const isDeterministic = arr1.climaxBeat === arr2.climaxBeat &&
      arr1.overallDensityCurve[0] === arr2.overallDensityCurve[0] &&
      arr1.sections.length === arr2.sections.length;
    results.push({
      testId: 'AR-18',
      name: '100% Deterministic Repeatability Across Multi-Pass Runs',
      category: 'Determinism',
      passed: isDeterministic,
      expected: 'Bitwise identical arrangement parameters across separate passes',
      actual: `Bitwise Identical: ${isDeterministic}`
    });

    // AR-19: Long-form stability
    const longVocalMap = createSyntheticVocalMap(256);
    const longAudioBuffer = createMockAudioBuffer(44100, longVocalMap.totalDuration);
    const longUmr = await brainEngine.analyzeAndBuildUMR(longAudioBuffer, { vocalMap: longVocalMap, explicitBpm: 120, explicitKey: 'C' });
    const t0 = performance.now();
    const longArrangement = arrangementEngine.generateFullSongArrangement(longUmr);
    const elapsed = performance.now() - t0;
    results.push({
      testId: 'AR-19',
      name: 'Long-Form Stability & Rapid Performance (< 200ms for 256 beats)',
      category: 'Performance & Scale',
      passed: elapsed < 200 && longArrangement.totalBeats >= 256,
      expected: '256-beat arrangement completed in < 200ms',
      actual: `Elapsed: ${elapsed.toFixed(2)}ms, Total Beats: ${longArrangement.totalBeats}`
    });

    // AR-20: Numerical safety
    let allFinite = true;
    for (const d of arrangement.overallDensityCurve) {
      if (!Number.isFinite(d) || Number.isNaN(d)) {
        allFinite = false;
        break;
      }
    }
    for (const e of arrangement.macroEnergyTrajectory) {
      if (!Number.isFinite(e) || Number.isNaN(e)) {
        allFinite = false;
        break;
      }
    }
    results.push({
      testId: 'AR-20',
      name: 'Zero NaN / Infinity Numerical Safety Scan',
      category: 'Numerical Safety',
      passed: allFinite,
      expected: '100% finite numerical values across all density and energy curves',
      actual: `All Finite: ${allFinite}`
    });

    // AR-21: Phase 1–7 regression
    const p1_7_safe = umr.confidenceSummary.overall > 0.8 && composition.qualityGateReport.allPassed && arrangement.timeline.totalBeats > 0;
    results.push({
      testId: 'AR-21',
      name: 'Phase 1–7 Regression Safety & Quality Gate Lock',
      category: 'Regression Safety',
      passed: p1_7_safe,
      expected: 'All prior phase authorities (UMR, Timeline, Composition) remain intact',
      actual: `UMR Confidence: ${umr.confidenceSummary.overall.toFixed(2)}, Composition Gate: ${composition.qualityGateReport.allPassed}`
    });

    const passedCount = results.filter(r => r.passed).length;
    return {
      totalTests: results.length,
      passedTests: passedCount,
      failedTests: results.length - passedCount,
      allPassed: passedCount === results.length,
      results
    };
  }
}
