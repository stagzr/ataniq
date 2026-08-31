import type { Vehicle } from "../../types";
import type { TelemetrySource } from "../types";
import {
  circlePosition,
  CIRCLE_PATROLS,
  createMockVehicles,
  randomPatrolPoint,
  STATIONARY_VEHICLE_IDS,
} from "./mockData";

const TICK_MS = 1500;
const DESTINATION_REACHED_DEG = 0.015;

export class MockTelemetrySource implements TelemetrySource {
  private vehicles: Vehicle[] = createMockVehicles();
  private timer: ReturnType<typeof setInterval> | undefined;
  private listeners: Array<(vehicles: Vehicle[]) => void> = [];
  private circleAngles = new Map<string, number>(
    CIRCLE_PATROLS.flatMap((patrol) =>
      patrol.vehicles.map((v) => [v.id, v.startAngleDeg] as const),
    ),
  );

  connect(): void {
    if (this.timer) return;
    this.timer = setInterval(() => this.tick(), TICK_MS);
  }

  disconnect(): void {
    if (this.timer) clearInterval(this.timer);
    this.timer = undefined;
  }

  onUpdate(callback: (vehicles: Vehicle[]) => void): void {
    this.listeners.push(callback);
  }

  private tick(): void {
    this.vehicles = this.vehicles.map((v) => this.simulateStep(v));
    for (const listener of this.listeners) listener(this.vehicles);
  }

  private simulateStep(v: Vehicle): Vehicle {
    if (v.status === "offline") return v;

    const circlePatrol = CIRCLE_PATROLS.find((patrol) =>
      patrol.vehicles.some((cv) => cv.id === v.id),
    );

    if (circlePatrol) return this.simulateCircleStep(v, circlePatrol);
    if (STATIONARY_VEHICLE_IDS.includes(v.id))
      return this.simulateStationaryStep(v);
    return this.simulateWanderStep(v);
  }

  private simulateCircleStep(
    v: Vehicle,
    patrol: (typeof CIRCLE_PATROLS)[number],
  ): Vehicle {
    const angle = (this.circleAngles.get(v.id) ?? 0) + patrol.angularSpeedDeg;
    this.circleAngles.set(v.id, angle % 360);

    const position = circlePosition(patrol.center, patrol.radiusDeg, angle);
    const heading =
      (((Math.atan2(position[0] - v.position[0], position[1] - v.position[1]) *
        180) /
        Math.PI) %
        360) +
        360;
    const destination = circlePosition(
      patrol.center,
      patrol.radiusDeg,
      angle + patrol.angularSpeedDeg * 3,
    );

    const battery = Math.max(0, v.battery - Math.random() * 0.15);
    const connectivity = Math.max(
      20,
      Math.min(100, v.connectivity + (Math.random() - 0.5) * 8),
    );

    return {
      ...v,
      heading: heading % 360,
      speed: Math.max(6, Math.min(12, v.speed + (Math.random() - 0.5))),
      position,
      destination,
      battery,
      connectivity,
      status: computeStatus(v.status, battery, connectivity),
      lastUpdate: Date.now(),
    };
  }

  private simulateStationaryStep(v: Vehicle): Vehicle {
    // anchored/holding position: only telemetry (battery/connectivity/heading) drifts
    const headingDrift = (Math.random() - 0.5) * 6;
    const battery = Math.max(0, v.battery - Math.random() * 0.05);
    const connectivity = Math.max(
      20,
      Math.min(100, v.connectivity + (Math.random() - 0.5) * 8),
    );

    return {
      ...v,
      heading: (v.heading + headingDrift + 360) % 360,
      speed: 0,
      destination: v.position,
      battery,
      connectivity,
      status: computeStatus(v.status, battery, connectivity),
      lastUpdate: Date.now(),
    };
  }

  private simulateWanderStep(v: Vehicle): Vehicle {
    // pick a new waypoint once the current destination has been reached
    const destination: [number, number] =
      Math.hypot(
        v.destination[0] - v.position[0],
        v.destination[1] - v.position[1],
      ) < DESTINATION_REACHED_DEG
        ? randomPatrolPoint(Math.random)
        : v.destination;

    // steer toward the destination with a little heading jitter for realism
    const bearingToDestination =
      (Math.atan2(
        destination[0] - v.position[0],
        destination[1] - v.position[1],
      ) *
        180) /
      Math.PI;
    const heading =
      (bearingToDestination + (Math.random() - 0.5) * 15 + 360) % 360;

    const speed = Math.max(
      0,
      Math.min(28, v.speed + (Math.random() - 0.5) * 2),
    );
    const distance = (speed * (TICK_MS / 1000)) / 20000; // rough degrees-per-tick scaling
    const rad = (heading * Math.PI) / 180;
    const position: [number, number] = [
      v.position[0] + Math.sin(rad) * distance,
      v.position[1] + Math.cos(rad) * distance,
    ];

    const battery = Math.max(0, v.battery - Math.random() * 0.15);
    const connectivity = Math.max(
      20,
      Math.min(100, v.connectivity + (Math.random() - 0.5) * 8),
    );

    return {
      ...v,
      heading,
      speed,
      position,
      destination,
      battery,
      connectivity,
      status: computeStatus(v.status, battery, connectivity),
      lastUpdate: Date.now(),
    };
  }
}

function computeStatus(
  previousStatus: Vehicle["status"],
  battery: number,
  connectivity: number,
): Vehicle["status"] {
  if (battery < 15) return "critical";
  if (battery < 30 || connectivity < 40) return "warning";
  if (previousStatus !== "idle") return "active";
  return previousStatus;
}

