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

  async function init() {
    const initial = await repository.getVehicles();
    set(initial);
    telemetry.onUpdate((vehicles) => set(vehicles));
    telemetry.connect();
  }

  function destroy() {
    telemetry.disconnect();
  }

  function sendCommand(vehicleId: string, command: VehicleCommand) {
    telemetry.sendCommand(vehicleId, command);
  }

  return {
    subscribe,
    init,
    destroy,
    sendCommand,
    onInterceptMarker: telemetry.onInterceptMarker.bind(telemetry),
  };
}

export const vehicleStore = createVehicleStore();
