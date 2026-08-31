import type { Vehicle } from "../../lib/types";

const TRAIL_LENGTH = 20;
const TICK_DURATION_MS = 1500;

export interface AnimatedVehicleState {
  id: string;
  name: string;
  status: Vehicle["status"];
  lng: number;
  lat: number;
  heading: number;
  trail: [number, number][];
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

// interpolate the short way around the compass
function lerpAngle(a: number, b: number, t: number): number {
  let delta = ((b - a + 540) % 360) - 180;
  return (a + delta * t + 360) % 360;
}

// Dead-reckons vehicle positions between telemetry ticks and tracks a trail buffer per vehicle.
export class VehicleAnimator {
  private prev = new Map<string, Vehicle>();
  private curr = new Map<string, Vehicle>();
  private trails = new Map<string, [number, number][]>();
  private lastUpdateTime = performance.now();

  update(vehicles: Vehicle[]): void {
    this.prev = this.curr;
    this.curr = new Map(vehicles.map((v) => [v.id, v]));
    this.lastUpdateTime = performance.now();

    for (const v of vehicles) {
      const trail = this.trails.get(v.id) ?? [];
      trail.push(v.position);
      if (trail.length > TRAIL_LENGTH) trail.shift();
      this.trails.set(v.id, trail);
    }
  }

  getInterpolatedState(now: number): AnimatedVehicleState[] {
    const elapsed = now - this.lastUpdateTime;
    const t = Math.min(1, elapsed / TICK_DURATION_MS);

    return [...this.curr.values()].map((v) => {
      const prevVehicle = this.prev.get(v.id) ?? v;
      return {
        id: v.id,
        name: v.name,
        status: v.status,
        lng: lerp(prevVehicle.position[0], v.position[0], t),
        lat: lerp(prevVehicle.position[1], v.position[1], t),
        heading: lerpAngle(prevVehicle.heading, v.heading, t),
        trail: this.trails.get(v.id) ?? [],
      };
    });
  }
}
