import { ScreenId, StudioProject } from '../types/audio';
import { 
  Mic2, 
  Sparkles, 
  Activity, 
  Gauge, 
  Music, 
  Layers, 
  Sliders, 
  Zap, 
  Share2 
} from 'lucide-react';

export interface StageMeta {
  id: ScreenId;
  name: string;
  shortName: string;
  stepNumber: number;
  icon: any;
  description: string;
}

export const PRODUCTION_STAGES: StageMeta[] = [
  { id: 'record', name: 'Record / Import', shortName: 'Vocal', stepNumber: 1, icon: Mic2, description: 'Capture clean vocal take or import audio' },
  { id: 'cleanup', name: 'Vocal Cleanup', shortName: 'Cleanup', stepNumber: 2, icon: Sparkles, description: '7-stage studio DSP filtering' },
  { id: 'pitch', name: 'Pitch Tuner', shortName: 'Pitch', stepNumber: 3, icon: Activity, description: 'YIN fundamental frequency & note detection' },
  { id: 'bpm_key', name: 'BPM & Key', shortName: 'Tonality', stepNumber: 4, icon: Gauge, description: 'Tempo & musical scale detection' },
  { id: 'accompaniment', name: 'Instruments', shortName: 'Insts', stepNumber: 5, icon: Music, description: 'Select dynamic role instruments' },
  { id: 'pipeline', name: 'Arrangement', shortName: 'Arrange', stepNumber: 6, icon: Layers, description: 'Song structure & call-and-response intro' },
  { id: 'mixer', name: 'Studio Mixer', shortName: 'Mixer', stepNumber: 7, icon: Sliders, description: 'Multi-track faders, pan & mute/solo' },
  { id: 'mastering', name: 'DSP Mastering', shortName: 'Master', stepNumber: 8, icon: Zap, description: 'Loudness optimization & brickwall limiter' },
  { id: 'export', name: 'Lossless Export', shortName: 'Export', stepNumber: 9, icon: Share2, description: '16/24-bit WAV & 320kbps MP3 export' }
];

export const STAGE_ORDER: ScreenId[] = [
  'record',
  'cleanup',
  'pitch',
  'bpm_key',
  'accompaniment',
  'pipeline',
  'mixer',
  'mastering',
  'export'
];

/**
 * Determines the previous stage for non-destructive Back navigation.
 * Back must NEVER mean "Go to Home" on production screens.
 */
export function getPreviousProductionStage(currentScreen: ScreenId): ScreenId {
  switch (currentScreen) {
    case 'export':
      return 'mastering';
    case 'mastering':
      return 'mixer';
    case 'mixer':
      return 'pipeline';
    case 'pipeline':
      return 'accompaniment';
    case 'accompaniment':
      return 'bpm_key';
    case 'bpm_key':
      return 'pitch';
    case 'pitch':
      return 'cleanup';
    case 'cleanup':
      return 'record';
    case 'record':
      return 'home';
    default:
      return 'home';
  }
}

/**
 * Determines whether a stage is completed based on project state.
 */
export function isStageCompleted(project: StudioProject | null, stage: ScreenId): boolean {
  if (!project) return false;

  const hasVocal = (project.tracks || []).some(t => t.type === 'vocal' && t.audioBuffer) || !!project.cleanedVocalBuffer || !!project.rawVocalBuffer;
  const hasStems = (project.tracks || []).filter(t => t.type !== 'vocal').length > 0;

  switch (stage) {
    case 'record':
      return hasVocal;
    case 'cleanup':
      return !!project.isCleaned || !!project.cleanedVocalBuffer;
    case 'pitch':
      return !!project.detectedPitch;
    case 'bpm_key':
      return !!project.detectedBpmKey;
    case 'accompaniment':
      return (project.selectedInstruments && project.selectedInstruments.length > 0) || hasStems;
    case 'pipeline':
      return hasStems && !project.arrangementNeedsUpdate;
    case 'mixer':
      return hasStems && !project.mixerNeedsUpdate;
    case 'mastering':
      return !!project.isMastered && !project.masteringNeedsUpdate;
    case 'export':
      return !!project.isMastered && !project.exportNeedsUpdate;
    default:
      return false;
  }
}

/**
 * Checks if downstream stage needs an update due to upstream modifications.
 */
export function isStageNeedsUpdate(project: StudioProject | null, stage: ScreenId): boolean {
  if (!project) return false;

  switch (stage) {
    case 'pipeline':
      return !!project.arrangementNeedsUpdate;
    case 'mixer':
      return !!project.mixerNeedsUpdate;
    case 'mastering':
      return !!project.masteringNeedsUpdate;
    case 'export':
      return !!project.exportNeedsUpdate;
    default:
      return false;
  }
}

/**
 * Determines whether a stage is accessible to click directly.
 * Only stages with valid prerequisite data are accessible.
 */
export function canAccessStage(project: StudioProject | null, targetStage: ScreenId): boolean {
  if (targetStage === 'record' || targetStage === 'home' || targetStage === 'projects' || targetStage === 'settings') {
    return true;
  }

  if (!project) return false;

  const hasVocal = (project.tracks || []).some(t => t.type === 'vocal' && t.audioBuffer) || !!project.cleanedVocalBuffer || !!project.rawVocalBuffer;
  const hasStems = (project.tracks || []).filter(t => t.type !== 'vocal').length > 0;

  switch (targetStage) {
    case 'cleanup':
    case 'pitch':
    case 'bpm_key':
    case 'accompaniment':
      return hasVocal;
    case 'pipeline':
      return hasVocal || hasStems;
    case 'mixer':
      return hasStems || (project.tracks && project.tracks.length > 0);
    case 'mastering':
      return (project.tracks && project.tracks.length > 0);
    case 'export':
      return (project.tracks && project.tracks.length > 0);
    default:
      return true;
  }
}

/**
 * Smart logic: Determines the next logical production stage to continue.
 */
export function getNextProductionStage(project: StudioProject | null): ScreenId {
  if (!project) return 'record';

  const hasVocal = (project.tracks || []).some(t => t.type === 'vocal' && t.audioBuffer) || !!project.cleanedVocalBuffer || !!project.rawVocalBuffer;
  if (!hasVocal) return 'record';

  if (!project.isCleaned && !project.cleanedVocalBuffer) {
    return 'cleanup';
  }

  if (!project.detectedPitch) {
    return 'pitch';
  }

  if (!project.detectedBpmKey) {
    return 'bpm_key';
  }

  const hasStems = (project.tracks || []).filter(t => t.type !== 'vocal').length > 0;
  if (!hasStems || project.arrangementNeedsUpdate) {
    return 'pipeline';
  }

  if (project.mixerNeedsUpdate) {
    return 'mixer';
  }

  if (!project.isMastered || project.masteringNeedsUpdate) {
    return 'mastering';
  }

  return 'export';
}

/**
 * Maps screen ID to its 1-based index in the 9-stage pipeline.
 */
export function getStageIndex(screen: ScreenId): number {
  switch (screen) {
    case 'record': return 0;
    case 'cleanup': return 1;
    case 'pitch': return 2;
    case 'bpm_key': return 3;
    case 'accompaniment': return 4;
    case 'pipeline': return 5;
    case 'mixer': return 6;
    case 'mastering': return 7;
    case 'export': return 8;
    default: return 0;
  }
}
