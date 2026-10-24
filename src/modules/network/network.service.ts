import { Injectable, NotFoundException } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { InMemoryNetworkRepository } from './repositories/in-memory-network.repository';
import { UploadNetworkDto } from './dto/upload-network.dto';
import { INetworkGraph } from './interfaces/graph.interface';

@Injectable()
export class NetworkService {
  constructor(private readonly networkRepository: InMemoryNetworkRepository) {}

  /**
   * Processes the uploaded edges, extracts unique nodes, and persists the graph.
   */
  public uploadGraph(dto: UploadNetworkDto): { id: string } {
    const graphId = randomUUID();
    const uniqueNodes = new Set<string>();

    for (const edge of dto.edges) {
      uniqueNodes.add(edge.from);
      uniqueNodes.add(edge.to);
    }

    const newGraph: INetworkGraph = {
      id: graphId,
      edges: dto.edges,
      nodes: Array.from(uniqueNodes),
      createdAt: new Date(),
    };

    this.networkRepository.save(newGraph);

    return { id: graphId };
  }

  /**
   * Retrieves the array of unique nodes for a specific graph ID.
   */
  public getNodes(graphId: string): string[] {
    const graph = this.networkRepository.findById(graphId);
    
    if (!graph) {
      throw new NotFoundException(`Graph with ID "${graphId}" not found or has been evicted from memory.`);
    }
    
    return graph.nodes;
  }
}