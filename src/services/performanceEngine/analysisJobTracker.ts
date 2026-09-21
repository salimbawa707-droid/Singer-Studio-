/**
 * MUSICBASE / SURGE STUDIO — PHASE 10
 * ASYNC ANALYSIS JOB VERSIONING & STALE RESULT GUARD
 * 
 * Enforces:
 * AnalysisRequest { assetId, assetVersion, analysisVersion }
 * If source changes while analysis is running, OLD RESULT MUST NOT OVERWRITE NEW STATE.
 */

import { AnalysisVersionTag } from './types';

export class AnalysisJobTracker {
  private static instance: AnalysisJobTracker;

  // Current version counter per assetId
  private assetVersions: Map<string, number> = new Map();
  // Latest completed analysis version per assetId
  private completedAnalysisVersions: Map<string, number> = new Map();

  private constructor() {}

  public static getInstance(): AnalysisJobTracker {
    if (!AnalysisJobTracker.instance) {
      AnalysisJobTracker.instance = new AnalysisJobTracker();
    }
    return AnalysisJobTracker.instance;
  }

  /**
   * Generates a new analysis version tag for an asset operation
   */
  public createVersionTag(assetId: string): AnalysisVersionTag {
    const currentVer = (this.assetVersions.get(assetId) || 0) + 1;
    this.assetVersions.set(assetId, currentVer);

    return {
      assetId,
      assetVersion: currentVer,
      analysisVersion: currentVer
    };
  }

  /**
   * Invalidates asset versions when project audio asset is modified
   */
  public invalidateAsset(assetId: string): void {
    const currentVer = (this.assetVersions.get(assetId) || 0) + 1;
    this.assetVersions.set(assetId, currentVer);
  }

  /**
   * Validates if a finished asynchronous analysis result is still fresh and valid to apply
   */
  public isValidResult(tag: AnalysisVersionTag): boolean {
    const currentAssetVer = this.assetVersions.get(tag.assetId) || 0;
    
    // If current asset version is higher than tag version, asset changed while job ran -> STALE!
    if (tag.assetVersion < currentAssetVer) {
      return false;
    }

    return true;
  }

  /**
   * Commits analysis result version tag upon valid state mutation
   */
  public commitResult(tag: AnalysisVersionTag): boolean {
    if (!this.isValidResult(tag)) {
      return false;
    }
    this.completedAnalysisVersions.set(tag.assetId, tag.analysisVersion);
    return true;
  }

  public getLatestVersion(assetId: string): number {
    return this.assetVersions.get(assetId) || 0;
  }

  public clearAll(): void {
    this.assetVersions.clear();
    this.completedAnalysisVersions.clear();
  }
}
