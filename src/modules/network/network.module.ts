import { Module } from '@nestjs/common';
import { NetworkController } from './network.controller';
import { NetworkService } from './network.service';
import { InMemoryNetworkRepository } from './repositories/in-memory-network.repository';

@Module({
  controllers: [NetworkController],
  providers: [NetworkService, InMemoryNetworkRepository],
  // Export repository so the Routing module can access saved graphs
  exports: [InMemoryNetworkRepository], 
})
export class NetworkModule {}