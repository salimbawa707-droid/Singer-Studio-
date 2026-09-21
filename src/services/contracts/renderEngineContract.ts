/**
 * Phase 1 Architecture Contract: Canonical Render Engine Authority
 * 
 * Defines the single authoritative render pipeline for both interactive
 * real-time preview playback and final uncompressed master export.
 * 
 * Mandate: Preview Audio Graph == Export Mixdown Audio Graph
 */

import { StudioProject, ProjectTrack } from '../../types/audio';

export interface RenderPlan {
  projectId: string;
  bpm: number;
  key: string;
  scale: 'major' | 'minor';
  sampleRate: number;
  durationSeconds: number;
  tracks: ProjectTrack[];
  masterPreset?: string;
  masterIntensity?: number;
  masterBrightness?: number;
  masterWidth?: number;
}

export interface RenderResult {
  masterBuffer: AudioBuffer;
  stemBuffers: Map<string, AudioBuffer>;
  peakDb: number;
  lufsIntegrated: number;
  renderDurationMs: number;
}

export interface IRenderEngine {
  /**
   * Compiles the canonical project state into an immutable RenderPlan.
   */
  prepareRenderPlan(project: StudioProject): RenderPlan;

  /**
   * Renders the complete project audio graph deterministically.
   * Used for both Master Playback and Final File Export.
   */
  renderProject(project: StudioProject): Promise<RenderResult>;

  /**
   * Renders an individual stem in isolation while applying master bus context.
   */
  renderStem(track: ProjectTrack, plan: RenderPlan): Promise<AudioBuffer>;
}
