/**
 * Phase 2: Project Schema Versioning & Migration Boundary
 * 
 * Manages schema evolution and ensures backwards compatibility.
 * Safely migrates legacy project structures (v0/unversioned) to current canonical schema (v1+).
 */

import { StudioProject } from '../../types/audio';

export const CURRENT_SCHEMA_VERSION = 1;

export class ProjectMigration {
  /**
   * Checks if a project requires migration and upgrades it to the current schema.
   */
  public static migrate(rawProject: any): StudioProject {
    if (!rawProject || typeof rawProject !== 'object') {
      throw new Error('[ProjectMigration] Cannot migrate null or non-object project.');
    }

    const currentVersion = rawProject.schemaVersion ?? 0;

    let project: any = { ...rawProject };

    // Migration from v0 -> v1 (Legacy / unversioned to Canonical Schema v1)
    if (currentVersion < 1) {
      project = ProjectMigration.migrateV0ToV1(project);
    }

    // Future version migrations can be chained here:
    // if (currentVersion < 2) { project = ProjectMigration.migrateV1ToV2(project); }

    project.schemaVersion = CURRENT_SCHEMA_VERSION;
    return project as StudioProject;
  }

  /**
   * Migrate v0 (legacy unversioned project) to Canonical Schema v1.
   */
  private static migrateV0ToV1(legacy: any): any {
    const now = new Date().toISOString();

    const migrated: any = {
      schemaVersion: 1,
      revision: legacy.revision ?? 1,
      id: legacy.id || `proj-${Date.now()}`,
      title: legacy.title || 'Untitled Project',
      genre: legacy.genre || 'Pop Ballad',
      bpm: typeof legacy.bpm === 'number' && !isNaN(legacy.bpm) ? legacy.bpm : 120,
      key: legacy.key || 'C',
      scale: legacy.scale === 'minor' ? 'minor' : 'major',
      createdAt: legacy.createdAt || now,
      updatedAt: legacy.updatedAt || now,
      durationSeconds: legacy.durationSeconds ?? legacy.duration ?? 0,
      tracks: Array.isArray(legacy.tracks) ? legacy.tracks.map((t: any, idx: number) => ({
        id: t.id || `trk-${idx}-${Date.now()}`,
        name: t.name || `Track ${idx + 1}`,
        type: t.type || 'vocal',
        volume: typeof t.volume === 'number' ? Math.max(0, Math.min(1.5, t.volume)) : 0.9,
        pan: typeof t.pan === 'number' ? Math.max(-1, Math.min(1, t.pan)) : 0,
        isMuted: Boolean(t.isMuted),
        isSolo: Boolean(t.isSolo),
        assetId: t.assetId,
        color: t.color,
      })) : [],
      
      // Preserve asset references if existing
      rawVocalAssetId: legacy.rawVocalAssetId || null,
      cleanedVocalAssetId: legacy.cleanedVocalAssetId || null,
      masterMixAssetId: legacy.masterMixAssetId || null,
      
      isCleaned: Boolean(legacy.isCleaned),
      isMastered: Boolean(legacy.isMastered),
      masterPreset: legacy.masterPreset || 'Streaming Balanced',
      masterIntensity: legacy.masterIntensity ?? 70,
      masterBrightness: legacy.masterBrightness ?? 50,
      masterWidth: legacy.masterWidth ?? 50,
      
      lyrics: legacy.lyrics || '',
      selectedLanguage: legacy.selectedLanguage || 'en',
      semanticMode: legacy.semanticMode || 'auto',
      semanticAnalysis: legacy.semanticAnalysis || null,
      semanticArrangementSheet: legacy.semanticArrangementSheet || null,
      arrangementPlan: legacy.arrangementPlan || null,
      
      stage: legacy.stage || 'new',
      notes: legacy.notes || '',
    };

    return migrated;
  }
}
