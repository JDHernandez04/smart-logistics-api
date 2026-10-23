export interface IVehicleProfile {
  type: string;
  weight: number;
  hazardous: boolean;
}

export interface IRouteCalculationInput {
  originNodeId: string;
  destinationNodeId: string;
  waypoints?: string[];
  vehicleProfile: IVehicleProfile;
  departureTime: string; // Format "HH:mm"
}

export enum RouteErrorCode {
  NODE_NOT_FOUND = 'NODE_NOT_FOUND',
  UNREACHABLE_ROUTE = 'UNREACHABLE_ROUTE',
  INVALID_DEPARTURE_TIME = 'INVALID_DEPARTURE_TIME',
  EMPTY_GRAPH = 'EMPTY_GRAPH',
}

export interface IRouteCalculationSuccess {
  success: true;
  path: string[];
  totalCost: number;
  durationMs: number;
}

export interface IRouteCalculationFailure {
  success: false;
  errorCode: RouteErrorCode;
  errorMessage: string;
  durationMs: number;
}

export type RouteCalculationOutcome =
  | IRouteCalculationSuccess
  | IRouteCalculationFailure;