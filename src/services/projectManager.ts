/**
 * Phase 2 Architecture: Unified Persistent Studio Controller (ProjectManager)
 * 
 * Orchestrates:
 * 1. Project lifecycle (create, open, save, autosave, rename, duplicate, delete, recover)
 * 2. Persistent storage via ProjectRepository & IndexedDB
 * 3. Audio asset storage & binary retrieval via AudioAssetManager
 * 4. Missing asset detection & recovery (No synthetic audio fallbacks)
 * 5. Track state management & non-destructive invalidation tracking
 */

import { 
  StudioProject, 
  ProjectTrack, 
  StudioTrack, 
  ProductionStage, 
  SaveStatus,
  DspPipelineSettings,
  PitchAnalysisResult,
  BpmKeyResult
} from '../types/audio';
import { 
  CanonicalMusicPlan, 
  CanonicalArrangement, 
  CanonicalMusicalIntent 
} from '../types/musicPlan';
import { MixPlan } from '../types/mixPlan';
import { MasterPlan } from '../types/masterPlan';
import { FinalRender } from '../types/finalRender';
import { SongIdentity, MusicalMemory, IdentityLockKey, MemoryEvent } from '../types/songIdentityMemory';
import { SongIdentityEngine } from './aiMusicalBrain/songIdentityEngine';
import { ProjectRepository, RecoveryCheckResult } from './storage/projectRepository';
import { AudioAssetManager } from './assets/audioAssetManager';
import { WebAudioEngine } from './webAudioEngine';
import { AudioValidationService } from './audioValidationService';

export class ProjectManager {
  private static instance: ProjectManager;
  private repository: ProjectRepository;
  private assetManager: AudioAssetManager;

  private projects: StudioProject[] = [];
  private currentProjectId: string | null = null;
  private isInitialized: boolean = false;

  private saveStatus: SaveStatus = 'saved';
  private autosaveTimer: any = null;
  private missingAssets: Map<string, string[]> = new Map(); // projectId -> array of missing asset IDs

  private listeners: Array<(projects: StudioProject[], activeProject: StudioProject | null) => void> = [];
  private saveStatusListeners: Array<(status: SaveStatus) => void> = [];
  private missingAssetListeners: Array<(projectId: string, missingIds: string[]) => void> = [];

  private constructor() {
    this.repository = ProjectRepository.getInstance();
    this.assetManager = AudioAssetManager.getInstance();
  }

  public static getInstance(): ProjectManager {
    if (!ProjectManager.instance) {
      ProjectManager.instance = new ProjectManager();
    }
    return ProjectManager.instance;
  }

  /**
   * Initializes the repository, loading all persisted projects.
   */
  public async init(): Promise<void> {
    if (this.isInitialized) return;

    try {
      this.projects = await this.repository.listProjects();
      if (this.projects.length > 0 && !this.currentProjectId) {
        this.currentProjectId = this.projects[0].id;
      }
      this.isInitialized = true;
      this.notify();

      // Hydrate audio for the active project
      if (this.currentProjectId) {
        await this.hydrateProjectAudio(this.currentProjectId);
      }
    } catch (err) {
      console.error('[ProjectManager] Failed to initialize project repository:', err);
      this.setSaveStatus('error');
    }
  }

  public subscribe(listener: (projects: StudioProject[], activeProject: StudioProject | null) => void): () => void {
    this.listeners.push(listener);
    listener(this.projects, this.getActiveProject());
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  public subscribeSaveStatus(listener: (status: SaveStatus) => void): () => void {
    this.saveStatusListeners.push(listener);
    listener(this.saveStatus);
    return () => {
      this.saveStatusListeners = this.saveStatusListeners.filter(l => l !== listener);
    };
  }

  public subscribeMissingAssets(listener: (projectId: string, missingIds: string[]) => void): () => void {
    this.missingAssetListeners.push(listener);
    return () => {
      this.missingAssetListeners = this.missingAssetListeners.filter(l => l !== listener);
    };
  }

  private setSaveStatus(status: SaveStatus) {
    this.saveStatus = status;
    this.saveStatusListeners.forEach(l => l(status));
  }

  private notify() {
    const active = this.getActiveProject();
    this.listeners.forEach(l => l(this.projects, active));
  }

  public getProjects(): StudioProject[] {
    return [...this.projects];
  }

  public getActiveProject(): StudioProject | null {
    if (!this.currentProjectId) {
      return this.projects[0] || null;
    }
    return this.projects.find(p => p.id === this.currentProjectId) || this.projects[0] || null;
  }

  public getProject(projectId: string): StudioProject | null {
    return this.projects.find(p => p.id === projectId) || null;
  }

  public getSaveStatus(): SaveStatus {
    return this.saveStatus;
  }

  public getMissingAssetsForProject(projectId: string): string[] {
    return this.missingAssets.get(projectId) || [];
  }

  /**
   * Switches active project and hydrates its persistent audio assets into memory.
   */
  public async setActiveProject(id: string | null): Promise<void> {
    if (this.currentProjectId === id) return;

    // Flush any pending autosave for current project before switching
    if (this.autosaveTimer) {
      clearTimeout(this.autosaveTimer);
      this.autosaveTimer = null;
      if (this.currentProjectId) {
        const current = this.getActiveProject();
        if (current) await this.repository.saveProject(current);
      }
    }

    this.currentProjectId = id;
    this.notify();

    if (id) {
      await this.hydrateProjectAudio(id);
    }
  }

  /**
   * Hydrates persistent audio assets from AudioAssetManager into active AudioBuffers.
   * If an asset is missing, records it in missingAssets instead of injecting fake synthetic audio.
   */
  public async hydrateProjectAudio(projectId: string): Promise<void> {
    const project = this.projects.find(p => p.id === projectId);
    if (!project) return;

    const ctx = WebAudioEngine.getInstance().getContext();
    const missing: string[] = [];
    let stateChanged = false;

    // 1. Hydrate raw vocal
    if (project.rawVocalAssetId && !project.rawVocalBuffer) {
      const buffer = await this.assetManager.getAssetAudioBuffer(project.rawVocalAssetId, ctx);
      if (buffer) {
        project.rawVocalBuffer = buffer;
        stateChanged = true;
      } else {
        missing.push(project.rawVocalAssetId);
      }
    }

    // 2. Hydrate cleaned vocal
    if (project.cleanedVocalAssetId && !project.cleanedVocalBuffer) {
      const buffer = await this.assetManager.getAssetAudioBuffer(project.cleanedVocalAssetId, ctx);
      if (buffer) {
        project.cleanedVocalBuffer = buffer;
        stateChanged = true;
      } else {
        missing.push(project.cleanedVocalAssetId);
      }
    }

    // 3. Hydrate track buffers
    for (const track of project.tracks || []) {
      if (track.assetId && !track.audioBuffer) {
        const buffer = await this.assetManager.getAssetAudioBuffer(track.assetId, ctx);
        if (buffer) {
          track.audioBuffer = buffer;
          stateChanged = true;
        } else {
          missing.push(track.assetId);
        }
      }
    }

    if (missing.length > 0) {
      this.missingAssets.set(projectId, missing);
      this.missingAssetListeners.forEach(l => l(projectId, missing));
      console.warn(`[ProjectManager] Missing audio assets detected for project ${projectId}:`, missing);
    } else {
      this.missingAssets.delete(projectId);
    }

    if (stateChanged) {
      this.notify();
    }
  }

  /**
   * Creates a new persistent project and activates it.
   */
  public async createProject(title: string, genre: string = 'Pop Ballad'): Promise<StudioProject> {
    const newProject = await this.repository.createProject(title, genre);
    this.projects = [newProject, ...this.projects];
    this.currentProjectId = newProject.id;
    this.setSaveStatus('saved');
    this.notify();
    return newProject;
  }

  /**
   * Deletes a project and performs reference-counted cleanup of audio assets.
   */
  public async deleteProject(projectId: string): Promise<boolean> {
    const success = await this.repository.deleteProject(projectId);
    if (success) {
      this.projects = this.projects.filter(p => p.id !== projectId);
      this.missingAssets.delete(projectId);
      if (this.currentProjectId === projectId) {
        this.currentProjectId = this.projects[0]?.id || null;
        if (this.currentProjectId) {
          await this.hydrateProjectAudio(this.currentProjectId);
        }
      }
      this.notify();
    }
    return success;
  }

  /**
   * Renames a project in persistent storage.
   */
  public async renameProject(projectId: string, newTitle: string): Promise<void> {
    const updated = await this.repository.renameProject(projectId, newTitle);
    this.projects = this.projects.map(p => p.id === projectId ? { ...p, title: updated.title, updatedAt: updated.updatedAt } : p);
    this.notify();
  }

  /**
   * Duplicates a project, cloning tracks and asset references safely.
   */
  public async duplicateProject(projectId: string, newTitle?: string): Promise<StudioProject> {
    const duplicated = await this.repository.duplicateProject(projectId, newTitle);
    this.projects = [duplicated, ...this.projects];
    this.currentProjectId = duplicated.id;
    this.notify();
    await this.hydrateProjectAudio(duplicated.id);
    return duplicated;
  }

  /**
   * Schedules a debounced atomic save.
   */
  public scheduleAutosave(): void {
    this.setSaveStatus('unsaved');
    if (this.autosaveTimer) {
      clearTimeout(this.autosaveTimer);
    }

    // Save intermediate draft checkpoint immediately for crash-safety
    const active = this.getActiveProject();
    if (active) {
      this.repository.saveDraft(active).catch(err => {
        console.warn('[ProjectManager] Failed to write draft checkpoint:', err);
      });
    }

    this.autosaveTimer = setTimeout(async () => {
      await this.saveActiveProjectNow();
    }, 1000);
  }

  /**
   * Forces immediate atomic save of the active project.
   */
  public async saveActiveProjectNow(): Promise<StudioProject | null> {
    const active = this.getActiveProject();
    if (!active) return null;

    if (this.autosaveTimer) {
      clearTimeout(this.autosaveTimer);
      this.autosaveTimer = null;
    }

    try {
      this.setSaveStatus('saving');
      const saved = await this.repository.saveProject(active);
      
      // Update in-memory project record timestamp
      this.projects = this.projects.map(p => p.id === saved.id ? { ...p, updatedAt: saved.updatedAt, revision: saved.revision } : p);
      this.setSaveStatus('saved');
      this.notify();
      return saved;
    } catch (err) {
      console.error('[ProjectManager] Save failed:', err);
      this.setSaveStatus('error');
      return null;
    }
  }

  /**
   * Updates project in memory and schedules autosave.
   */
  public updateProject(projectId: string, updates: Partial<StudioProject>): void {
    this.projects = this.projects.map(p => 
      p.id === projectId ? { ...p, ...updates, updatedAt: new Date().toISOString() } : p
    );
    this.notify();
    this.scheduleAutosave();
  }

  public setProjectStage(projectId: string, stage: ProductionStage): void {
    this.updateProject(projectId, { stage });
  }

  /**
   * Persists recorded or imported vocal audio into AudioAssetManager and links to project.
   */
  public async setVocalTrack(
    projectId: string, 
    buffer: AudioBuffer, 
    capturedLyrics?: string, 
    audioBlob?: Blob
  ): Promise<void> {
    const project = this.projects.find(p => p.id === projectId);
    if (!project) return;

    // Validate Audio Buffer Integrity
    const qualityReport = AudioValidationService.getInstance().validateAudioBuffer(buffer);
    if (!qualityReport.isValid) {
      console.warn('[ProjectManager] Audio validation warning:', qualityReport.errorMessage);
    }

    // 1. Store vocal binary asset
    const payload = audioBlob || buffer;
    const asset = await this.assetManager.storeAsset(projectId, payload, {
      name: `${project.title} - Lead Vocal`,
      mimeType: 'audio/wav',
      duration: buffer.duration,
      sampleRate: buffer.sampleRate,
      channels: buffer.numberOfChannels,
      assetType: 'raw_vocal',
    });

    const existingVocal = project.tracks.find(t => t.type === 'vocal');
    const newTrack: StudioTrack = {
      id: existingVocal?.id || `trk-vocal-${Date.now()}`,
      name: existingVocal?.name || 'Lead Vocal',
      type: 'vocal',
      volume: existingVocal ? existingVocal.volume : 0.9,
      pan: existingVocal ? existingVocal.pan : 0,
      isMuted: existingVocal ? existingVocal.isMuted : false,
      isSolo: existingVocal ? existingVocal.isSolo : false,
      audioBuffer: buffer,
      assetId: asset.id,
    };

    this.updateProject(projectId, {
      lyrics: capturedLyrics?.trim() ? capturedLyrics.trim() : (project.lyrics || ''),
      rawVocalBuffer: buffer,
      rawVocalAssetId: asset.id,
      cleanedVocalBuffer: null,
      cleanedVocalAssetId: null,
      isCleaned: false,
      cleanupSettings: undefined,
      cleanedAt: undefined,
      // Invalidate previous analysis for stale buffer
      detectedPitch: null,
      detectedBpmKey: null,
      vocalSongMap: null,
      analysisEngineVersion: undefined,
      analysisTimestamp: undefined,
      analysisSourceAssetId: undefined,
      recordingQualityReport: qualityReport,
      arrangementNeedsUpdate: true,
      mixerNeedsUpdate: true,
      masteringNeedsUpdate: true,
      exportNeedsUpdate: true,
      tracks: [newTrack, ...(project.tracks || []).filter(t => t.type !== 'vocal')],
      durationSeconds: Math.max(project.durationSeconds || 0, Math.round(buffer.duration)),
    });
  }

  /**
   * Persists cleaned vocal audio asset into storage.
   */
  public async applyCleanedVocal(
    projectId: string, 
    cleanedBuffer: AudioBuffer,
    settings?: DspPipelineSettings
  ): Promise<void> {
    const project = this.projects.find(p => p.id === projectId);
    if (!project) return;

    // Validate Cleaned Audio Fidelity if raw audio exists
    if (project.rawVocalBuffer) {
      const fidelityReport = AudioValidationService.getInstance().validateCleanupFidelity(
        project.rawVocalBuffer,
        cleanedBuffer
      );
      if (!fidelityReport.isValid) {
        console.warn('[ProjectManager] Cleaned audio fidelity warning:', fidelityReport.errorMessage);
      }
    }

    const asset = await this.assetManager.storeAsset(projectId, cleanedBuffer, {
      name: `${project.title} - Cleaned Vocal`,
      mimeType: 'audio/wav',
      duration: cleanedBuffer.duration,
      sampleRate: cleanedBuffer.sampleRate,
      channels: cleanedBuffer.numberOfChannels,
      assetType: 'cleaned_vocal',
    });

    this.updateProject(projectId, {
      cleanedVocalBuffer: cleanedBuffer,
      cleanedVocalAssetId: asset.id,
      isCleaned: true,
      cleanupSettings: settings,
      cleanedAt: new Date().toISOString(),
      arrangementNeedsUpdate: true,
      mixerNeedsUpdate: true,
      masteringNeedsUpdate: true,
      exportNeedsUpdate: true,
      tracks: project.tracks.map(t => t.type === 'vocal' ? { ...t, audioBuffer: cleanedBuffer, assetId: asset.id } : t),
    });
  }

  /**
   * Stores persistent pitch, BPM, key, and vocal map analysis on the canonical project.
   */
  public updateVocalAnalysis(
    projectId: string,
    pitch?: PitchAnalysisResult | null,
    bpmKey?: BpmKeyResult | null,
    vocalMap?: any | null
  ): void {
    const project = this.projects.find(p => p.id === projectId);
    if (!project) return;

    const updates: Partial<StudioProject> = {
      analysisEngineVersion: 1,
      analysisTimestamp: new Date().toISOString(),
      analysisSourceAssetId: project.cleanedVocalAssetId || project.rawVocalAssetId || undefined,
    };

    if (pitch !== undefined) {
      updates.detectedPitch = pitch;
    }
    if (bpmKey !== undefined && bpmKey !== null) {
      updates.detectedBpmKey = bpmKey;
      updates.bpm = bpmKey.bpm;
      updates.key = bpmKey.key;
      updates.scale = (bpmKey.scale.toLowerCase() === 'minor' ? 'minor' : 'major');
    }
    if (vocalMap !== undefined) {
      updates.vocalSongMap = vocalMap;
    }

    this.updateProject(projectId, updates);
  }

  /**
   * Imports an external audio file into a new or current project.
   */
  public async importAudioFile(file: File, targetProjectId?: string): Promise<StudioProject> {
    const arrayBuffer = await file.arrayBuffer();
    const ctx = WebAudioEngine.getInstance().getContext();
    const buffer = await ctx.decodeAudioData(arrayBuffer.slice(0));

    // Validate imported audio buffer
    const qualityReport = AudioValidationService.getInstance().validateAudioBuffer(buffer);
    if (!qualityReport.isValid) {
      throw new Error(`Import failed: ${qualityReport.errorMessage}`);
    }

    let project: StudioProject;
    if (targetProjectId) {
      const existing = this.projects.find(p => p.id === targetProjectId);
      if (!existing) throw new Error(`Project ${targetProjectId} not found.`);
      project = existing;
    } else {
      const songTitle = file.name.replace(/\.[^/.]+$/, '') || `Imported Track ${this.projects.length + 1}`;
      project = await this.createProject(songTitle, 'Pop Ballad');
    }

    const asset = await this.assetManager.storeAsset(project.id, arrayBuffer, {
      name: file.name,
      mimeType: file.type || 'audio/wav',
      duration: buffer.duration,
      sampleRate: buffer.sampleRate,
      channels: buffer.numberOfChannels,
      assetType: 'imported',
    });

    const newTrack: StudioTrack = {
      id: `trk-import-${Date.now()}`,
      name: file.name.replace(/\.[^/.]+$/, '') || 'Imported Audio',
      type: 'vocal',
      volume: 0.9,
      pan: 0,
      isMuted: false,
      isSolo: false,
      audioBuffer: buffer,
      assetId: asset.id,
    };

    this.updateProject(project.id, {
      rawVocalBuffer: buffer,
      rawVocalAssetId: asset.id,
      cleanedVocalBuffer: null,
      cleanedVocalAssetId: null,
      isCleaned: false,
      cleanupSettings: undefined,
      cleanedAt: undefined,
      detectedPitch: null,
      detectedBpmKey: null,
      vocalSongMap: null,
      analysisEngineVersion: undefined,
      analysisTimestamp: undefined,
      analysisSourceAssetId: undefined,
      recordingQualityReport: qualityReport,
      stage: 'cleaning',
      tracks: [newTrack, ...(project.tracks || []).filter(t => t.id !== newTrack.id)],
      durationSeconds: Math.round(buffer.duration),
    });

    return this.getActiveProject() || project;
  }

  /**
   * Sets Canonical Music Plan in persistent project.
   */
  public setCanonicalMusicPlan(projectId: string, plan: CanonicalMusicPlan): void {
    const project = this.projects.find(p => p.id === projectId);
    if (!project) return;

    this.updateProject(projectId, {
      musicPlan: plan,
      bpm: plan.tempo,
      key: plan.key,
      scale: (plan.mode.toLowerCase() === 'minor' ? 'minor' : 'major'),
      arrangementNeedsUpdate: true,
    });
  }

  /**
   * Sets Canonical Realized Arrangement in persistent project.
   */
  public setCanonicalArrangement(projectId: string, arrangement: CanonicalArrangement): void {
    const project = this.projects.find(p => p.id === projectId);
    if (!project) return;

    this.updateProject(projectId, {
      canonicalArrangement: arrangement,
      durationSeconds: Math.round(arrangement.totalDurationSeconds),
      arrangementNeedsUpdate: false,
      mixerNeedsUpdate: false,
      masteringNeedsUpdate: true,
      exportNeedsUpdate: true,
    });
  }

  /**
   * Sets Canonical MixPlan in persistent project and invalidates final render.
   */
  public setMixPlan(projectId: string, mixPlan: MixPlan): void {
    const project = this.projects.find(p => p.id === projectId);
    if (!project) return;

    const sourceMixVersion = (project.sourceMixVersion || 1) + 1;

    this.updateProject(projectId, {
      mixPlan,
      sourceMixVersion,
      mixerNeedsUpdate: false,
      masteringNeedsUpdate: true,
      exportNeedsUpdate: true,
      finalRender: project.finalRender ? { ...project.finalRender, status: 'INVALIDATED' } : undefined
    });
  }

  /**
   * Sets Canonical MasterPlan in persistent project.
   */
  public setMasterPlan(projectId: string, masterPlan: MasterPlan): void {
    const project = this.projects.find(p => p.id === projectId);
    if (!project) return;

    const masterPlanVersion = (project.masterPlanVersion || 1) + 1;

    this.updateProject(projectId, {
      masterPlan,
      masterPlanVersion,
      masteringNeedsUpdate: false,
      exportNeedsUpdate: true,
      finalRender: project.finalRender ? { ...project.finalRender, status: 'INVALIDATED' } : undefined
    });
  }

  /**
   * Stores Canonical FinalRender metadata and PCM output in project.
   */
  public setFinalRender(projectId: string, finalRender: FinalRender): void {
    const project = this.projects.find(p => p.id === projectId);
    if (!project) return;

    this.updateProject(projectId, {
      finalRender,
      isMastered: finalRender.status === 'VALIDATED',
      masteringNeedsUpdate: false,
      exportNeedsUpdate: false,
      stage: 'completed',
    });
  }

  /**
   * Explicitly invalidates any existing FinalRender when upstream sources change.
   */
  public invalidateFinalRender(projectId: string): void {
    const project = this.projects.find(p => p.id === projectId);
    if (!project || !project.finalRender) return;

    this.updateProject(projectId, {
      finalRender: { ...project.finalRender, status: 'INVALIDATED' },
      masteringNeedsUpdate: true,
      exportNeedsUpdate: true
    });
  }

  /**
   * Sets multi-track arrangement while persisting stem assets.
   */
  public async setArrangedTracks(
    projectId: string, 
    newTracks: ProjectTrack[], 
    totalDuration: number, 
    plan?: any
  ): Promise<void> {
    const project = this.projects.find(p => p.id === projectId);
    if (!project) return;

    // Asynchronously store stem assets in the background
    const processedTracks: ProjectTrack[] = [];
    for (const trk of newTracks) {
      let assetId = trk.assetId;
      if (!assetId && trk.audioBuffer) {
        try {
          const asset = await this.assetManager.storeAsset(projectId, trk.audioBuffer, {
            name: `${project.title} - ${trk.name}`,
            mimeType: 'audio/wav',
            duration: trk.audioBuffer.duration,
            sampleRate: trk.audioBuffer.sampleRate,
            channels: trk.audioBuffer.numberOfChannels,
            assetType: 'stem',
          });
          assetId = asset.id;
        } catch (e) {
          console.warn(`[ProjectManager] Could not persist stem asset for track ${trk.name}:`, e);
        }
      }
      processedTracks.push({ ...trk, assetId });
    }

    const existingTrackMap = new Map<string, ProjectTrack>();
    (project.tracks || []).forEach(t => {
      existingTrackMap.set(t.type, t);
      existingTrackMap.set(t.name.toLowerCase(), t);
    });

    const mergedTracks = processedTracks.map(newTrk => {
      const match = existingTrackMap.get(newTrk.type) || existingTrackMap.get(newTrk.name.toLowerCase());
      if (match) {
        return {
          ...newTrk,
          volume: match.volume,
          pan: match.pan,
          isMuted: match.isMuted,
          isSolo: match.isSolo,
        };
      }
      return newTrk;
    });

    this.updateProject(projectId, {
      tracks: mergedTracks,
      durationSeconds: Math.round(totalDuration),
      stage: 'arranging',
      arrangementPlan: plan || project.arrangementPlan,
      lyrics: (plan?.semanticAnalysis?.rawLyrics) || project.lyrics,
      semanticAnalysis: (plan?.semanticAnalysis) || project.semanticAnalysis,
      selectedLanguage: (plan?.semanticAnalysis?.detectedLanguage) || project.selectedLanguage,
      semanticMode: (plan?.semanticAnalysis?.semanticMode) || project.semanticMode,
      arrangementNeedsUpdate: false,
      mixerNeedsUpdate: false,
      masteringNeedsUpdate: true,
      exportNeedsUpdate: true,
    });
  }

  /**
   * Checks for recoverable draft sessions.
   */
  public async checkRecovery(projectId: string): Promise<RecoveryCheckResult> {
    return await this.repository.checkRecoveryAvailable(projectId);
  }

  /**
   * Restores a recoverable session.
   */
  public async recoverDraft(projectId: string): Promise<StudioProject | null> {
    const recovered = await this.repository.recoverProject(projectId);
    if (recovered) {
      this.projects = this.projects.map(p => p.id === projectId ? recovered : p);
      this.notify();
      await this.hydrateProjectAudio(projectId);
    }
    return recovered;
  }

  // ==========================================
  // PHASE 11: SONG IDENTITY & MUSICAL MEMORY
  // ==========================================

  public getSongIdentity(projectId?: string): SongIdentity | null {
    const id = projectId || this.currentProjectId;
    if (!id) return null;
    const proj = this.projects.find(p => p.id === id);
    return proj?.songIdentity || null;
  }

  public getMusicalMemory(projectId?: string): MusicalMemory | null {
    const id = projectId || this.currentProjectId;
    if (!id) return null;
    const proj = this.projects.find(p => p.id === id);
    return proj?.musicalMemory || null;
  }

  public updateSongIdentity(projectId: string, identityUpdate: Partial<SongIdentity>): void {
    const proj = this.projects.find(p => p.id === projectId);
    if (!proj) return;

    const syntheticUmr: any = {
      metadata: {
        songId: proj.id,
        sampleRate: 44100,
        totalDuration: proj.durationSeconds || 60,
        totalBeats: Math.floor((proj.durationSeconds || 60) * ((proj.bpm || 120) / 60)),
        totalSamples: 44100 * (proj.durationSeconds || 60),
        bpm: proj.bpm || 120,
        key: proj.key || 'C',
        scale: proj.scale || 'major',
        meter: '4/4',
        generatedAt: new Date().toISOString(),
        version: 'phase_5_prompt_1'
      },
      phrases: [],
      motifClusters: []
    };

    const currentIdentity = proj.songIdentity || SongIdentityEngine.getInstance().extractSongIdentity(
      syntheticUmr,
      undefined,
      undefined,
      proj.id,
      proj.id,
      proj.title
    );

    const updatedIdentity: SongIdentity = {
      ...currentIdentity,
      ...identityUpdate,
      updatedAtTimestamp: Date.now()
    };

    this.updateProject(projectId, {
      songIdentity: updatedIdentity
    });
  }

  public lockIdentityParameter(
    projectId: string,
    lockKey: IdentityLockKey,
    lockedValue: any,
    lockedBy: 'user' | 'system' = 'user',
    reason?: string
  ): void {
    const identity = this.getSongIdentity(projectId);
    if (!identity) return;

    const updatedLocks = { ...(identity.locks || SongIdentityEngine.getInstance().createDefaultLocks()) };
    updatedLocks[lockKey] = {
      lockKey,
      isLocked: true,
      lockedValue,
      lockedBy,
      lockedAtTimestamp: Date.now(),
      reason
    };

    this.updateSongIdentity(projectId, { locks: updatedLocks });

    this.recordMemoryEvent(projectId, {
      type: 'IDENTITY_LOCKED',
      source: lockedBy === 'user' ? 'USER' : 'SYSTEM_DERIVED',
      newValue: { lockKey, lockedValue },
      reason,
      projectVersion: (this.getProject(projectId)?.revision || 1)
    });
  }

  public unlockIdentityParameter(projectId: string, lockKey: IdentityLockKey): void {
    const identity = this.getSongIdentity(projectId);
    if (!identity) return;

    const updatedLocks = { ...(identity.locks || SongIdentityEngine.getInstance().createDefaultLocks()) };
    if (updatedLocks[lockKey]) {
      updatedLocks[lockKey] = {
        ...updatedLocks[lockKey],
        isLocked: false
      };
    }

    this.updateSongIdentity(projectId, { locks: updatedLocks });

    this.recordMemoryEvent(projectId, {
      type: 'IDENTITY_UNLOCKED',
      source: 'USER',
      newValue: { lockKey },
      projectVersion: (this.getProject(projectId)?.revision || 1)
    });
  }

  public recordMemoryEvent(
    projectId: string,
    eventData: Omit<MemoryEvent, 'id' | 'timestamp' | 'projectId' | 'songId'>
  ): MemoryEvent | null {
    const proj = this.projects.find(p => p.id === projectId);
    if (!proj) return null;

    let memory = proj.musicalMemory;
    if (!memory) {
      const songId = proj.songIdentity?.songId || `song_${proj.id}`;
      memory = SongIdentityEngine.getInstance().createEmptyMusicalMemory(projectId, songId);
    }

    const recordedEvent = SongIdentityEngine.getInstance().recordMemoryEvent(memory, eventData);

    this.updateProject(projectId, {
      musicalMemory: { ...memory }
    });

    return recordedEvent;
  }
}
