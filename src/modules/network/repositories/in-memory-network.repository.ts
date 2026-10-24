import { Injectable } from '@nestjs/common';
import { INetworkGraph } from '../interfaces/graph.interface';

@Injectable()
export class InMemoryNetworkRepository {
  // Enforces the memory constraint specified in requirements
  private readonly MAX_NETWORKS = 5;
  
  private readonly networks = new Map<string, INetworkGraph>();
  private readonly insertionOrder: string[] = [];

  /**
   * Saves a new graph. If the capacity exceeds MAX_NETWORKS,
   * the oldest graph is evicted (FIFO policy).
   */
  public save(graph: INetworkGraph): void {
    if (this.insertionOrder.length >= this.MAX_NETWORKS) {
      const oldestId = this.insertionOrder.shift();
      if (oldestId) {
        this.networks.delete(oldestId);
      }
    }
    
    this.networks.set(graph.id, graph);
    this.insertionOrder.push(graph.id);
  }

  /**
   * Retrieves a graph by its UUID, or undefined if it does not exist/was evicted.
   */
  public findById(id: string): INetworkGraph | undefined {
    return this.networks.get(id);
  }
}