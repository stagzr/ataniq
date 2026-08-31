import type {
  Contact,
  InterceptMarker,
  Vehicle,
  VehicleCommand,
} from "../../types";
import type { ContactSource, TelemetrySource } from "../types";
import { world } from "./worldSync";

// Thin adapters so vehicleStore/contactStore talk to the shared cross-tab
// world exactly like they would a normal TelemetrySource/ContactSource.
export class SyncedTelemetrySource implements TelemetrySource {
  connect(): void {}
  disconnect(): void {}

  onUpdate(callback: (vehicles: Vehicle[]) => void): void {
    world.onVehicles(callback);
  }

  onInterceptMarker(callback: (marker: InterceptMarker) => void): void {
    world.onInterceptMarker(callback);
  }

  sendCommand(vehicleId: string, command: VehicleCommand): void {
    world.sendCommand(vehicleId, command);
  }
}

export class SyncedContactSource implements ContactSource {
  connect(): void {}
  disconnect(): void {}

  onUpdate(callback: (contacts: Contact[]) => void): void {
    world.onContacts(callback);
  }
}
