import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';

@ApiTags('System')
@Controller()
export class AppController {
  @Get()
  @ApiOperation({ summary: 'Health check endpoint' })
  @ApiResponse({ status: 200, description: 'API is up and running.' })
  public getHealthCheck() {
    return {
      status: 'OK',
      message: 'Smart Logistics Routing API is running 🚀',
      timestamp: new Date().toISOString(),
    };
  }
}