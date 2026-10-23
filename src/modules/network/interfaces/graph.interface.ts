export interface IEdge {
  from: string;
  to: string;
  cost: number;
  maxWeight?: number;
  noHazardous?: boolean;
  trafficMultiplier?: number;
}

export interface INode {
  id: string;
}

export interface INetworkGraph {
  id: string;
  nodes: string[];
  edges: IEdge[];
  createdAt: Date;
}