/**
 * MUSICBASE / SURGE STUDIO — PHASE 10
 * CONCURRENCY CONTROL & PRIORITY JOB SCHEDULER
 * 
 * Enforces job prioritization:
 * REALTIME_AUDIO > USER_INTERACTIVE > RENDER > ANALYSIS > BACKGROUND_AI
 * Prevents thread starvation and thread/worker exhaustion.
 */

import { JobPriority, JobStatus, PerformanceJob } from './types';

const PRIORITY_ORDER: Record<JobPriority, number> = {
  REALTIME_AUDIO: 0,
  USER_INTERACTIVE: 1,
  RENDER: 2,
  ANALYSIS: 3,
  BACKGROUND_AI: 4
};

export class JobScheduler {
  private static instance: JobScheduler;
  private queue: PerformanceJob[] = [];
  private activeJobs: Map<string, PerformanceJob> = new Map();
  private completedJobs: Map<string, PerformanceJob> = new Map();
  
  // Maximum concurrent heavy background tasks (RENDER, ANALYSIS, BACKGROUND_AI)
  private maxConcurrentHeavyJobs = 3;

  private constructor() {}

  public static getInstance(): JobScheduler {
    if (!JobScheduler.instance) {
      JobScheduler.instance = new JobScheduler();
    }
    return JobScheduler.instance;
  }

  /**
   * Enqueues a job for scheduled execution
   */
  public enqueue<T>(
    type: string,
    priority: JobPriority,
    executeFn: (job: PerformanceJob<T>) => Promise<T>,
    dependencies: string[] = []
  ): PerformanceJob<T> {
    const jobId = `job_${type}_${Date.now()}_${Math.floor(Math.random() * 10000)}`;

    // Deduplication check: if an identical job type & priority is already running/queued, reuse or avoid duplicate
    const existing = this.queue.find(j => j.type === type && j.status === 'QUEUED');
    if (existing) {
      return existing as PerformanceJob<T>;
    }

    const job: PerformanceJob<T> = {
      id: jobId,
      type,
      priority,
      status: 'QUEUED',
      progress: 0.0,
      createdAt: Date.now(),
      dependencies,
      cancellationToken: { isCancelled: false },
      execute: executeFn
    };

    this.queue.push(job);
    this.sortQueue();
    this.processQueue();
    return job;
  }

  /**
   * Cancels a running or queued job
   */
  public cancelJob(jobId: string, reason: string = 'User cancelled'): boolean {
    const queuedIndex = this.queue.findIndex(j => j.id === jobId);
    if (queuedIndex !== -1) {
      const job = this.queue.splice(queuedIndex, 1)[0];
      job.status = 'CANCELLED';
      if (job.cancellationToken) {
        job.cancellationToken.isCancelled = true;
        job.cancellationToken.cancelReason = reason;
      }
      this.completedJobs.set(job.id, job);
      return true;
    }

    const activeJob = this.activeJobs.get(jobId);
    if (activeJob) {
      activeJob.status = 'CANCELLED';
      if (activeJob.cancellationToken) {
        activeJob.cancellationToken.isCancelled = true;
        activeJob.cancellationToken.cancelReason = reason;
      }
      return true;
    }

    return false;
  }

  /**
   * Process queue based on priority and concurrency limits
   */
  private async processQueue(): Promise<void> {
    const heavyActiveCount = Array.from(this.activeJobs.values()).filter(j => 
      j.priority === 'RENDER' || j.priority === 'ANALYSIS' || j.priority === 'BACKGROUND_AI'
    ).length;

    if (this.queue.length === 0) return;

    for (let i = 0; i < this.queue.length; i++) {
      const job = this.queue[i];

      // Check if dependencies are completed
      if (job.dependencies && job.dependencies.length > 0) {
        const depsReady = job.dependencies.every(depId => {
          const dep = this.completedJobs.get(depId);
          return dep && dep.status === 'COMPLETED';
        });
        if (!depsReady) continue;
      }

      // Check heavy concurrency limit
      const isHeavy = job.priority === 'RENDER' || job.priority === 'ANALYSIS' || job.priority === 'BACKGROUND_AI';
      if (isHeavy && heavyActiveCount >= this.maxConcurrentHeavyJobs) {
        continue; // Wait until active heavy jobs finish
      }

      // Remove from queue and start
      this.queue.splice(i, 1);
      this.runJob(job);
      break;
    }
  }

  private async runJob(job: PerformanceJob): Promise<void> {
    job.status = 'RUNNING';
    job.startedAt = Date.now();
    this.activeJobs.set(job.id, job);

    try {
      if (job.cancellationToken?.isCancelled) {
        job.status = 'CANCELLED';
      } else {
        await job.execute(job);
        if (job.cancellationToken?.isCancelled) {
          job.status = 'CANCELLED';
        } else {
          job.status = 'COMPLETED';
          job.progress = 1.0;
        }
      }
    } catch (err: any) {
      job.status = 'FAILED';
      job.error = err.message || String(err);
    } finally {
      job.completedAt = Date.now();
      this.activeJobs.delete(job.id);
      this.completedJobs.set(job.id, job);

      // Continue processing next queued jobs
      setTimeout(() => this.processQueue(), 0);
    }
  }

  private sortQueue(): void {
    this.queue.sort((a, b) => PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority]);
  }

  public getActiveJobsCount(): number {
    return this.activeJobs.size;
  }

  public getQueuedJobsCount(): number {
    return this.queue.length;
  }

  public getJob(jobId: string): PerformanceJob | undefined {
    return this.activeJobs.get(jobId) || this.completedJobs.get(jobId) || this.queue.find(j => j.id === jobId);
  }

  public clearAll(): void {
    this.queue.forEach(j => {
      j.status = 'CANCELLED';
      if (j.cancellationToken) j.cancellationToken.isCancelled = true;
    });
    this.activeJobs.forEach(j => {
      j.status = 'CANCELLED';
      if (j.cancellationToken) j.cancellationToken.isCancelled = true;
    });
    this.queue = [];
    this.activeJobs.clear();
    this.completedJobs.clear();
  }
}
