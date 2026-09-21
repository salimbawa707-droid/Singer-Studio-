/**
 * Phase 2: Audio Asset Schema & Integrity Models
 */

export type AssetType = 
  | 'raw_vocal' 
  | 'cleaned_vocal' 
  | 'stem' 
  | 'master' 
  | 'imported' 
  | 'recording' 
  | 'sample';

export interface AudioAsset {
  /** Unique stable asset identifier (e.g. ast-1710345600000-abcd) */
  id: string;
  /** ID of the project that owns/originated this asset */
  projectId: string;
  /** ID of the track using this asset, if applicable */
  trackId?: string;
  /** Human readable filename or descriptor */
  name: string;
  /** MIME type (e.g. audio/wav, audio/webm, audio/mp3) */
  mimeType: string;
  /** Duration in seconds */
  duration: number;
  /** Sampling frequency in Hz */
  sampleRate: number;
  /** Number of audio channels (1 = mono, 2 = stereo) */
  channels: number;
  /** Total binary byte size */
  byteLength: number;
  /** Cryptographic or deterministic SHA-256 / FNV hash of binary data */
  checksum: string;
  /** ISO timestamp when asset was created */
  createdAt: string;
  /** ISO timestamp when asset was last updated */
  updatedAt: string;
  /** Storage key in persistent binary repository */
  storageKey: string;
  /** Functional categorization */
  assetType: AssetType;
  /** Optional metadata tags */
  metadata?: Record<string, any>;
}

export interface AssetVerificationResult {
  assetId: string;
  exists: boolean;
  intact: boolean;
  error?: string;
  asset?: AudioAsset;
}

export interface DuplicateAssetGroup {
  checksum: string;
  byteLength: number;
  assets: AudioAsset[];
}
