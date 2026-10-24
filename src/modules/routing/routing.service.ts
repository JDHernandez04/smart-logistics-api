import { Injectable, NotFoundException } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { InMemoryNetworkRepository } from '../network/repositories/in-memory-network.repository';
import { DijkstraEngine } from './engine/dijkstra.engine';
import { InMemoryJobRepository, IJobRecord } from './repositories/in-memory-job.repository';
import { OptimizeRouteDto } from './dto/optimize-route.dto';

@Injectable()
export class RoutingService {
  constructor(
    private readonly networkRepository: InMemoryNetworkRepository,
    private readonly jobRepository: InMemoryJobRepository,
    private readonly dijkstraEngine: DijkstraEngine,
  ) {}

  /**
   * Submits an asynchronous route optimization job.
   * Immediately returns a jobId to avoid blocking the HTTP thread.
   */
  public submitOptimizationJob(graphId: string, dto: OptimizeRouteDto): { jobId: string } {
    const graph = this.networkRepository.findById(graphId);
    if (!graph) {
      throw new NotFoundException(`Graph with ID "${graphId}" not found or has been evicted.`);
    }

    const jobId = `job-${randomUUID()}`;
    const initialRecord: IJobRecord = {
      jobId,
      graphId,
      status: 'PENDING',
      createdAt: new Date(),
    };

    this.jobRepository.save(initialRecord);

    // Defer processing to event loop without blocking current HTTP response
    setImmediate(() => {
      this.executeJob(jobId, graphId, dto);
    });

    return { jobId };
  }

  /**
   * Retrieves the current processing status or result of a given job.
   */
  public getJobStatus(jobId: string): IJobRecord {
    const job = this.jobRepository.findById(jobId);
    if (!job) {
      throw new NotFoundException(`Job with ID "${jobId}" not found.`);
    }

    return job;
  }

  /**
   * Background processor running Dijkstra algorithm and persisting outcome.
   */
  private executeJob(jobId: string, graphId: string, dto: OptimizeRouteDto): void {
    const graph = this.networkRepository.findById(graphId);
    if (!graph) {
      this.jobRepository.update(jobId, {
        status: 'FAILED',
        error: `Underlying graph "${graphId}" is no longer available in memory.`,
      });
      return;
    }

    this.jobRepository.update(jobId, { status: 'PROCESSING' });

    const outcome = this.dijkstraEngine.calculateOptimalRoute(graph.edges, {
      originNodeId: dto.originNodeId,
      destinationNodeId: dto.destinationNodeId,
      waypoints: dto.waypoints,
      vehicleProfile: dto.vehicleProfile,
      departureTime: dto.departureTime,
    });

    if (outcome.success) {
      this.jobRepository.update(jobId, {
        status: 'COMPLETED',
        result: {
          graphId,
          totalCost: outcome.totalCost,
          path: outcome.path,
          durationMs: outcome.durationMs,
        },
      });
    } else {
      this.jobRepository.update(jobId, {
        status: 'FAILED',
        error: outcome.errorMessage,
      });
    }
  }
}