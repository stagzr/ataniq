export type VehicleStatus =
  | "active"
  | "idle"
  | "warning"
  | "critical"
  | "offline";

export interface Vehicle {
  id: string;
  name: string;
  status: VehicleStatus;
  position: [number, number]; // [lng, lat]
  heading: number; // degrees, 0 = north
  speed: number; // knots
  battery: number; // percent 0-100
  connectivity: number; // signal quality 0-100
  lastUpdate: number; // epoch ms
}

export type MissionStatus =
  | "planned"
  | "active"
  | "paused"
  | "completed"
  | "aborted";

export interface Mission {
  id: string;
  name: string;
  objectives: string[];
  route: [number, number][];
  status: MissionStatus;
  assignedVehicleIds: string[];
  progress: number; // percent 0-100
}

export type AlertSeverity = "info" | "warning" | "critical";

export interface AlertEvent {
  id: string;
  type: string;
  severity: AlertSeverity;
  timestamp: number;
  source: string;
  description: string;
  acknowledged: boolean;
}

export interface Stream {
  vehicleId: string;
  src: string;
  active: boolean;
}
