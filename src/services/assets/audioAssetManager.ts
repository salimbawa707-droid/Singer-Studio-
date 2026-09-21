/**
 * Phase 2: Audio Asset Manager (AudioAssetManager)
 * 
 * Manages the lifecycle, persistent storage, integrity, and retrieval of audio binary assets.
 * Mandate:
 * - Stable IDs independent of filenames or URLs
 * - Storage of real binary data (Blob / ArrayBuffer) in persistent IndexedDB
 * - No dependency on ephemeral `blob:` URLs for permanent storage
 * - Checksum computation & duplicate asset detection
 * - Reference integrity & orphan asset detection
 */

import { AudioAsset, DuplicateAssetGroup } from '../../types/assets';
import { IndexedDbAdapter, STORES } from '../storage/indexedDbAdapter';
import { WebAudioEngine } from '../webAudioEngine';

export class AudioAssetManager {
  private static instance: AudioAssetManager;
  private dbAdapter: IndexedDbAdapter;

  private constructor() {
    this.dbAdapter = IndexedDbAdapter.getInstance();
  }

  public static getInstance(): AudioAssetManager {
    if (!AudioAssetManager.instance) {
      AudioAssetManager.instance = new AudioAssetManager();
    }
    return AudioAssetManager.instance;
  }

  /**
   * Computes a deterministic hexadecimal checksum (SHA-256 or FNV-1a fallback).
   */
  public async calculateChecksum(buffer: ArrayBuffer | Uint8Array): Promise<string> {
    const bytes = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
    
    // Attempt standard Web Crypto API if available
    if (typeof crypto !== 'undefined' && crypto.subtle && typeof crypto.subtle.digest === 'function') {
      try {
        // For very large buffers (> 8MB), sample uniformly to maintain UI smoothness
        let dataToDigest: ArrayBuffer;
        if (bytes.byteLength > 8 * 1024 * 1024) {
          const sample = new Uint8Array(512 * 1024);
          const step = Math.floor(bytes.byteLength / sample.byteLength);
          for (let i = 0; i < sample.byteLength; i++) {
            sample[i] = bytes[i * step];
          }
          dataToDigest = sample.buffer;
        } else {
          // If Uint8Array is backed by a shared/offset buffer, copy exact slice
          dataToDigest = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength);
        }

        const digest = await crypto.subtle.digest('SHA-256', dataToDigest);
        const hashArray = Array.from(new Uint8Array(digest));
        return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
      } catch {
        // Fallback to FNV-1a if crypto fails
      }
    }

    // High performance FNV-1a 64-bit hash fallback
    let h1 = 0x811c9dc5;
    let h2 = 0x1000193;
    const len = bytes.length;
    const stride = len > 100000 ? Math.floor(len / 50000) : 1;

    for (let i = 0; i < len; i += stride) {
      h1 = Math.imul(h1 ^ bytes[i], 16777619);
      h2 = Math.imul(h2 ^ bytes[i], 1099511628211);
    }

    return `${(h1 >>> 0).toString(16).padStart(8, '0')}${(h2 >>> 0).toString(16).padStart(8, '0')}-${len}`;
  }

  /**
   * Stores raw binary audio (Blob, ArrayBuffer, or AudioBuffer) as a persistent AudioAsset.
   */
  public async storeAsset(
    projectId: string,
    data: Blob | ArrayBuffer | AudioBuffer,
    metadata: Partial<AudioAsset> = {}
  ): Promise<AudioAsset> {
    let binaryData: ArrayBuffer;
    let mimeType = metadata.mimeType || 'audio/wav';
    let duration = metadata.duration || 0;
    let sampleRate = metadata.sampleRate || 44100;
    let channels = metadata.channels || 2;

    if (typeof AudioBuffer !== 'undefined' && data instanceof AudioBuffer) {
      duration = data.duration;
      sampleRate = data.sampleRate;
      channels = data.numberOfChannels;
      mimeType = 'audio/wav';
      const wavBlob = WebAudioEngine.getInstance().audioBufferToWavBlob(data, 16);
      binaryData = await wavBlob.arrayBuffer();
    } else if (data instanceof Blob) {
      mimeType = data.type || mimeType;
      binaryData = await data.arrayBuffer();
    } else if (data instanceof ArrayBuffer) {
      binaryData = data;
    } else if (ArrayBuffer.isView(data)) {
      const view = data as ArrayBufferView;
      binaryData = view.buffer.slice(view.byteOffset, view.byteOffset + view.byteLength);
    } else {
      throw new Error('Unsupported audio asset payload data type');
    }

    const byteLength = binaryData.byteLength;
    const checksum = metadata.checksum || await this.calculateChecksum(binaryData);
    const assetId = metadata.id || `ast-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
    const storageKey = `payload-${assetId}`;
    const now = new Date().toISOString();

    const assetRecord: AudioAsset = {
      id: assetId,
      projectId,
      trackId: metadata.trackId,
      name: metadata.name || `Audio Asset ${new Date().toLocaleTimeString()}`,
      mimeType,
      duration,
      sampleRate,
      channels,
      byteLength,
      checksum,
      createdAt: metadata.createdAt || now,
      updatedAt: now,
      storageKey,
      assetType: metadata.assetType || 'recording',
      metadata: metadata.metadata || {},
    };

    // 1. Store payload binary
    await this.dbAdapter.set(STORES.ASSET_PAYLOADS, storageKey, binaryData);

    // 2. Store asset metadata record
    await this.dbAdapter.set(STORES.ASSETS, assetId, assetRecord);

    return assetRecord;
  }

  /**
   * Retrieves asset metadata by ID.
   */
  public async getAsset(assetId: string): Promise<AudioAsset | null> {
    return await this.dbAdapter.get<AudioAsset>(STORES.ASSETS, assetId);
  }

  /**
   * Retrieves raw binary ArrayBuffer for an asset.
   */
  public async getAssetArrayBuffer(assetId: string): Promise<ArrayBuffer | null> {
    const asset = await this.getAsset(assetId);
    if (!asset) return null;

    const payload = await this.dbAdapter.get<any>(STORES.ASSET_PAYLOADS, asset.storageKey);
    if (!payload) return null;

    if (payload instanceof ArrayBuffer) {
      return payload;
    }
    if (payload instanceof Blob) {
      return await payload.arrayBuffer();
    }
    if (ArrayBuffer.isView(payload)) {
      const view = payload as ArrayBufferView;
      return view.buffer.slice(view.byteOffset, view.byteOffset + view.byteLength);
    }
    if (typeof payload === 'object' && payload !== null) {
      const raw = payload.payload || payload.data || payload.buffer;
      if (raw instanceof ArrayBuffer) return raw;
      if (raw instanceof Blob) return await raw.arrayBuffer();
      if (ArrayBuffer.isView(raw)) {
        const view = raw as ArrayBufferView;
        return view.buffer.slice(view.byteOffset, view.byteOffset + view.byteLength);
      }
    }
    return null;
  }

  /**
   * Retrieves binary Blob for an asset.
   */
  public async getAssetBlob(assetId: string): Promise<Blob | null> {
    const asset = await this.getAsset(assetId);
    if (!asset) return null;

    const arrayBuffer = await this.getAssetArrayBuffer(assetId);
    if (!arrayBuffer) return null;

    return new Blob([arrayBuffer], { type: asset.mimeType || 'audio/wav' });
  }

  /**
   * Decodes an asset into an active WebAudio AudioBuffer for playback.
   */
  public async getAssetAudioBuffer(assetId: string, ctx?: AudioContext): Promise<AudioBuffer | null> {
    const arrayBuffer = await this.getAssetArrayBuffer(assetId);
    if (!arrayBuffer || !(arrayBuffer instanceof ArrayBuffer) || typeof arrayBuffer.slice !== 'function') {
      console.warn(`[AudioAssetManager] No valid ArrayBuffer available for asset ${assetId}`);
      return null;
    }

    const audioContext = ctx || WebAudioEngine.getInstance().getContext();
    try {
      // Decode copy of buffer to prevent detachment
      const copy = arrayBuffer.slice(0);
      return await audioContext.decodeAudioData(copy);
    } catch (err) {
      console.error(`[AudioAssetManager] Failed to decode audio data for asset ${assetId}:`, err);
      return null;
    }
  }

  /**
   * Deletes an audio asset and its underlying binary payload.
   */
  public async deleteAsset(assetId: string): Promise<boolean> {
    const asset = await this.getAsset(assetId);
    if (asset) {
      await this.dbAdapter.delete(STORES.ASSET_PAYLOADS, asset.storageKey);
    }
    return await this.dbAdapter.delete(STORES.ASSETS, assetId);
  }

  /**
   * Lists all assets associated with a specific project ID.
   */
  public async listAssetsForProject(projectId: string): Promise<AudioAsset[]> {
    const all = await this.dbAdapter.list<AudioAsset>(STORES.ASSETS);
    return all.filter(a => a.projectId === projectId);
  }

  /**
   * Lists all stored audio assets.
   */
  public async listAllAssets(): Promise<AudioAsset[]> {
    return await this.dbAdapter.list<AudioAsset>(STORES.ASSETS);
  }

  /**
   * Detects duplicate binary assets across the system based on checksum.
   */
  public async detectDuplicates(): Promise<DuplicateAssetGroup[]> {
    const all = await this.listAllAssets();
    const groups = new Map<string, AudioAsset[]>();

    all.forEach(asset => {
      const existing = groups.get(asset.checksum) || [];
      existing.push(asset);
      groups.set(asset.checksum, existing);
    });

    const duplicates: DuplicateAssetGroup[] = [];
    groups.forEach((assets, checksum) => {
      if (assets.length > 1) {
        duplicates.push({
          checksum,
          byteLength: assets[0].byteLength,
          assets,
        });
      }
    });

    return duplicates;
  }

  /**
   * Finds orphaned assets that are not referenced by any project.
   */
  public async detectOrphans(referencedAssetIds: Set<string>): Promise<AudioAsset[]> {
    const all = await this.listAllAssets();
    return all.filter(a => !referencedAssetIds.has(a.id));
  }

  /**
   * Safely deletes specified orphaned assets.
   */
  public async deleteOrphanAssets(orphanIds: string[]): Promise<number> {
    let deletedCount = 0;
    for (const id of orphanIds) {
      const deleted = await this.deleteAsset(id);
      if (deleted) deletedCount++;
    }
    return deletedCount;
  }

  /**
   * Duplicates an asset reference for a cloned project without needlessly duplicating binary storage.
   */
  public async duplicateAssetForProject(originalAssetId: string, newProjectId: string): Promise<AudioAsset | null> {
    const original = await this.getAsset(originalAssetId);
    if (!original) return null;

    const newAssetId = `ast-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
    const now = new Date().toISOString();

    const clonedRecord: AudioAsset = {
      ...original,
      id: newAssetId,
      projectId: newProjectId,
      createdAt: now,
      updatedAt: now,
      // Shared immutable storage key (avoids 100MB redundant memory cloning)
      storageKey: original.storageKey,
    };

    await this.dbAdapter.set(STORES.ASSETS, newAssetId, clonedRecord);
    return clonedRecord;
  }
}
