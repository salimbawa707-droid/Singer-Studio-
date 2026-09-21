/**
 * Phase 2: Canonical Project Repository (ProjectRepository)
 * 
 * Central data access layer for StudioProject entities.
 * Features:
 * - Atomic persistence to IndexedDB
 * - Schema validation & migration on read/write
 * - Crash-safe draft & recovery checkpoints
 * - Safe reference-counted deletion (protecting shared audio assets)
 * - Safe duplication with asset reference remapping
 */

import { StudioProject, ProjectTrack } from '../../types/audio';
import { IndexedDbAdapter, STORES } from './indexedDbAdapter';
import { ProjectValidator } from './projectValidator';
import { ProjectMigration, CURRENT_SCHEMA_VERSION } from './projectMigration';
import { AudioAssetManager } from '../assets/audioAssetManager';
import { SongIdentityEngine } from '../aiMusicalBrain/songIdentityEngine';
import { SongIdentity, MusicalMemory } from '../../types/songIdentityMemory';

export interface RecoveryCheckResult {
  available: boolean;
  draft?: StudioProject;
  saved?: StudioProject;
  reason?: string;
}

export class ProjectRepository {
  private static instance: ProjectRepository;
  private dbAdapter: IndexedDbAdapter;
  private assetManager: AudioAssetManager;

  private constructor() {
    this.dbAdapter = IndexedDbAdapter.getInstance();
    this.assetManager = AudioAssetManager.getInstance();
  }

  public static getInstance(): ProjectRepository {
    if (!ProjectRepository.instance) {
      ProjectRepository.instance = new ProjectRepository();
    }
    return ProjectRepository.instance;
  }

  /**
   * Creates and persists a new canonical StudioProject.
   */
  public async createProject(title: string, genre: string = 'Pop Ballad'): Promise<StudioProject> {
    const now = new Date().toISOString();
    const projectId = `proj-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const songId = `song-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;

    const syntheticUmr: any = {
      metadata: { songId, bpm: 120, key: 'C', scale: 'major', meter: '4/4' },
      phrases: [],
      motifClusters: []
    };

    const identity = SongIdentityEngine.getInstance().extractSongIdentity(
      syntheticUmr,
      undefined,
      undefined,
      songId,
      projectId,
      title.trim() || 'Untitled Session'
    );
    const memory = SongIdentityEngine.getInstance().createEmptyMusicalMemory(projectId, songId);

    const newProject: StudioProject = {
      schemaVersion: CURRENT_SCHEMA_VERSION,
      revision: 1,
      id: projectId,
      title: title.trim() || 'Untitled Session',
      genre,
      bpm: 120,
      key: 'C',
      scale: 'major',
      tracks: [],
      createdAt: now,
      updatedAt: now,
      durationSeconds: 0,
      stage: 'new',
      songIdentity: identity,
      musicalMemory: memory,
    };

    return await this.saveProject(newProject);
  }

  /**
   * Retrieves a project by ID, migrating and validating schema automatically.
   */
  public async getProject(projectId: string): Promise<StudioProject | null> {
    const raw = await this.dbAdapter.get<any>(STORES.PROJECTS, projectId);
    if (!raw) return null;

    // Migrate if needed
    const migrated = ProjectMigration.migrate(raw);

    // Validate
    const validation = ProjectValidator.validate(migrated);
    if (!validation.valid) {
      console.warn(`[ProjectRepository] Project ${projectId} has validation warnings/errors:`, validation.errors);
    }

    return migrated;
  }

  /**
   * Lists all persisted projects ordered by updatedAt descending.
   */
  public async listProjects(): Promise<StudioProject[]> {
    const rawList = await this.dbAdapter.list<any>(STORES.PROJECTS);
    const migratedList = rawList.map(raw => {
      try {
        return ProjectMigration.migrate(raw);
      } catch (err) {
        console.error('[ProjectRepository] Failed to migrate project during list:', err);
        return raw;
      }
    });

    // Sort newest first
    return migratedList.sort((a, b) => {
      const timeA = new Date(a.updatedAt || 0).getTime();
      const timeB = new Date(b.updatedAt || 0).getTime();
      return timeB - timeA;
    });
  }

  /**
   * Strips transient runtime in-memory AudioBuffers before serializing to DB.
   */
  private serializeForStorage(project: StudioProject): StudioProject {
    const clone: StudioProject = {
      ...project,
      schemaVersion: CURRENT_SCHEMA_VERSION,
      revision: (project.revision ?? 0) + 1,
      updatedAt: new Date().toISOString(),
      rawVocalBuffer: null,
      cleanedVocalBuffer: null,
      tracks: (project.tracks || []).map(t => ({
        ...t,
        audioBuffer: null,
        audioBlob: null,
      })),
    };

    return clone;
  }

  /**
   * Persists a project atomically.
   */
  public async saveProject(project: StudioProject): Promise<StudioProject> {
    const storable = this.serializeForStorage(project);

    // Validate
    const validation = ProjectValidator.validate(storable);
    if (!validation.valid) {
      throw new Error(`[ProjectRepository] Cannot save invalid project: ${validation.errors.join(', ')}`);
    }

    // Save to primary store
    await this.dbAdapter.set(STORES.PROJECTS, storable.id, storable);

    // Discard any active draft since committed
    await this.discardDraft(storable.id);

    return storable;
  }

  /**
   * Saves an uncommitted draft checkpoint (for crash safety & recovery).
   */
  public async saveDraft(project: StudioProject): Promise<void> {
    const storable = this.serializeForStorage(project);
    await this.dbAdapter.set(STORES.PROJECT_DRAFTS, storable.id, storable);
  }

  /**
   * Retrieves draft checkpoint for a project.
   */
  public async getDraft(projectId: string): Promise<StudioProject | null> {
    const raw = await this.dbAdapter.get<any>(STORES.PROJECT_DRAFTS, projectId);
    return raw ? ProjectMigration.migrate(raw) : null;
  }

  /**
   * Discards an uncommitted draft checkpoint.
   */
  public async discardDraft(projectId: string): Promise<void> {
    await this.dbAdapter.delete(STORES.PROJECT_DRAFTS, projectId);
  }

  /**
   * Checks whether a recoverable draft exists that is newer than the saved project.
   */
  public async checkRecoveryAvailable(projectId: string): Promise<RecoveryCheckResult> {
    const saved = await this.getProject(projectId);
    const draft = await this.getDraft(projectId);

    if (!draft) {
      return { available: false, saved: saved || undefined };
    }

    if (!saved) {
      return { available: true, draft, reason: 'Unsaved project found in recovery store.' };
    }

    const savedTime = new Date(saved.updatedAt).getTime();
    const draftTime = new Date(draft.updatedAt).getTime();

    if (draftTime > savedTime + 2000) { // Draft is noticeably newer
      return { available: true, draft, saved, reason: 'Uncommitted changes recovered from previous session.' };
    }

    return { available: false, saved };
  }

  /**
   * Recovers and commits a project from its draft checkpoint.
   */
  public async recoverProject(projectId: string): Promise<StudioProject | null> {
    const draft = await this.getDraft(projectId);
    if (!draft) return null;

    await this.saveProject(draft);
    return draft;
  }

  /**
   * Renames a project without altering IDs or breaking asset links.
   */
  public async renameProject(projectId: string, newTitle: string): Promise<StudioProject> {
    const project = await this.getProject(projectId);
    if (!project) {
      throw new Error(`[ProjectRepository] Project ${projectId} not found for rename.`);
    }

    const updated: StudioProject = {
      ...project,
      title: newTitle.trim() || project.title,
    };

    return await this.saveProject(updated);
  }

  /**
   * Duplicates a project with a new ID, duplicating asset references safely.
   */
  public async duplicateProject(projectId: string, newTitle?: string): Promise<StudioProject> {
    const original = await this.getProject(projectId);
    if (!original) {
      throw new Error(`[ProjectRepository] Project ${projectId} not found for duplication.`);
    }

    const now = new Date().toISOString();
    const newProjectId = `proj-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const clonedTitle = newTitle || `${original.title} (Copy)`;

    // Map existing asset references to new project asset descriptors
    const assetIdMap = new Map<string, string>();

    const duplicatedTracks: ProjectTrack[] = [];
    for (const track of original.tracks || []) {
      let newAssetId: string | undefined = undefined;

      if (track.assetId) {
        const clonedAsset = await this.assetManager.duplicateAssetForProject(track.assetId, newProjectId);
        if (clonedAsset) {
          newAssetId = clonedAsset.id;
          assetIdMap.set(track.assetId, clonedAsset.id);
        }
      }

      duplicatedTracks.push({
        ...track,
        id: `trk-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        assetId: newAssetId || track.assetId,
      });
    }

    let rawVocalAssetId = original.rawVocalAssetId;
    if (rawVocalAssetId && assetIdMap.has(rawVocalAssetId)) {
      rawVocalAssetId = assetIdMap.get(rawVocalAssetId)!;
    } else if (rawVocalAssetId) {
      const cloned = await this.assetManager.duplicateAssetForProject(rawVocalAssetId, newProjectId);
      if (cloned) rawVocalAssetId = cloned.id;
    }

    let cleanedVocalAssetId = original.cleanedVocalAssetId;
    if (cleanedVocalAssetId && assetIdMap.has(cleanedVocalAssetId)) {
      cleanedVocalAssetId = assetIdMap.get(cleanedVocalAssetId)!;
    } else if (cleanedVocalAssetId) {
      const cloned = await this.assetManager.duplicateAssetForProject(cleanedVocalAssetId, newProjectId);
      if (cloned) cleanedVocalAssetId = cloned.id;
    }

    let clonedIdentity: SongIdentity | undefined = undefined;
    if (original.songIdentity) {
      clonedIdentity = JSON.parse(JSON.stringify(original.songIdentity));
      clonedIdentity!.projectId = newProjectId;
      clonedIdentity!.songId = `song-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
      clonedIdentity!.updatedAtTimestamp = Date.now();
    }

    let clonedMemory: MusicalMemory | undefined = undefined;
    if (original.musicalMemory) {
      clonedMemory = JSON.parse(JSON.stringify(original.musicalMemory));
      clonedMemory!.projectId = newProjectId;
      if (clonedIdentity) {
        clonedMemory!.songId = clonedIdentity.songId;
      }
      clonedMemory!.updatedAt = Date.now();
    }

    const clonedProject: StudioProject = {
      ...original,
      schemaVersion: CURRENT_SCHEMA_VERSION,
      revision: 1,
      id: newProjectId,
      title: clonedTitle,
      createdAt: now,
      updatedAt: now,
      tracks: duplicatedTracks,
      rawVocalAssetId,
      cleanedVocalAssetId,
      masterMixAssetId: null, // Clear master render cache for clone
      songIdentity: clonedIdentity,
      musicalMemory: clonedMemory,
    };

    return await this.saveProject(clonedProject);
  }

  /**
   * Deletes a project and performs reference-counted cleanup of unshared audio assets.
   */
  public async deleteProject(projectId: string): Promise<boolean> {
    const projectToDelete = await this.getProject(projectId);
    if (!projectToDelete) {
      return false;
    }

    // 1. Find all asset IDs referenced by this project
    const projectAssetIds = new Set<string>();
    if (projectToDelete.rawVocalAssetId) projectAssetIds.add(projectToDelete.rawVocalAssetId);
    if (projectToDelete.cleanedVocalAssetId) projectAssetIds.add(projectToDelete.cleanedVocalAssetId);
    if (projectToDelete.masterMixAssetId) projectAssetIds.add(projectToDelete.masterMixAssetId);
    (projectToDelete.tracks || []).forEach(t => {
      if (t.assetId) projectAssetIds.add(t.assetId);
    });

    // 2. Query ALL other projects to protect shared assets
    const allProjects = await this.listProjects();
    const otherProjects = allProjects.filter(p => p.id !== projectId);
    const otherReferencedAssetIds = new Set<string>();

    otherProjects.forEach(p => {
      if (p.rawVocalAssetId) otherReferencedAssetIds.add(p.rawVocalAssetId);
      if (p.cleanedVocalAssetId) otherReferencedAssetIds.add(p.cleanedVocalAssetId);
      if (p.masterMixAssetId) otherReferencedAssetIds.add(p.masterMixAssetId);
      (p.tracks || []).forEach(t => {
        if (t.assetId) otherReferencedAssetIds.add(t.assetId);
      });
    });

    // 3. Delete only assets NOT referenced by any other project
    for (const assetId of projectAssetIds) {
      if (!otherReferencedAssetIds.has(assetId)) {
        await this.assetManager.deleteAsset(assetId);
      }
    }

    // 4. Delete project record and draft
    await this.discardDraft(projectId);
    return await this.dbAdapter.delete(STORES.PROJECTS, projectId);
  }

  /**
   * Checks whether a project exists.
   */
  public async projectExists(projectId: string): Promise<boolean> {
    return await this.dbAdapter.has(STORES.PROJECTS, projectId);
  }

  /**
   * Returns a set of all asset IDs referenced across all projects in the database.
   */
  public async getAllReferencedAssetIds(): Promise<Set<string>> {
    const allProjects = await this.listProjects();
    const referenced = new Set<string>();

    allProjects.forEach(p => {
      if (p.rawVocalAssetId) referenced.add(p.rawVocalAssetId);
      if (p.cleanedVocalAssetId) referenced.add(p.cleanedVocalAssetId);
      if (p.masterMixAssetId) referenced.add(p.masterMixAssetId);
      (p.tracks || []).forEach(t => {
        if (t.assetId) referenced.add(t.assetId);
      });
    });

    return referenced;
  }
}
