import { Module } from '@nestjs/common';
import { NetworkModule } from './modules/network/network.module';

@Module({
  imports: [NetworkModule],
  controllers: [],
  providers: [],
})
export class AppModule {}