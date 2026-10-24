import { Module } from '@nestjs/common';
import { NetworkModule } from './modules/network/network.module';
import { RoutingModule } from './modules/routing/routing.module';
import { AppController } from './app.controller';

@Module({
  imports: [NetworkModule, RoutingModule],
  controllers: [AppController],
  providers: [],
})
export class AppModule {}