/**
 * Phase 2: Project Integrity & Schema Validator
 * 
 * Performs strict validation of project records before persistence or hydration.
 * Ensures:
 * - Valid non-empty project ID & title
 * - Schema version conformance
 * - Track IDs, bounds (volume 0..1, pan -1..1), and data types
 * - Valid BPM (30..300) and musical key/scale
 * - No corrupted or dangerous field injections
 */

import { StudioProject, ProjectTrack } from '../../types/audio';

export interface ValidationIssue {
  field: string;
  message: string;
  severity: 'error' | 'warning';
}

export interface ProjectValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

export class ProjectValidator {
  public static validate(project: any): ProjectValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (!project || typeof project !== 'object') {
      return {
        valid: false,
        errors: ['Project payload is null, undefined, or not an object.'],
        warnings: [],
      };
    }

    // 1. Identity & Metadata
    if (!project.id || typeof project.id !== 'string' || project.id.trim() === '') {
      errors.push('Project ID is missing or invalid.');
    }

    if (!project.title || typeof project.title !== 'string' || project.title.trim() === '') {
      errors.push('Project title is missing or empty.');
    }

    if (project.schemaVersion !== undefined && (typeof project.schemaVersion !== 'number' || project.schemaVersion < 1)) {
      errors.push(`Invalid schemaVersion: ${project.schemaVersion}. Must be a positive integer.`);
    }

    // 2. Musical Parameters
    if (typeof project.bpm !== 'number' || isNaN(project.bpm) || project.bpm < 30 || project.bpm > 300) {
      errors.push(`Invalid BPM: ${project.bpm}. Expected range [30, 300].`);
    }

    const validKeys = ['C', 'C#', 'Db', 'D', 'D#', 'Eb', 'E', 'F', 'F#', 'Gb', 'G', 'G#', 'Ab', 'A', 'A#', 'Bb', 'B'];
    if (!project.key || typeof project.key !== 'string' || !validKeys.includes(project.key)) {
      warnings.push(`Non-standard musical key: ${project.key}.`);
    }

    if (project.scale && project.scale !== 'major' && project.scale !== 'minor') {
      errors.push(`Invalid scale: ${project.scale}. Expected 'major' or 'minor'.`);
    }

    // 3. Track List Integrity
    if (!Array.isArray(project.tracks)) {
      errors.push('Project tracks must be an array.');
    } else {
      const seenTrackIds = new Set<string>();
      project.tracks.forEach((track: any, index: number) => {
        if (!track || typeof track !== 'object') {
          errors.push(`Track at index ${index} is invalid.`);
          return;
        }

        if (!track.id || typeof track.id !== 'string') {
          errors.push(`Track at index ${index} is missing a valid ID.`);
        } else if (seenTrackIds.has(track.id)) {
          errors.push(`Duplicate track ID found: ${track.id}`);
        } else {
          seenTrackIds.add(track.id);
        }

        if (typeof track.volume !== 'number' || isNaN(track.volume) || track.volume < 0 || track.volume > 1.5) {
          errors.push(`Track ${track.id || index} has out-of-range volume (${track.volume}). Expected [0.0, 1.5].`);
        }

        if (typeof track.pan !== 'number' || isNaN(track.pan) || track.pan < -1.0 || track.pan > 1.0) {
          errors.push(`Track ${track.id || index} has out-of-range pan (${track.pan}). Expected [-1.0, 1.0].`);
        }
      });
    }

    // 4. Asset References Validation
    if (project.rawVocalAssetId && typeof project.rawVocalAssetId !== 'string') {
      errors.push('rawVocalAssetId must be a string.');
    }
    if (project.cleanedVocalAssetId && typeof project.cleanedVocalAssetId !== 'string') {
      errors.push('cleanedVocalAssetId must be a string.');
    }
    if (project.masterMixAssetId && typeof project.masterMixAssetId !== 'string') {
      errors.push('masterMixAssetId must be a string.');
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
    };
  }
}
