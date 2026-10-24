import { Module } from '@nestjs/common';
import { NetworkModule } from './modules/network/network.module';
import { RoutingModule } from './modules/routing/routing.module';

@Module({
  imports: [NetworkModule, RoutingModule],
  controllers: [],
  providers: [],
})
export class AppModule {}