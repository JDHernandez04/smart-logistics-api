import { Module } from '@nestjs/common';
import { RoutingController } from './routing.controller';
import { RoutingService } from './routing.service';
import { DijkstraEngine } from './engine/dijkstra.engine';
import { InMemoryJobRepository } from './repositories/in-memory-job.repository';
import { NetworkModule } from '../network/network.module';

@Module({
  imports: [NetworkModule],
  controllers: [RoutingController],
  providers: [RoutingService, InMemoryJobRepository, DijkstraEngine],
})
export class RoutingModule {}