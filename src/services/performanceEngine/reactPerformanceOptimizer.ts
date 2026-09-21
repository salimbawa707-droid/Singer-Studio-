/**
 * MUSICBASE / SURGE STUDIO — PHASE 10
 * REACT & UI PERFORMANCE OPTIMIZER
 * 
 * Provides state selector memoization, frame budget tracking (60fps target <= 16.6ms frame duration),
 * and prevents unnecessary UI re-render cascades.
 */

export class ReactPerformanceOptimizer {
  private static instance: ReactPerformanceOptimizer;

  private frameBudgetMs = 16.6; // 60 FPS budget
  private lastFrameRenderDurationMs = 0;
  private totalFramesTracked = 0;
  private droppedFramesCount = 0;

  private selectorCache: Map<string, { value: any; lastInputHash: string }> = new Map();

  private constructor() {}

  public static getInstance(): ReactPerformanceOptimizer {
    if (!ReactPerformanceOptimizer.instance) {
      ReactPerformanceOptimizer.instance = new ReactPerformanceOptimizer();
    }
    return ReactPerformanceOptimizer.instance;
  }

  /**
   * Records a UI frame render duration
   */
  public recordFrameRender(durationMs: number): void {
    this.lastFrameRenderDurationMs = durationMs;
    this.totalFramesTracked++;
    if (durationMs > this.frameBudgetMs) {
      this.droppedFramesCount++;
    }
  }

  /**
   * Memoized state view selector to avoid recomputing derived UI models
   */
  public selectMemoized<TInput, TOutput>(
    selectorKey: string,
    input: TInput,
    computeFn: (input: TInput) => TOutput
  ): TOutput {
    const inputHash = typeof input === 'object' ? JSON.stringify(input) : String(input);
    const cached = this.selectorCache.get(selectorKey);

    if (cached && cached.lastInputHash === inputHash) {
      return cached.value as TOutput;
    }

    const value = computeFn(input);
    this.selectorCache.set(selectorKey, {
      value,
      lastInputHash: inputHash
    });

    return value;
  }

  public getFrameStats() {
    return {
      frameBudgetMs: this.frameBudgetMs,
      lastFrameRenderDurationMs: this.lastFrameRenderDurationMs,
      totalFramesTracked: this.totalFramesTracked,
      droppedFramesCount: this.droppedFramesCount,
      droppedFrameRatio: this.totalFramesTracked > 0 ? this.droppedFramesCount / this.totalFramesTracked : 0
    };
  }

  public invalidateSelectorCache(): void {
    this.selectorCache.clear();
  }
}
