import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
} from '@nestjs/common';
import { ApiOperation, ApiParam, ApiResponse, ApiTags } from '@nestjs/swagger';
import { RoutingService } from './routing.service';
import { OptimizeRouteDto } from './dto/optimize-route.dto';

@ApiTags('Route Optimization')
@Controller('route')
export class RoutingController {
  constructor(private readonly routingService: RoutingService) {}

  @Post('optimize/:id')
  @HttpCode(HttpStatus.ACCEPTED)
  @ApiOperation({
    summary: 'Submits an asynchronous job to calculate the optimal path',
  })
  @ApiParam({ name: 'id', description: 'Network graph unique identifier' })
  @ApiResponse({
    status: 202,
    description: 'Job accepted for background execution. Polling jobId returned.',
    schema: {
      example: { jobId: 'job-987' },
    },
  })
  @ApiResponse({ status: 404, description: 'Graph ID does not exist.' })
  public optimizeRoute(
    @Param('id') graphId: string,
    @Body() optimizeDto: OptimizeRouteDto,
  ) {
    return this.routingService.submitOptimizationJob(graphId, optimizeDto);
  }

  @Get('status/:jobId')
  @ApiOperation({
    summary: 'Polls for the result of the asynchronous route calculation job',
  })
  @ApiParam({ name: 'jobId', description: 'Asynchronous job unique identifier' })
  @ApiResponse({
    status: 200,
    description: 'Current status of the calculation job and result if COMPLETED.',
    schema: {
      example: {
        jobId: 'job-987',
        status: 'COMPLETED',
        result: {
          graphId: 'uuid-123',
          totalCost: 25.5,
          path: ['A', 'C', 'D', 'E'],
          durationMs: 4,
        },
      },
    },
  })
  @ApiResponse({ status: 404, description: 'Job ID not found.' })
  public getJobStatus(@Param('jobId') jobId: string) {
    return this.routingService.getJobStatus(jobId);
  }
}