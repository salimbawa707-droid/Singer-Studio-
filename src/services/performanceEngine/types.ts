/**
 * MUSICBASE / SURGE STUDIO — PHASE 10
 * PERFORMANCE, SCALABILITY, MEMORY & RUNTIME STABILITY ENGINE TYPES
 */

export type JobPriority = 
  | 'REALTIME_AUDIO'      // Priority 0 (highest)
  | 'USER_INTERACTIVE'    // Priority 1
  | 'RENDER'              // Priority 2
  | 'ANALYSIS'            // Priority 3
  | 'BACKGROUND_AI';      // Priority 4 (lowest)

export type JobStatus = 
  | 'QUEUED' 
  | 'RUNNING' 
  | 'PAUSED' 
  | 'CANCELLED' 
  | 'COMPLETED' 
  | 'FAILED';

export interface PerformanceJob<T = any> {
  id: string;
  type: string;
  priority: JobPriority;
  status: JobStatus;
  progress: number; // 0.0 to 1.0
  createdAt: number;
  startedAt?: number;
  completedAt?: number;
  error?: string;
  dependencies?: string[];
  cancellationToken?: { isCancelled: boolean; cancelReason?: string };
  execute: (job: PerformanceJob<T>) => Promise<T>;
}

export interface AudioBufferPoolStats {
  pooledArraysCount: number;
  totalPooledBytes: number;
  activeAllocationsCount: number;
  reusedAllocationsCount: number;
  evictionCount: number;
}

export interface AudioHealthReport {
  callbackIntervalMs: number;
  processingDurationMs: number;
  availableBudgetMs: number;
  audioCpuLoadRatio: number; // processingDurationMs / availableBudgetMs
  isOverloaded: boolean;
  dropoutCount: number;
  underrunCount: number;
  overrunCount: number;
  discontinuityCount: number;
}

export interface AnalysisVersionTag {
  assetId: string;
  assetVersion: number;
  analysisVersion: number;
}

export interface WaveformResolutionCache {
  assetId: string;
  assetVersion: number;
  pointsPerPixel: number;
  minMaxPeaks: Float32Array;
  sampleCount: number;
  cachedAt: number;
}

export interface PerformanceBudgetMetrics {
  subsystem: string;
  metricName: string;
  targetValue: number;
  measuredValue: number;
  unit: string;
  status: 'PASS' | 'PARTIAL' | 'FAIL' | 'BLOCKED' | 'NOT TESTED';
}

export interface SystemPerformanceAudit {
  timestamp: number;
  uiFrameTimeMs: number;
  audioCpuLoadPercent: number;
  dspProcessingTimeMs: number;
  renderRealtimeFactor: number;
  analysisTimeMs: number;
  projectLoadTimeMs: number;
  projectSaveTimeMs: number;
  assetImportTimeMs: number;
  exportTimeMs: number;
  aiLatencyMs: number;
  heapMemoryMB: number;
  peakMemoryMB: number;
  cpuUsagePercent: number;
  budgets: PerformanceBudgetMetrics[];
}
