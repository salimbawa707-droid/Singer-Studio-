/**
 * MUSICBASE / SURGE STUDIO — PHASE 10
 * MULTI-RESOLUTION WAVEFORM CACHE MANAGER
 * 
 * Prevents redrawing millions of raw Float32 samples directly into UI.
 * Generates decimated min/max peak envelope arrays for fast visual rendering.
 */

import { WaveformResolutionCache } from './types';

export class WaveformCacheManager {
  private static instance: WaveformCacheManager;

  private cache: Map<string, WaveformResolutionCache> = new Map();

  private constructor() {}

  public static getInstance(): WaveformCacheManager {
    if (!WaveformCacheManager.instance) {
      WaveformCacheManager.instance = new WaveformCacheManager();
    }
    return WaveformCacheManager.instance;
  }

  /**
   * Generates or retrieves a multi-resolution peak envelope for display
   */
  public getOrGeneratePeaks(
    assetId: string,
    assetVersion: number,
    channelData: Float32Array,
    targetWidthPixels: number = 1000
  ): Float32Array {
    const cacheKey = `${assetId}_v${assetVersion}_px${targetWidthPixels}`;
    const existing = this.cache.get(cacheKey);

    if (existing && existing.assetVersion === assetVersion) {
      return existing.minMaxPeaks;
    }

    // Decimate raw samples into min/max peak pairs (2 floats per display point)
    const samplesCount = channelData.length;
    const blockSize = Math.max(1, Math.floor(samplesCount / targetWidthPixels));
    const peaks = new Float32Array(targetWidthPixels * 2);

    for (let i = 0; i < targetWidthPixels; i++) {
      const start = i * blockSize;
      const end = Math.min(start + blockSize, samplesCount);
      let min = 1.0;
      let max = -1.0;

      for (let j = start; j < end; j++) {
        const val = channelData[j];
        if (val < min) min = val;
        if (val > max) max = val;
      }

      peaks[i * 2] = min === 1.0 ? 0 : min;
      peaks[i * 2 + 1] = max === -1.0 ? 0 : max;
    }

    this.cache.set(cacheKey, {
      assetId,
      assetVersion,
      pointsPerPixel: blockSize,
      minMaxPeaks: peaks,
      sampleCount: samplesCount,
      cachedAt: Date.now()
    });

    return peaks;
  }

  /**
   * Invalidates cached waveforms when an asset version is updated
   */
  public invalidateAsset(assetId: string): void {
    for (const key of this.cache.keys()) {
      if (key.startsWith(assetId)) {
        this.cache.delete(key);
      }
    }
  }

  public clearAll(): void {
    this.cache.clear();
  }
}
