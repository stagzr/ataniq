import type { Vehicle } from "../../types";
import type { TelemetrySource } from "../types";
import { createMockVehicles } from "./mockData";

const TICK_MS = 1500;

export class MockTelemetrySource implements TelemetrySource {
  private vehicles: Vehicle[] = createMockVehicles();
  private timer: ReturnType<typeof setInterval> | undefined;
  private listeners: Array<(vehicles: Vehicle[]) => void> = [];

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

    // simulate small random-walk drift and heading changes
    const headingDrift = (Math.random() - 0.5) * 20;
    const heading = (v.heading + headingDrift + 360) % 360;
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

    let status = v.status;
    if (battery < 15) status = "critical";
    else if (battery < 30 || connectivity < 40) status = "warning";
    else if (status !== "idle") status = "active";

    return {
      ...v,
      heading,
      speed,
      position,
      battery,
      connectivity,
      status,
      lastUpdate: Date.now(),
    };
  }
}
