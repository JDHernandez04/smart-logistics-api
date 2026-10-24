import { DijkstraEngine } from './dijkstra.engine';
import { IEdge } from '../../network/interfaces/graph.interface';
import { RouteErrorCode } from '../interfaces/routing.interface';

describe('DijkstraEngine (Core Algorithm Unit Tests)', () => {
  let engine: DijkstraEngine;

  // Validation graph specified in official challenge README.md
  const readmeValidationGraph: IEdge[] = [
    {
      from: 'A',
      to: 'B',
      cost: 10,
      maxWeight: 10000,
      noHazardous: false,
      trafficMultiplier: 1.0,
    },
    {
      from: 'A',
      to: 'C',
      cost: 15,
      maxWeight: 5000,
      noHazardous: true,
      trafficMultiplier: 1.5,
    },
    {
      from: 'B',
      to: 'D',
      cost: 12,
      maxWeight: 10000,
      noHazardous: false,
      trafficMultiplier: 2.0,
    },
    {
      from: 'C',
      to: 'D',
      cost: 5,
      maxWeight: 5000,
      noHazardous: true,
      trafficMultiplier: 1.0,
    },
    {
      from: 'D',
      to: 'E',
      cost: 10,
      maxWeight: 8000,
      noHazardous: false,
      trafficMultiplier: 1.2,
    },
  ];

  beforeEach(() => {
    engine = new DijkstraEngine();
  });

  describe('1. Reference Diagram Graph (docs/resources/dijkstras-image.jpeg)', () => {
    const diagramGraph: IEdge[] = [
      { from: '1', to: '3', cost: 5 },
      { from: '1', to: '2', cost: 8 },
      { from: '3', to: '4', cost: 12 },
      { from: '2', to: '4', cost: 2 },
      { from: '4', to: '5', cost: 4 },
      { from: '4', to: '6', cost: 9 },
      { from: '5', to: '6', cost: 4 },
    ];

    it('should replicate the exact optimal path (1 -> 2 -> 4 -> 5 -> 6) and cost (18) from reference diagram', () => {
      const result = engine.calculateOptimalRoute(diagramGraph, {
        originNodeId: '1',
        destinationNodeId: '6',
        vehicleProfile: { type: 'standard', weight: 1000, hazardous: false },
        departureTime: '12:00',
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.path).toEqual(['1', '2', '4', '5', '6']);
        expect(result.totalCost).toBe(18);
        expect(result.durationMs).toBeGreaterThanOrEqual(0);
      }
    });
  });

  describe('2. README Validation Test Cases', () => {
    it('Test Case 1 (Standard Path): should choose A -> C -> D -> E with total cost 30', () => {
      const result = engine.calculateOptimalRoute(readmeValidationGraph, {
        originNodeId: 'A',
        destinationNodeId: 'E',
        vehicleProfile: { type: 'van', weight: 3000, hazardous: false },
        departureTime: '12:00',
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.path).toEqual(['A', 'C', 'D', 'E']);
        expect(result.totalCost).toBe(30);
      }
    });

    it('Test Case 2 (Weight Constraint): should avoid C and route A -> B -> D -> E (cost 32) for 6000kg truck', () => {
      const result = engine.calculateOptimalRoute(readmeValidationGraph, {
        originNodeId: 'A',
        destinationNodeId: 'E',
        vehicleProfile: { type: 'truck', weight: 6000, hazardous: false },
        departureTime: '12:00',
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.path).toEqual(['A', 'B', 'D', 'E']);
        expect(result.totalCost).toBe(32);
      }
    });

    it('Test Case 3 (Hazardous Constraint): should avoid C and route A -> B -> D -> E (cost 32) when carrying hazardous cargo', () => {
      const result = engine.calculateOptimalRoute(readmeValidationGraph, {
        originNodeId: 'A',
        destinationNodeId: 'E',
        vehicleProfile: { type: 'truck', weight: 3000, hazardous: true },
        departureTime: '12:00',
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.path).toEqual(['A', 'B', 'D', 'E']);
        expect(result.totalCost).toBe(32);
      }
    });
  });

  describe('3. Time-Dependent Edge Weights (Peak Traffic Windows)', () => {
    it('should apply trafficMultiplier during morning peak hours (08:00)', () => {
      // Path via C: A->C (15 * 1.5 = 22.5) + C->D (5 * 1.0 = 5) + D->E (10 * 1.2 = 12) = 39.5
      const result = engine.calculateOptimalRoute(readmeValidationGraph, {
        originNodeId: 'A',
        destinationNodeId: 'E',
        vehicleProfile: { type: 'van', weight: 3000, hazardous: false },
        departureTime: '08:00',
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.path).toEqual(['A', 'C', 'D', 'E']);
        expect(result.totalCost).toBe(39.5);
      }
    });

    it('should dynamically switch path when traffic multipliers make alternate route cheaper', () => {
      const dynamicTrafficGraph: IEdge[] = [
        { from: 'A', to: 'B', cost: 10, trafficMultiplier: 3.0 }, // Peak cost: 30
        { from: 'B', to: 'E', cost: 5, trafficMultiplier: 1.0 },  // Peak cost: 5  -> Total: 35
        { from: 'A', to: 'C', cost: 12, trafficMultiplier: 1.0 }, // Peak cost: 12
        { from: 'C', to: 'E', cost: 10, trafficMultiplier: 1.0 }, // Peak cost: 10 -> Total: 22
      ];

      // Off-peak (12:00): A->B->E costs 15 (cheapest) vs A->C->E costs 22
      const offPeakResult = engine.calculateOptimalRoute(dynamicTrafficGraph, {
        originNodeId: 'A',
        destinationNodeId: 'E',
        vehicleProfile: { type: 'van', weight: 1000, hazardous: false },
        departureTime: '12:00',
      });

      expect(offPeakResult.success).toBe(true);
      if (offPeakResult.success) {
        expect(offPeakResult.path).toEqual(['A', 'B', 'E']);
        expect(offPeakResult.totalCost).toBe(15);
      }

      // Evening peak (18:00): A->B->E rises to 35, switching optimal path to A->C->E (22)
      const eveningPeakResult = engine.calculateOptimalRoute(dynamicTrafficGraph, {
        originNodeId: 'A',
        destinationNodeId: 'E',
        vehicleProfile: { type: 'van', weight: 1000, hazardous: false },
        departureTime: '18:00',
      });

      expect(eveningPeakResult.success).toBe(true);
      if (eveningPeakResult.success) {
        expect(eveningPeakResult.path).toEqual(['A', 'C', 'E']);
        expect(eveningPeakResult.totalCost).toBe(22);
      }
    });
  });

  describe('4. Multi-Stop Routing (Waypoints)', () => {
    it('should visit waypoints sequentially without duplicating intermediate nodes', () => {
      const result = engine.calculateOptimalRoute(readmeValidationGraph, {
        originNodeId: 'A',
        destinationNodeId: 'E',
        waypoints: ['B', 'D'],
        vehicleProfile: { type: 'van', weight: 3000, hazardous: false },
        departureTime: '12:00',
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.path).toEqual(['A', 'B', 'D', 'E']);
        expect(result.totalCost).toBe(32);
      }
    });
  });

  describe('5. Error Handling & Edge Cases', () => {
    it('should return UNREACHABLE_ROUTE if vehicle weight violates maximum limits', () => {
      const result = engine.calculateOptimalRoute(readmeValidationGraph, {
        originNodeId: 'A',
        destinationNodeId: 'E',
        vehicleProfile: { type: 'heavy-truck', weight: 9000, hazardous: false },
        departureTime: '12:00',
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.errorCode).toBe(RouteErrorCode.UNREACHABLE_ROUTE);
      }
    });

    it('should return NODE_NOT_FOUND when non-existent node is requested', () => {
      const result = engine.calculateOptimalRoute(readmeValidationGraph, {
        originNodeId: 'A',
        destinationNodeId: 'Z',
        vehicleProfile: { type: 'van', weight: 1000, hazardous: false },
        departureTime: '12:00',
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.errorCode).toBe(RouteErrorCode.NODE_NOT_FOUND);
        expect(result.errorMessage).toContain('Node "Z"');
      }
    });

    it('should return INVALID_DEPARTURE_TIME when time format is invalid', () => {
      const result = engine.calculateOptimalRoute(readmeValidationGraph, {
        originNodeId: 'A',
        destinationNodeId: 'E',
        vehicleProfile: { type: 'van', weight: 1000, hazardous: false },
        departureTime: '25:99',
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.errorCode).toBe(RouteErrorCode.INVALID_DEPARTURE_TIME);
      }
    });
  });
});