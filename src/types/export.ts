/**
 * SURGE STUDIO / MUSICBASE — CANONICAL EXPORT & PACKAGING TYPES (PHASE 8)
 * 
 * Defines all structures for Final Audio Export, Stem Packages, Project Archives,
 * Web/Android Delivery, Manifests, and Lifecycle States.
 */

export type ExportFormat = 'wav16' | 'wav24' | 'wav32float' | 'mp3';
export type Mp3Bitrate = 128 | 192 | 256 | 320;
export type SampleRateOption = 44100 | 48000 | 96000;

export type ExportLifecycleState = 
  | 'IDLE' 
  | 'VALIDATING' 
  | 'RENDER_REQUIRED' 
  | 'EXPORTING' 
  | 'VERIFYING' 
  | 'COMPLETED' 
  | 'FAILED';

export interface ExportOptions {
  format: ExportFormat;
  sampleRate: SampleRateOption;
  bitDepth?: 16 | 24 | 32;
  bitrate?: Mp3Bitrate;
  channels?: 1 | 2;
  normalize: boolean; // Default false to preserve FinalRender LUFS/peak
  includeMetadata: boolean;
  filename?: string;
}

export interface ExportManifest {
  exportId: string;
  projectId: string;
  projectName: string;
  renderId: string;
  mixPlanVersion: number;
  masterPlanVersion: number;
  renderEngineVersion: string;
  exportEngineVersion: string;
  sampleRate: number;
  channels: number;
  durationSeconds: number;
  format: ExportFormat;
  bitDepth: number;
  bitrateKbps?: number;
  integratedLUFS: number;
  truePeakDbTP: number;
  checksum: string;
  fileSizeBytes: number;
  createdAt: string;
  sourceVersion: number;
  validationPassed: boolean;
}

export interface MasterExportResult {
  blob: Blob;
  url: string;
  filename: string;
  fileSizeBytes: number;
  manifest: ExportManifest;
  checksum: string;
  state: ExportLifecycleState;
  validationReport: {
    passed: boolean;
    hasFiniteSamples: boolean;
    validFormatHeader: boolean;
    durationSeconds: number;
    details: string;
  };
}

export interface StemExportOptions {
  format: ExportFormat;
  sampleRate: SampleRateOption;
  bitrate?: Mp3Bitrate;
  normalizeIndividualStems: boolean;
  normalizeMasterMix: boolean;
  includeMasterBus: boolean;
}

export interface StemDescriptor {
  trackId: string;
  trackName: string;
  trackRole: string;
  filename: string;
  blob: Blob;
  fileSizeBytes: number;
  durationSeconds: number;
  checksum: string;
}

export interface StemExportResult {
  zipBlob: Blob;
  zipUrl: string;
  totalSizeMb: number;
  stemFiles: StemDescriptor[];
  masterBlob?: Blob;
  masterUrl?: string;
  manifest: ExportManifest;
  summationTestReport: {
    passed: boolean;
    maxPeakDeltaDb: number;
    rmsDelta: number;
    details: string;
  };
}

export interface ProjectPackageOptions {
  includeAudioSources?: boolean;
  includeRenders?: boolean;
  compressionLevel?: number;
}

export interface PackagedAssetMeta {
  assetId: string;
  filename: string;
  relativePath: string;
  fileSizeBytes: number;
  checksum: string;
  sampleRate: number;
  channels: number;
  durationSeconds: number;
}

export interface ProjectPackageResult {
  zipBlob: Blob;
  zipUrl: string;
  filename: string;
  totalSizeMb: number;
  fileCount: number;
  assetManifest: PackagedAssetMeta[];
  manifest: ExportManifest;
}

export interface ProjectImportResult {
  passed: boolean;
  project: any;
  manifest: any;
  recoveredAssetsCount: number;
  details: string[];
}

export interface WebAppExportResult {
  zipBlob: Blob;
  zipUrl: string;
  filename: string;
  totalSizeMb: number;
  manifest: ExportManifest;
  offlineVerified: boolean;
}

export interface AndroidApkResult {
  apkBlob?: Blob;
  apkUrl: string;
  filename: string;
  fileSizeBytes: number;
  manifest: ExportManifest;
  isPackageValid: boolean;
  hasNativeLibraries: boolean;
  hasWebAssets: boolean;
  details: string;
}
