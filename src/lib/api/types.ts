import type {
  AlertEvent,
  Contact,
  InterceptMarker,
  Mission,
  Vehicle,
  VehicleCommand,
} from "../types";

export interface TelemetrySource {
  connect(): void;
  disconnect(): void;
  onUpdate(callback: (vehicles: Vehicle[]) => void): void;
  sendCommand(vehicleId: string, command: VehicleCommand): void;
  onInterceptMarker(callback: (marker: InterceptMarker) => void): void;
}

export interface VehicleRepository {
  getVehicles(): Promise<Vehicle[]>;
}

export interface MissionService {
  getMissions(): Promise<Mission[]>;
}

export interface AlertSource {
  connect(): void;
  disconnect(): void;
  onAlert(callback: (alert: AlertEvent) => void): void;
}

export interface VideoSource {
  getStreamUrl(vehicleId: string): string | undefined;
}

export interface ContactSource {
  connect(): void;
  disconnect(): void;
  onUpdate(callback: (contacts: Contact[]) => void): void;
}
