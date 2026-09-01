import { writable } from "svelte/store";
import type { Vehicle, VehicleCommand } from "../../lib/types";
import {
  createTelemetrySource,
  createVehicleRepository,
} from "../../lib/api/factory";

function createVehicleStore() {
  const { subscribe, set } = writable<Vehicle[]>([]);
  const repository = createVehicleRepository();
  const telemetry = createTelemetrySource();
  const NAME_OVERRIDES_KEY = "ataniq-vehicle-name-overrides";
  let nameOverrides: Record<string, string> = JSON.parse(
    localStorage.getItem(NAME_OVERRIDES_KEY) ?? "{}",
  );
  let latestVehicles: Vehicle[] = [];

  function applyNameOverrides(vehicles: Vehicle[]): Vehicle[] {
    return vehicles.map((vehicle) => ({
      ...vehicle,
      name: nameOverrides[vehicle.id] ?? vehicle.name,
    }));
  }

  function updateVehicles(vehicles: Vehicle[]) {
    latestVehicles = vehicles;
    set(applyNameOverrides(vehicles));
  }

  async function init() {
    const initial = await repository.getVehicles();
    updateVehicles(initial);
    telemetry.onUpdate(updateVehicles);
    telemetry.connect();
  }

  function destroy() {
    telemetry.disconnect();
  }

  function sendCommand(vehicleId: string, command: VehicleCommand) {
    telemetry.sendCommand(vehicleId, command);
  }

  function renameVehicle(vehicleId: string, name: string) {
    const trimmedName = name.trim();
    if (!trimmedName) return;
    nameOverrides = { ...nameOverrides, [vehicleId]: trimmedName };
    localStorage.setItem(NAME_OVERRIDES_KEY, JSON.stringify(nameOverrides));
    set(applyNameOverrides(latestVehicles));
  }

  return {
    subscribe,
    init,
    destroy,
    sendCommand,
    renameVehicle,
    onInterceptMarker: telemetry.onInterceptMarker.bind(telemetry),
  };
}

export const vehicleStore = createVehicleStore();
