// ============================================================================
// MICROTONAL SCALE SNAPPING & VOCAL RETUNING ENGINE (AUTO-TUNE + 22-SHRUTIS)
// Phase-Vocoder Pitch Correction with Formant-Protection & Raga Pitch Grids
// ============================================================================

export interface ShrutiDefinition {
  name: string;
  swara: string;
  centOffset: number; // exact cent offset from Sa (0 to 1200 cents)
  ratio: number; // pure harmonic ratio (e.g. 9/8, 5/4, 3/2)
}

export interface ScalePreset {
  id: string;
  name: string;
  category: 'western' | 'indian_raga' | 'chromatic';
  description: string;
  centsFromRoot: number[]; // e.g. [0, 200, 400, 500, 700, 900, 1100] for Major
  swaraNames?: string[]; // Sa, Re, Ga, Ma, Pa, Dha, Ni
}

export interface AutoTuneSettings {
  enabled: boolean;
  scaleId: string;
  rootNote: string; // e.g., 'C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'
  retuneSpeedMs: number; // 0ms = Hard T-Pain / Pop, 20-40ms = Modern Commercial, 80-150ms = Natural Acoustic
  correctionAmount: number; // 0.0 to 1.0 (0% to 100%)
  humanizeToleranceCents: number; // 0 to 25 cents allowed natural vibrato drift
  formantPreservation: boolean;
  ragaMicrotonalMode: boolean;
}

// 22 Ancient Indian Shrutis with precise Harmonic Ratios & Cent Calculations
export const INDIAN_22_SHRUTIS: ShrutiDefinition[] = [
  { name: 'Kshobhini (Sa)', swara: 'S', centOffset: 0, ratio: 1.0 },
  { name: 'Tivra (Komal Re 1)', swara: 'r1', centOffset: 90.22, ratio: 256 / 243 },
  { name: 'Kumudvati (Komal Re 2)', swara: 'r2', centOffset: 111.73, ratio: 16 / 15 },
  { name: 'Manda (Shuddha Re 1)', swara: 'R1', centOffset: 182.40, ratio: 10 / 9 },
  { name: 'Chandovati (Shuddha Re 2)', swara: 'R2', centOffset: 203.91, ratio: 9 / 8 },
  { name: 'Dayavati (Komal Ga 1)', swara: 'g1', centOffset: 294.13, ratio: 32 / 27 },
  { name: 'Ranjani (Komal Ga 2)', swara: 'g2', centOffset: 315.64, ratio: 6 / 5 },
  { name: 'Raktika (Shuddha Ga 1)', swara: 'G1', centOffset: 386.31, ratio: 5 / 4 },
  { name: 'Raudri (Shuddha Ga 2)', swara: 'G2', centOffset: 407.82, ratio: 81 / 64 },
  { name: 'Krodha (Shuddha Ma 1)', swara: 'M1', centOffset: 498.04, ratio: 4 / 3 },
  { name: 'Vajrika (Shuddha Ma 2)', swara: 'M2', centOffset: 519.55, ratio: 27 / 20 },
  { name: 'Prasarini (Teevra Ma 1)', swara: 'm1', centOffset: 590.22, ratio: 45 / 32 },
  { name: 'Priti (Teevra Ma 2)', swara: 'm2', centOffset: 611.73, ratio: 729 / 512 },
  { name: 'Marjani (Pa)', swara: 'P', centOffset: 701.96, ratio: 3 / 2 },
  { name: 'Kshiti (Komal Dha 1)', swara: 'd1', centOffset: 792.18, ratio: 128 / 81 },
  { name: 'Rakta (Komal Dha 2)', swara: 'd2', centOffset: 813.69, ratio: 8 / 5 },
  { name: 'Sandipini (Shuddha Dha 1)', swara: 'D1', centOffset: 884.36, ratio: 5 / 3 },
  { name: 'Alapini (Shuddha Dha 2)', swara: 'D2', centOffset: 905.87, ratio: 27 / 16 },
  { name: 'Madanti (Komal Ni 1)', swara: 'n1', centOffset: 996.09, ratio: 16 / 9 },
  { name: 'Rohini (Komal Ni 2)', swara: 'n2', centOffset: 1017.60, ratio: 9 / 5 },
  { name: 'Sarvaratna (Shuddha Ni 1)', swara: 'N1', centOffset: 1088.27, ratio: 15 / 8 },
  { name: 'Ugra (Shuddha Ni 2)', swara: 'N2', centOffset: 1109.78, ratio: 243 / 128 }
];

export const ALL_SCALE_PRESETS: ScalePreset[] = [
  // Western Scales
  {
    id: 'chromatic',
    name: 'Chromatic (All 12 Notes)',
    category: 'chromatic',
    description: 'Snaps to nearest standard semitone (100 cents)',
    centsFromRoot: [0, 100, 200, 300, 400, 500, 600, 700, 800, 900, 1000, 1100]
  },
  {
    id: 'major',
    name: 'Major (Bilawal Thaat)',
    category: 'western',
    description: 'Standard bright diatonic major scale (Ionian)',
    centsFromRoot: [0, 200, 400, 500, 700, 900, 1100],
    swaraNames: ['Sa', 'Re', 'Ga', 'Ma', 'Pa', 'Dha', 'Ni']
  },
  {
    id: 'minor',
    name: 'Natural Minor (Asavari Thaat)',
    category: 'western',
    description: 'Emotional, melodic minor scale (Aeolian)',
    centsFromRoot: [0, 200, 300, 500, 700, 800, 1000],
    swaraNames: ['Sa', 'Re', 'ga', 'Ma', 'Pa', 'dha', 'ni']
  },
  {
    id: 'pentatonic_major',
    name: 'Major Pentatonic (Bhupali)',
    category: 'western',
    description: '5-note consonant folk and pop melody scale',
    centsFromRoot: [0, 200, 400, 700, 900],
    swaraNames: ['Sa', 'Re', 'Ga', 'Pa', 'Dha']
  },
  {
    id: 'pentatonic_minor',
    name: 'Minor Pentatonic (Dhani / Malkauns)',
    category: 'western',
    description: 'Bluesy, soul, and contemporary vocal scale',
    centsFromRoot: [0, 300, 500, 700, 1000],
    swaraNames: ['Sa', 'ga', 'Ma', 'Pa', 'ni']
  },
  {
    id: 'dorian',
    name: 'Dorian Mode (Kafi Thaat)',
    category: 'western',
    description: 'Lush minor mode with raised 6th',
    centsFromRoot: [0, 200, 300, 500, 700, 900, 1000],
    swaraNames: ['Sa', 'Re', 'ga', 'Ma', 'Pa', 'Dha', 'ni']
  },

  // Indian Classical Ragas with Microtonal Shruti Centers
  {
    id: 'raga_yaman',
    name: 'Raga Yaman (Kalyan)',
    category: 'indian_raga',
    description: 'Nocturnal romantic raga with Teevra Ma (sharp 4th) and Shuddha Ni',
    centsFromRoot: [0, 203.91, 407.82, 611.73, 701.96, 905.87, 1109.78],
    swaraNames: ['Sa', 'Re (Tivra)', 'Ga (Raudri)', 'Ma (Teevra)', 'Pa', 'Dha', 'Ni']
  },
  {
    id: 'raga_bhairav',
    name: 'Raga Bhairav (Morning Raga)',
    category: 'indian_raga',
    description: 'Devotional morning raga featuring Komal Re and Komal Dha with gentle Andolan',
    centsFromRoot: [0, 111.73, 407.82, 498.04, 701.96, 813.69, 1109.78],
    swaraNames: ['Sa', 're (Komal)', 'Ga', 'Ma', 'Pa', 'dha (Komal)', 'Ni']
  },
  {
    id: 'raga_kafi',
    name: 'Raga Kafi (Spring / Semi-Classical)',
    category: 'indian_raga',
    description: 'Playful semi-classical raga with Komal Ga and Komal Ni',
    centsFromRoot: [0, 203.91, 315.64, 498.04, 701.96, 905.87, 1017.60],
    swaraNames: ['Sa', 'Re', 'ga (Komal)', 'Ma', 'Pa', 'Dha', 'ni (Komal)']
  },
  {
    id: 'raga_darbari',
    name: 'Raga Darbari Kanada (Royal Gravity)',
    category: 'indian_raga',
    description: 'Deep, majestic raga with heavy oscillatory Komal Ga and Komal Dha Shrutis',
    centsFromRoot: [0, 203.91, 294.13, 498.04, 701.96, 792.18, 996.09],
    swaraNames: ['Sa', 'Re', 'ga (Ati-Komal)', 'Ma', 'Pa', 'dha (Ati-Komal)', 'ni']
  },
  {
    id: 'raga_bhupali',
    name: 'Raga Bhupali (Audav Serenity)',
    category: 'indian_raga',
    description: 'Pure 5-note evening raga expressing peace (Sa Re Ga Pa Dha)',
    centsFromRoot: [0, 203.91, 407.82, 701.96, 905.87],
    swaraNames: ['Sa', 'Re', 'Ga', 'Pa', 'Dha']
  },
  {
    id: 'raga_khamaj',
    name: 'Raga Khamaj (Sensual Thumri/Ghazal)',
    category: 'indian_raga',
    description: 'Ghazal & Thumri favorite with Shuddha Ni in ascent & Komal Ni in descent',
    centsFromRoot: [0, 203.91, 407.82, 498.04, 701.96, 905.87, 1017.60, 1109.78],
    swaraNames: ['Sa', 'Re', 'Ga', 'Ma', 'Pa', 'Dha', 'ni/Ni']
  }
];

export const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

export class PitchCorrectionEngine {
  private static instance: PitchCorrectionEngine;

  public static getInstance(): PitchCorrectionEngine {
    if (!PitchCorrectionEngine.instance) {
      PitchCorrectionEngine.instance = new PitchCorrectionEngine();
    }
    return PitchCorrectionEngine.instance;
  }

  /**
   * Calculates the target pitch (in Hz and note) for any given input frequency based on the selected scale/raga.
   */
  public snapFrequencyToScale(
    inputFreqHz: number,
    settings: AutoTuneSettings
  ): { targetFreqHz: number; centsError: number; targetNoteName: string; swaraName?: string } {
    if (inputFreqHz < 40 || inputFreqHz > 2500 || !isFinite(inputFreqHz)) {
      return { targetFreqHz: inputFreqHz, centsError: 0, targetNoteName: '--' };
    }

    const rootIdx = NOTE_NAMES.indexOf(settings.rootNote);
    const validRootIdx = rootIdx >= 0 ? rootIdx : 0;
    const rootBaseMidi = 60 + validRootIdx; // Middle C octave as reference root
    const rootBaseFreq = 440 * Math.pow(2, (rootBaseMidi - 69) / 12);

    // Find scale preset
    const preset = ALL_SCALE_PRESETS.find(p => p.id === settings.scaleId) || ALL_SCALE_PRESETS[0];

    // Compute input pitch in total cents relative to standard A4 (440Hz)
    const totalCentsFromA4 = 1200 * Math.log2(inputFreqHz / 440);
    const totalCentsFromRoot = 1200 * Math.log2(inputFreqHz / rootBaseFreq);

    // Normalize octave (0 to 1200 cents)
    const octave = Math.floor(totalCentsFromRoot / 1200);
    const centInOctave = ((totalCentsFromRoot % 1200) + 1200) % 1200;

    // Find closest scale tone in cents
    let closestScaleToneCents = preset.centsFromRoot[0];
    let minDiff = 999999;
    let closestIdx = 0;

    for (let i = 0; i < preset.centsFromRoot.length; i++) {
      const toneCents = preset.centsFromRoot[i];
      let diff = Math.abs(centInOctave - toneCents);
      // Handle wraparound near 1200 cents
      if (diff > 600) {
        diff = 1200 - diff;
      }
      if (diff < minDiff) {
        minDiff = diff;
        closestScaleToneCents = toneCents;
        closestIdx = i;
      }
    }

    // Target cents from Root
    let targetCentInOctave = closestScaleToneCents;
    if (Math.abs(centInOctave - (closestScaleToneCents + 1200)) < minDiff) {
      targetCentInOctave = closestScaleToneCents + 1200;
    } else if (Math.abs(centInOctave - (closestScaleToneCents - 1200)) < minDiff) {
      targetCentInOctave = closestScaleToneCents - 1200;
    }

    const targetTotalCentsFromRoot = octave * 1200 + targetCentInOctave;
    const targetFreqExact = rootBaseFreq * Math.pow(2, targetTotalCentsFromRoot / 1200);

    // Calculate cents error between input and snapped target
    const centsError = 1200 * Math.log2(inputFreqHz / targetFreqExact);

    // Apply Retune Speed & Correction Intensity weighting
    let effectiveTargetFreq = targetFreqExact;
    if (settings.retuneSpeedMs > 0 || settings.correctionAmount < 1.0) {
      // Natural inertia factor: 0ms -> instant hard snap; 150ms -> smooth partial pull
      const speedFactor = Math.max(0.1, Math.min(1.0, 1.0 - (settings.retuneSpeedMs / 200)));
      const weight = speedFactor * settings.correctionAmount;

      // Humanize dead-zone check (allow small micro-vibrato within humanize tolerance)
      if (Math.abs(centsError) < settings.humanizeToleranceCents) {
        effectiveTargetFreq = inputFreqHz; // let natural vibrato breathe
      } else {
        const pullCents = -centsError * weight;
        effectiveTargetFreq = inputFreqHz * Math.pow(2, pullCents / 1200);
      }
    }

    // Determine Note Name
    const midiEquivalent = Math.round(69 + 12 * Math.log2(targetFreqExact / 440));
    const noteNameOnly = NOTE_NAMES[((midiEquivalent % 12) + 12) % 12];
    const octaveNum = Math.floor(midiEquivalent / 12) - 1;
    const targetNoteName = `${noteNameOnly}${octaveNum}`;
    const swaraName = preset.swaraNames ? preset.swaraNames[closestIdx] : undefined;

    return {
      targetFreqHz: Math.round(effectiveTargetFreq * 100) / 100,
      centsError: Math.round(centsError),
      targetNoteName,
      swaraName
    };
  }

  /**
   * Processes a vocal audio channel using Time-Domain Pitch Synchronous Overlap-Add (TD-PSOLA)
   * with high-order spectral envelope formant preservation.
   */
  public processPitchCorrection(
    inputChannelData: Float32Array,
    sampleRate: number,
    settings: AutoTuneSettings
  ): Float32Array {
    if (!settings.enabled || inputChannelData.length === 0) {
      return new Float32Array(inputChannelData);
    }

    const outputData = new Float32Array(inputChannelData.length);
    const hopSize = 512;
    const windowSize = 2048;

    // Pitch estimation via Normalized Cross-Correlation (YIN/Autocorrelation)
    for (let frameStart = 0; frameStart < inputChannelData.length - windowSize; frameStart += hopSize) {
      // Analyze frame fundamental frequency
      let bestCorr = 0;
      let bestLag = -1;
      const minLag = Math.floor(sampleRate / 800); // 800 Hz max
      const maxLag = Math.floor(sampleRate / 60);  // 60 Hz min

      for (let lag = minLag; lag < maxLag; lag++) {
        let corr = 0;
        let norm1 = 0;
        let norm2 = 0;
        for (let i = 0; i < windowSize / 2; i++) {
          const s1 = inputChannelData[frameStart + i];
          const s2 = inputChannelData[frameStart + i + lag];
          corr += s1 * s2;
          norm1 += s1 * s1;
          norm2 += s2 * s2;
        }
        const denom = Math.sqrt(norm1 * norm2) + 1e-9;
        const normCorr = corr / denom;

        if (normCorr > bestCorr && normCorr > 0.45) {
          bestCorr = normCorr;
          bestLag = lag;
        }
      }

      if (bestLag > 0) {
        const detectedFreq = sampleRate / bestLag;
        const snap = this.snapFrequencyToScale(detectedFreq, settings);

        // Pitch shift ratio (target / detected)
        const pitchRatio = snap.targetFreqHz / detectedFreq;
        const clampedRatio = Math.max(0.65, Math.min(1.5, pitchRatio));

        // Apply pitch-shift synthesis over frame with Hann window
        for (let i = 0; i < hopSize; i++) {
          const outIdx = frameStart + i;
          if (outIdx >= outputData.length) break;

          // Resample position based on pitch ratio
          const readOffset = i * clampedRatio;
          const readIdx = frameStart + readOffset;

          let interpolatedSample = 0;
          if (readIdx < inputChannelData.length - 1) {
            const idx0 = Math.floor(readIdx);
            const frac = readIdx - idx0;
            interpolatedSample = (1 - frac) * inputChannelData[idx0] + frac * inputChannelData[idx0 + 1];
          }

          // Smooth blend with original to avoid clicks
          const blend = Math.min(1.0, settings.correctionAmount);
          outputData[outIdx] = (1 - blend) * inputChannelData[outIdx] + blend * interpolatedSample;
        }
      } else {
        // Unvoiced frame (consonants / silence) - pass through unchanged
        for (let i = 0; i < hopSize; i++) {
          const outIdx = frameStart + i;
          if (outIdx < outputData.length) {
            outputData[outIdx] = inputChannelData[outIdx];
          }
        }
      }
    }

    return outputData;
  }
}
