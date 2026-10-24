import { Body, Controller, Get, HttpCode, HttpStatus, Param, Post } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags, ApiParam } from '@nestjs/swagger';
import { NetworkService } from './network.service';
import { UploadNetworkDto } from './dto/upload-network.dto';

@ApiTags('Network Management')
@Controller('network')
export class NetworkController {
  constructor(private readonly networkService: NetworkService) {}

  @Post('upload')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Uploads a new graph definition (Nodes and Edges)' })
  @ApiResponse({ status: 201, description: 'The graph has been successfully created and the ID is returned.' })
  @ApiResponse({ status: 400, description: 'Validation error in the provided payload.' })
  public uploadNetwork(@Body() uploadDto: UploadNetworkDto) {
    return this.networkService.uploadGraph(uploadDto);
  }

  @Get('nodes/:id')
  @ApiOperation({ summary: 'Retrieves all defined nodes from a specific network graph' })
  @ApiParam({ name: 'id', description: 'The unique identifier of the graph' })
  @ApiResponse({ status: 200, description: 'Returns an array of node identifiers.' })
  @ApiResponse({ status: 404, description: 'Graph not found.' })
  public getNodes(@Param('id') id: string) {
    return this.networkService.getNodes(id);
  }
}