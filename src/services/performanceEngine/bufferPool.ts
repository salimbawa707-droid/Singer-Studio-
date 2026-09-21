/**
 * MUSICBASE / SURGE STUDIO — PHASE 10
 * AUDIO BUFFER POOL & MEMORY LIFECYCLE MANAGER
 * 
 * Reusable Float32Array & AudioBuffer pool to prevent allocations in real-time audio loop.
 * Enforces memory budgets and explicit LRU eviction for decoded audio assets.
 */

import { AudioBufferPoolStats } from './types';

export class AudioBufferPool {
  private static instance: AudioBufferPool;

  // Size buckets for Float32Array pooling: e.g., 128, 256, 512, 1024, 2048, 4096, 8192, 65536
  private pool: Map<number, Float32Array[]> = new Map();
  private activeAllocations = 0;
  private reusedAllocations = 0;
  private evictionCount = 0;
  private maxPoolSizePerBucket = 32;

  // Audio Asset LRU Cache (Limit audio assets in memory to 256 MB)
  private assetCache: Map<string, { buffer: any; bytes: number; lastAccessed: number }> = new Map();
  private maxAssetMemoryBytes = 256 * 1024 * 1024; // 256 MB
  private currentAssetMemoryBytes = 0;

  private constructor() {}

  public static getInstance(): AudioBufferPool {
    if (!AudioBufferPool.instance) {
      AudioBufferPool.instance = new AudioBufferPool();
    }
    return AudioBufferPool.instance;
  }

  /**
   * Acquires a Float32Array of specified size, reusing a pooled array if available
   */
  public acquire(length: number): Float32Array {
    const bucketSize = this.nextPowerOfTwo(length);
    const bucket = this.pool.get(bucketSize);

    if (bucket && bucket.length > 0) {
      const arr = bucket.pop()!;
      this.reusedAllocations++;
      arr.fill(0);
      return arr.subarray(0, length);
    }

    this.activeAllocations++;
    return new Float32Array(bucketSize).subarray(0, length);
  }

  /**
   * Releases a Float32Array back into the pool for reuse
   */
  public release(arr: Float32Array): void {
    if (!arr) return;
    const bucketSize = arr.buffer.byteLength / 4;
    let bucket = this.pool.get(bucketSize);
    if (!bucket) {
      bucket = [];
      this.pool.set(bucketSize, bucket);
    }

    if (bucket.length < this.maxPoolSizePerBucket) {
      bucket.push(new Float32Array(arr.buffer));
    } else {
      this.evictionCount++;
    }
  }

  /**
   * Registers a decoded AudioAsset buffer in LRU cache with memory limit enforcement
   */
  public registerAsset(assetId: string, audioBuffer: any): void {
    const channels = audioBuffer.numberOfChannels || 2;
    const length = audioBuffer.length || 0;
    const bytes = channels * length * 4;

    // Evict old assets if exceeding memory budget
    while (this.currentAssetMemoryBytes + bytes > this.maxAssetMemoryBytes && this.assetCache.size > 0) {
      let oldestKey: string | null = null;
      let oldestTime = Infinity;

      for (const [key, val] of this.assetCache.entries()) {
        if (val.lastAccessed < oldestTime) {
          oldestTime = val.lastAccessed;
          oldestKey = key;
        }
      }

      if (oldestKey) {
        const evicted = this.assetCache.get(oldestKey)!;
        this.currentAssetMemoryBytes -= evicted.bytes;
        this.assetCache.delete(oldestKey);
        this.evictionCount++;
      } else {
        break;
      }
    }

    this.assetCache.set(assetId, {
      buffer: audioBuffer,
      bytes,
      lastAccessed: Date.now()
    });
    this.currentAssetMemoryBytes += bytes;
  }

  /**
   * Retrieves a cached AudioAsset buffer, updating last accessed time
   */
  public getAsset(assetId: string): any | null {
    const entry = this.assetCache.get(assetId);
    if (!entry) return null;
    entry.lastAccessed = Date.now();
    return entry.buffer;
  }

  public getStats(): AudioBufferPoolStats {
    let pooledArraysCount = 0;
    let totalPooledBytes = 0;

    for (const [bucketSize, arrays] of this.pool.entries()) {
      pooledArraysCount += arrays.length;
      totalPooledBytes += arrays.length * bucketSize * 4;
    }

    return {
      pooledArraysCount,
      totalPooledBytes,
      activeAllocationsCount: this.activeAllocations,
      reusedAllocationsCount: this.reusedAllocations,
      evictionCount: this.evictionCount
    };
  }

  public getAssetMemoryUsageMB(): number {
    return this.currentAssetMemoryBytes / (1024 * 1024);
  }

  public clearAll(): void {
    this.pool.clear();
    this.assetCache.clear();
    this.currentAssetMemoryBytes = 0;
  }

  private nextPowerOfTwo(n: number): number {
    if (n <= 128) return 128;
    return Math.pow(2, Math.ceil(Math.log2(n)));
  }
}
