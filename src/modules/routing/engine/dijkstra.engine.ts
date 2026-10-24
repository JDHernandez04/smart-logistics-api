import { Injectable } from '@nestjs/common';
import { performance } from 'perf_hooks';
import { MinHeap } from '../../../common/data-structures/min-heap';
import { IEdge } from '../../network/interfaces/graph.interface';
import {
  IRouteCalculationInput,
  IVehicleProfile,
  RouteCalculationOutcome,
  RouteErrorCode,
} from '../interfaces/routing.interface';

interface IResolvedEdge {
  to: string;
  effectiveCost: number;
}

interface IHeapNode {
  nodeId: string;
  cost: number;
}

interface ISegmentResult {
  reachable: boolean;
  path: string[];
  cost: number;
}

@Injectable()
export class DijkstraEngine {
  // Peak hour windows represented in minutes from midnight (00:00)
  // 07:00 - 09:00 -> 420 to 540 min
  // 17:00 - 19:00 -> 1020 to 1140 min
  private static readonly MORNING_PEAK_START = 7 * 60;
  private static readonly MORNING_PEAK_END = 9 * 60;
  private static readonly EVENING_PEAK_START = 17 * 60;
  private static readonly EVENING_PEAK_END = 19 * 60;

  /**
   * Calculates the optimal route applying vehicle physical restrictions,
   * time-dependent traffic multipliers, and sequential waypoints.
   */
  public calculateOptimalRoute(
    edges: IEdge[],
    input: IRouteCalculationInput,
  ): RouteCalculationOutcome {
    const startTime = performance.now();

    if (!edges || edges.length === 0) {
      return this.buildFailure(
        RouteErrorCode.EMPTY_GRAPH,
        'The network graph contains no edges.',
        startTime,
      );
    }

    const departureMinutes = this.parseTimeToMinutes(input.departureTime);
    if (departureMinutes === null) {
      return this.buildFailure(
        RouteErrorCode.INVALID_DEPARTURE_TIME,
        `Invalid departureTime format "${input.departureTime}". Expected "HH:mm" (24-hour format).`,
        startTime,
      );
    }

    const isPeakHour = this.isPeakTrafficWindow(departureMinutes);
    const { adjacencyList, allNodes } = this.buildConstrainedGraph(
      edges,
      input.vehicleProfile,
      isPeakHour,
    );

    // Full sequential stop order: Origin -> Waypoints -> Destination
    const stops: string[] = [
      input.originNodeId,
      ...(input.waypoints ?? []),
      input.destinationNodeId,
    ];

    // Validate existence of all requested nodes within graph topology
    for (const stopNode of stops) {
      if (!allNodes.has(stopNode)) {
        return this.buildFailure(
          RouteErrorCode.NODE_NOT_FOUND,
          `Node "${stopNode}" does not exist in the network graph.`,
          startTime,
        );
      }
    }

    // Edge case: origin is equal to destination without intermediate waypoints
    if (stops.length === 2 && stops[0] === stops[1]) {
      return {
        success: true,
        path: [stops[0]],
        totalCost: 0,
        durationMs: this.getElapsedMs(startTime),
      };
    }

    const fullPath: string[] = [];
    let accumulatedCost = 0;

    // Multi-stop sequential segment calculation
    for (let i = 0; i < stops.length - 1; i++) {
      const fromNode = stops[i];
      const toNode = stops[i + 1];

      const segment = this.findShortestSegment(
        adjacencyList,
        allNodes,
        fromNode,
        toNode,
      );

      if (!segment.reachable) {
        return this.buildFailure(
          RouteErrorCode.UNREACHABLE_ROUTE,
          `No valid route found between "${fromNode}" and "${toNode}" under the given vehicle constraints.`,
          startTime,
        );
      }

      if (i === 0) {
        fullPath.push(...segment.path);
      } else {
        // Avoid duplicate overlapping nodes between consecutive segments
        fullPath.push(...segment.path.slice(1));
      }

      accumulatedCost += segment.cost;
    }

    return {
      success: true,
      path: fullPath,
      // Avoid floating point IEEE 754 precision issues
      totalCost: Number(accumulatedCost.toFixed(4)),
      durationMs: this.getElapsedMs(startTime),
    };
  }

  /**
   * Executes Dijkstra's algorithm for an individual segment using a binary min-heap.
   */
  private findShortestSegment(
    adjacencyList: Map<string, IResolvedEdge[]>,
    allNodes: Set<string>,
    startNode: string,
    endNode: string,
  ): ISegmentResult {
    if (startNode === endNode) {
      return { reachable: true, path: [startNode], cost: 0 };
    }

    const distances = new Map<string, number>();
    const previous = new Map<string, string | null>();
    const minHeap = new MinHeap<IHeapNode>((a, b) => a.cost - b.cost);

    for (const node of allNodes) {
      distances.set(node, Infinity);
      previous.set(node, null);
    }

    distances.set(startNode, 0);
    minHeap.push({ nodeId: startNode, cost: 0 });

    while (!minHeap.isEmpty()) {
      const current = minHeap.pop()!;

      // Early Exit: destination node extracted from min-heap guarantees optimal shortest cost
      if (current.nodeId === endNode) {
        break;
      }

      const currentBestDistance = distances.get(current.nodeId) ?? Infinity;

      // Lazy Deletion: skip stale entries in heap with sub-optimal distances
      if (current.cost > currentBestDistance) {
        continue;
      }

      const neighbors = adjacencyList.get(current.nodeId) ?? [];
      for (const edge of neighbors) {
        const candidateDistance = currentBestDistance + edge.effectiveCost;
        const knownNeighborDistance = distances.get(edge.to) ?? Infinity;

        if (candidateDistance < knownNeighborDistance) {
          distances.set(edge.to, candidateDistance);
          previous.set(edge.to, current.nodeId);
          minHeap.push({ nodeId: edge.to, cost: candidateDistance });
        }
      }
    }

    const finalCost = distances.get(endNode) ?? Infinity;
    if (finalCost === Infinity) {
      return { reachable: false, path: [], cost: Infinity };
    }

    // Reconstruct optimal path backwards from endNode to startNode
    const path: string[] = [];
    let currentStep: string | null = endNode;

    while (currentStep !== null) {
      path.push(currentStep);
      currentStep = previous.get(currentStep) ?? null;
    }

    path.reverse();

    return {
      reachable: true,
      path,
      cost: finalCost,
    };
  }

  /**
   * Builds the adjacency list filtering out invalid vehicle edges
   * and applying dynamic peak traffic multipliers.
   */
  private buildConstrainedGraph(
    edges: IEdge[],
    vehicle: IVehicleProfile,
    isPeakHour: boolean,
  ): {
    adjacencyList: Map<string, IResolvedEdge[]>;
    allNodes: Set<string>;
  } {
    const adjacencyList = new Map<string, IResolvedEdge[]>();
    const allNodes = new Set<string>();

    for (const edge of edges) {
      // Record all nodes present in graph topology
      allNodes.add(edge.from);
      allNodes.add(edge.to);

      if (!this.canVehicleTraverseEdge(edge, vehicle)) {
        continue;
      }

      const multiplier = isPeakHour ? (edge.trafficMultiplier ?? 1.0) : 1.0;
      const effectiveCost = edge.cost * multiplier;

      if (!adjacencyList.has(edge.from)) {
        adjacencyList.set(edge.from, []);
      }

      adjacencyList.get(edge.from)!.push({
        to: edge.to,
        effectiveCost,
      });
    }

    return { adjacencyList, allNodes };
  }

  /**
   * Evaluates if a vehicle satisfies edge weight and hazardous cargo constraints.
   */
  private canVehicleTraverseEdge(
    edge: IEdge,
    vehicle: IVehicleProfile,
  ): boolean {
    if (edge.maxWeight !== undefined && vehicle.weight > edge.maxWeight) {
      return false;
    }

    if (edge.noHazardous === true && vehicle.hazardous === true) {
      return false;
    }

    return true;
  }

  /**
   * Parses "HH:mm" 24-hour time string into total minutes from midnight.
   */
  private parseTimeToMinutes(timeStr: string): number | null {
    const match = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(timeStr?.trim() ?? '');
    if (!match) {
      return null;
    }

    const hours = parseInt(match[1], 10);
    const minutes = parseInt(match[2], 10);
    return hours * 60 + minutes;
  }

  /**
   * Evaluates if time falls within peak traffic windows:
   * 07:00 - 09:00 or 17:00 - 19:00 (inclusive).
   */
  private isPeakTrafficWindow(minutesFromMidnight: number): boolean {
    const isMorningPeak =
      minutesFromMidnight >= DijkstraEngine.MORNING_PEAK_START &&
      minutesFromMidnight <= DijkstraEngine.MORNING_PEAK_END;

    const isEveningPeak =
      minutesFromMidnight >= DijkstraEngine.EVENING_PEAK_START &&
      minutesFromMidnight <= DijkstraEngine.EVENING_PEAK_END;

    return isMorningPeak || isEveningPeak;
  }

  private buildFailure(
    errorCode: RouteErrorCode,
    errorMessage: string,
    startTime: number,
  ): RouteCalculationOutcome {
    return {
      success: false,
      errorCode,
      errorMessage,
      durationMs: this.getElapsedMs(startTime),
    };
  }

  private getElapsedMs(startTime: number): number {
    return Number((performance.now() - startTime).toFixed(3));
  }
}