import { Injectable } from '@nestjs/common';

export interface IJobRecord {
  jobId: string;
  graphId: string;
  status: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED';
  createdAt: Date;
  result?: {
    graphId: string;
    totalCost: number;
    path: string[];
    durationMs: number;
  };
  error?: string;
}

@Injectable()
export class InMemoryJobRepository {
  private readonly jobs = new Map<string, IJobRecord>();

  public save(job: IJobRecord): void {
    this.jobs.set(job.jobId, job);
  }

  public findById(jobId: string): IJobRecord | undefined {
    return this.jobs.get(jobId);
  }

  public update(jobId: string, partial: Partial<IJobRecord>): void {
    const existing = this.jobs.get(jobId);
    if (existing) {
      this.jobs.set(jobId, { ...existing, ...partial });
    }
  }
}