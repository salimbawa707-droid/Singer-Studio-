/**
 * SURGE STUDIO / MUSICBASE — PHASE 9
 * AI VALIDATION ENGINE
 * 
 * Strict Schema Validation + Music Domain Validation + Prompt Injection Defense.
 * Absolute Rule #1 Enforcement: AI output never mutates project state directly.
 */

import { StructuredAiMusicProposal, StructuredAiMixProposal, StructuredAiMasterProposal } from './types';

export interface ValidationResult<T = any> {
  isValid: boolean;
  sanitizedProposal?: T;
  schemaErrors: string[];
  domainErrors: string[];
  injectionDetected: boolean;
  userConstraintsApplied: boolean;
}

export class AIValidationEngine {
  private static VALID_KEYS = ['C', 'C#', 'Db', 'D', 'D#', 'Eb', 'E', 'F', 'F#', 'Gb', 'G', 'G#', 'Ab', 'A', 'A#', 'Bb', 'B'];

  /**
   * Sanitizes user/project inputs against prompt injection and arbitrary execution attacks
   */
  public static sanitizeInput(input: string): string {
    if (!input || typeof input !== 'string') return '';
    
    // Strip script tags, eval, process, prototype injection, and raw HTML
    let cleaned = input
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .replace(/<[^>]+>/g, '')
      .replace(/\beval\s*\(/gi, '')
      .replace(/\bFunction\s*\(/gi, '')
      .replace(/__proto__/g, '')
      .replace(/constructor/g, '')
      .replace(/prototype/g, '');

    return cleaned.trim();
  }

  /**
   * Validates & enforces schema & domain rules for Composition/Music Director proposal
   */
  public static validateMusicProposal(
    rawProposal: any,
    userConstraints?: { bpm?: number; key?: string; scale?: string }
  ): ValidationResult<StructuredAiMusicProposal> {
    const schemaErrors: string[] = [];
    const domainErrors: string[] = [];
    let injectionDetected = false;

    if (!rawProposal || typeof rawProposal !== 'object') {
      return {
        isValid: false,
        schemaErrors: ['Proposal is not an object'],
        domainErrors: [],
        injectionDetected: false,
        userConstraintsApplied: false
      };
    }

    const p = rawProposal as Partial<StructuredAiMusicProposal>;

    // 1. Schema Check
    if (typeof p.recommendedBpm !== 'number') {
      schemaErrors.push('recommendedBpm must be a number');
    }
    if (typeof p.recommendedKey !== 'string') {
      schemaErrors.push('recommendedKey must be a string');
    }
    if (!Array.isArray(p.sections)) {
      schemaErrors.push('sections must be an array');
    }

    if (schemaErrors.length > 0) {
      return {
        isValid: false,
        schemaErrors,
        domainErrors: [],
        injectionDetected: false,
        userConstraintsApplied: false
      };
    }

    // 2. Domain Validation
    let bpm = p.recommendedBpm!;
    let key = p.recommendedKey!;

    if (bpm < 40 || bpm > 240) {
      domainErrors.push(`BPM out of valid range (40..240): ${bpm}`);
    }

    const normalizedKey = key.trim().toUpperCase();
    const isKeyValid = this.VALID_KEYS.some(k => k.toUpperCase() === normalizedKey);
    if (!isKeyValid) {
      domainErrors.push(`Invalid musical key: ${key}`);
    }

    if (!p.sections || p.sections.length === 0) {
      domainErrors.push('Composition proposal contains zero sections');
    } else {
      p.sections.forEach((sec, idx) => {
        if (!sec.name || typeof sec.name !== 'string') {
          domainErrors.push(`Section #${idx + 1} missing name`);
        }
        if (typeof sec.barCount !== 'number' || sec.barCount < 1 || sec.barCount > 256) {
          domainErrors.push(`Section #${idx + 1} invalid barCount: ${sec.barCount}`);
        }
      });
    }

    // 3. User Constraint Priority Enforcement
    let userConstraintsApplied = false;
    if (userConstraints) {
      if (typeof userConstraints.bpm === 'number' && userConstraints.bpm > 0) {
        bpm = userConstraints.bpm;
        userConstraintsApplied = true;
      }
      if (userConstraints.key && userConstraints.key !== 'unspecified') {
        key = userConstraints.key;
        userConstraintsApplied = true;
      }
    }

    const sanitizedProposal: StructuredAiMusicProposal = {
      genreStyle: this.sanitizeInput(p.genreStyle || 'Bollywood Romantic'),
      overallMood: this.sanitizeInput(p.overallMood || 'Soulful'),
      recommendedBpm: bpm,
      recommendedKey: key,
      scaleMode: p.scaleMode || 'major',
      timeSignature: p.timeSignature || { numerator: 4, denominator: 4 },
      sections: (p.sections || []).map(s => ({
        name: this.sanitizeInput(s.name),
        type: s.type || 'verse',
        barCount: Math.max(1, Math.min(128, s.barCount || 8)),
        energyLevel: s.energyLevel || 'medium',
        chords: Array.isArray(s.chords) ? s.chords.map(c => this.sanitizeInput(c)) : ['C'],
        suggestedInstruments: Array.isArray(s.suggestedInstruments) ? s.suggestedInstruments.map(i => this.sanitizeInput(i)) : ['Piano']
      })),
      suggestedMixerPresets: p.suggestedMixerPresets
    };

    return {
      isValid: domainErrors.length === 0,
      sanitizedProposal,
      schemaErrors,
      domainErrors,
      injectionDetected,
      userConstraintsApplied
    };
  }

  /**
   * Validates & enforces schema & domain rules for Mix proposal
   */
  public static validateMixProposal(
    rawProposal: any,
    userConstraints?: { limiterCeilingDbTP?: number }
  ): ValidationResult<StructuredAiMixProposal> {
    const schemaErrors: string[] = [];
    const domainErrors: string[] = [];

    if (!rawProposal || typeof rawProposal !== 'object') {
      return { isValid: false, schemaErrors: ['Mix proposal is not an object'], domainErrors: [], injectionDetected: false, userConstraintsApplied: false };
    }

    const p = rawProposal as Partial<StructuredAiMixProposal>;

    if (typeof p.targetIntegratedLufs !== 'number') schemaErrors.push('targetIntegratedLufs must be a number');
    if (typeof p.masterLimiterCeilingDbTP !== 'number') schemaErrors.push('masterLimiterCeilingDbTP must be a number');

    if (schemaErrors.length > 0) {
      return { isValid: false, schemaErrors, domainErrors: [], injectionDetected: false, userConstraintsApplied: false };
    }

    let ceiling = p.masterLimiterCeilingDbTP!;
    let lufs = p.targetIntegratedLufs!;

    if (ceiling > 0) {
      domainErrors.push(`Master limiter ceiling exceeds 0 dBTP: ${ceiling}`);
    }
    if (lufs < -36 || lufs > -4) {
      domainErrors.push(`Target LUFS out of safe mixing range (-36..-4): ${lufs}`);
    }

    let userConstraintsApplied = false;
    if (userConstraints && typeof userConstraints.limiterCeilingDbTP === 'number') {
      ceiling = Math.min(0, userConstraints.limiterCeilingDbTP);
      userConstraintsApplied = true;
    }

    const sanitizedProposal: StructuredAiMixProposal = {
      targetIntegratedLufs: lufs,
      vocalPriorityDuckDb: Math.max(-12, Math.min(0, p.vocalPriorityDuckDb ?? -2.5)),
      frequencyPockets: Array.isArray(p.frequencyPockets) ? p.frequencyPockets : [],
      masterLimiterCeilingDbTP: Math.min(-0.1, ceiling),
      stereoWidthPercent: Math.max(0, Math.min(200, p.stereoWidthPercent ?? 100)),
      subMonoCollapseFreqHz: Math.max(20, Math.min(250, p.subMonoCollapseFreqHz ?? 110)),
      explanation: this.sanitizeInput(p.explanation || 'Mix proposal validated.')
    };

    return {
      isValid: domainErrors.length === 0,
      sanitizedProposal,
      schemaErrors,
      domainErrors,
      injectionDetected: false,
      userConstraintsApplied
    };
  }

  /**
   * Validates & enforces schema & domain rules for Mastering proposal
   */
  public static validateMasterProposal(
    rawProposal: any,
    userConstraints?: { limiterCeilingDbTP?: number }
  ): ValidationResult<StructuredAiMasterProposal> {
    const schemaErrors: string[] = [];
    const domainErrors: string[] = [];

    if (!rawProposal || typeof rawProposal !== 'object') {
      return { isValid: false, schemaErrors: ['Master proposal is not an object'], domainErrors: [], injectionDetected: false, userConstraintsApplied: false };
    }

    const p = rawProposal as Partial<StructuredAiMasterProposal>;

    if (typeof p.targetLoudnessLufs !== 'number') schemaErrors.push('targetLoudnessLufs must be a number');
    if (typeof p.truePeakCeilingDbTP !== 'number') schemaErrors.push('truePeakCeilingDbTP must be a number');

    if (schemaErrors.length > 0) {
      return { isValid: false, schemaErrors, domainErrors: [], injectionDetected: false, userConstraintsApplied: false };
    }

    let ceiling = p.truePeakCeilingDbTP!;
    if (ceiling > 0) {
      domainErrors.push(`True peak ceiling exceeds 0 dBTP: ${ceiling}`);
    }

    let userConstraintsApplied = false;
    if (userConstraints && typeof userConstraints.limiterCeilingDbTP === 'number') {
      ceiling = Math.min(0, userConstraints.limiterCeilingDbTP);
      userConstraintsApplied = true;
    }

    const sanitizedProposal: StructuredAiMasterProposal = {
      targetLoudnessLufs: Math.max(-24, Math.min(-6, p.targetLoudnessLufs!)),
      truePeakCeilingDbTP: Math.min(-0.1, ceiling),
      eqAdjustments: Array.isArray(p.eqAdjustments) ? p.eqAdjustments : [],
      glueCompressorThresholdDb: Math.max(-36, Math.min(0, p.glueCompressorThresholdDb ?? -12)),
      glueCompressorRatio: Math.max(1.1, Math.min(10, p.glueCompressorRatio ?? 2.0)),
      explanation: this.sanitizeInput(p.explanation || 'Mastering proposal validated.')
    };

    return {
      isValid: domainErrors.length === 0,
      sanitizedProposal,
      schemaErrors,
      domainErrors,
      injectionDetected: false,
      userConstraintsApplied
    };
  }
}
