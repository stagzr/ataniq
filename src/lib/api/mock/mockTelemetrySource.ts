import type {
  Contact,
  InterceptMarker,
  Vehicle,
  VehicleCommand,
  VehicleOrder,
} from "../../types";
import type { TelemetrySource } from "../types";
import {
  BASE_POSITION,
  circlePosition,
  CIRCLE_PATROLS,
  createMockVehicles,
  randomPatrolPoint,
  STATIONARY_VEHICLE_IDS,
} from "./mockData";
import { distancePointToSegment } from "../../formations";

const TICK_MS = 1500;
const DESTINATION_REACHED_DEG = 0.015;
const BASE_ARRIVAL_DEG = 0.01;
const INTERCEPT_SPEED_KNOTS = 24;
const INTERCEPT_CATCH_DEG = 0.012;
const MAX_INTERCEPT_LEAD_TICKS = 200;
const HOLD_ARRIVAL_DEG = 0.008;
const HOLD_SPEED_KNOTS = 18;
const ORBIT_ANGULAR_SPEED_DEG = 8;
const ORBIT_SPEED_KNOTS = 10;
const EMBARGO_DETECT_DEG = 0.025;

function degPerTick(speedKnots: number): number {
  return (speedKnots * (TICK_MS / 1000)) / 20000;
}

function bearingTo(from: [number, number], to: [number, number]): number {
  const bearing =
    (Math.atan2(to[0] - from[0], to[1] - from[1]) * 180) / Math.PI;
  return (bearing + 360) % 360;
}

// Solve for the time (in ticks) at which a constant-velocity interceptor can
// reach a constant-velocity target, given both start positions/speeds.
function solveInterceptTicks(
  interceptorPos: [number, number],
  interceptorSpeedDegPerTick: number,
  targetPos: [number, number],
  targetVelocityDegPerTick: [number, number],
): number | undefined {
  const dx = targetPos[0] - interceptorPos[0];
  const dy = targetPos[1] - interceptorPos[1];
  const [vx, vy] = targetVelocityDegPerTick;

  const a =
    vx * vx + vy * vy - interceptorSpeedDegPerTick * interceptorSpeedDegPerTick;
  const b = 2 * (dx * vx + dy * vy);
  const c = dx * dx + dy * dy;

  let t: number | undefined;
  if (Math.abs(a) < 1e-9) {
    if (Math.abs(b) > 1e-9) t = -c / b;
  } else {
    const discriminant = b * b - 4 * a * c;
    if (discriminant >= 0) {
      const sqrtDisc = Math.sqrt(discriminant);
      const t1 = (-b + sqrtDisc) / (2 * a);
      const t2 = (-b - sqrtDisc) / (2 * a);
      const candidates = [t1, t2].filter((v) => v > 0);
      if (candidates.length) t = Math.min(...candidates);
    }
  }

  if (
    t === undefined ||
    !Number.isFinite(t) ||
    t < 0 ||
    t > MAX_INTERCEPT_LEAD_TICKS
  ) {
    return undefined;
  }
  return t;
}

export class MockTelemetrySource implements TelemetrySource {
  private vehicles: Vehicle[] = createMockVehicles();
  private timer: ReturnType<typeof setInterval> | undefined;
  private listeners: Array<(vehicles: Vehicle[]) => void> = [];
  private interceptListeners: Array<(marker: InterceptMarker) => void> = [];
  private orders = new Map<string, VehicleOrder>(
    this.vehicles.map((v) => [v.id, v.order]),
  );
  private circleAngles = new Map<string, number>(
    CIRCLE_PATROLS.flatMap((patrol) =>
      patrol.vehicles.map((v) => [v.id, v.startAngleDeg] as const),
    ),
  );
  private orbitAngles = new Map<string, number>();
  private contactsProvider: () => Contact[] = () => [];
  private onContactResolved: (
    contactId: string,
    mode: "inspect" | "attack",
  ) => void = () => {};

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

  onInterceptMarker(callback: (marker: InterceptMarker) => void): void {
    this.interceptListeners.push(callback);
  }

  setContactsProvider(fn: () => Contact[]): void {
    this.contactsProvider = fn;
  }

  setContactResolvedHandler(
    fn: (contactId: string, mode: "inspect" | "attack") => void,
  ): void {
    this.onContactResolved = fn;
  }

  sendCommand(vehicleId: string, command: VehicleCommand): void {
    const order: VehicleOrder =
      command.type === "return-to-base"
        ? { type: "return-to-base" }
        : command.type === "intercept"
          ? {
              type: "intercept",
              contactId: command.contactId,
              mode: command.mode,
              missionId: command.missionId,
            }
          : command.type === "orbit-contact"
            ? {
                type: "orbit-contact",
                contactId: command.contactId,
                radiusDeg: command.radiusDeg,
                missionId: command.missionId,
              }
            : command.type === "hold-position"
              ? {
                  type: "hold-position",
                  point: command.point,
                  phase: "transit",
                  embargoLine: command.embargoLine,
                  missionId: command.missionId,
                }
              : { type: "patrol" };
    this.orders.set(vehicleId, order);
    this.vehicles = this.vehicles.map((v) =>
      v.id === vehicleId ? { ...v, order } : v,
    );
    for (const listener of this.listeners) listener(this.vehicles);
  }

  private tick(): void {
    this.vehicles = this.vehicles.map((v) => this.simulateStep(v));
    for (const listener of this.listeners) listener(this.vehicles);
  }

  private simulateStep(v: Vehicle): Vehicle {
    if (v.status === "offline") return v;

    const order = this.orders.get(v.id) ?? v.order;
    if (order.type === "return-to-base")
      return this.simulateReturnToBase(v, order);
    if (order.type === "intercept") return this.simulateIntercept(v, order);
    if (order.type === "orbit-contact")
      return this.simulateOrbitContact(v, order);
    if (order.type === "hold-position")
      return this.simulateHoldPosition(v, order);

    const circlePatrol = CIRCLE_PATROLS.find((patrol) =>
      patrol.vehicles.some((cv) => cv.id === v.id),
    );

    if (circlePatrol) return this.simulateCircleStep(v, circlePatrol, order);
    if (STATIONARY_VEHICLE_IDS.includes(v.id))
      return this.simulateStationaryStep(v, order);
    return this.simulateWanderStep(v, order);
  }

  private simulateReturnToBase(v: Vehicle, order: VehicleOrder): Vehicle {
    const distanceToBase = Math.hypot(
      BASE_POSITION[0] - v.position[0],
      BASE_POSITION[1] - v.position[1],
    );

    const battery = Math.max(0, v.battery - Math.random() * 0.1);
    const connectivity = Math.max(
      20,
      Math.min(100, v.connectivity + (Math.random() - 0.5) * 8),
    );

    if (distanceToBase < BASE_ARRIVAL_DEG) {
      return {
        ...v,
        speed: 0,
        position: BASE_POSITION,
        destination: BASE_POSITION,
        battery,
        connectivity,
        status: "idle",
        lastUpdate: Date.now(),
        order,
      };
    }

    const heading = bearingTo(v.position, BASE_POSITION);
    const speed = 22;
    const distance = degPerTick(speed);
    const rad = (heading * Math.PI) / 180;
    const position: [number, number] = [
      v.position[0] + Math.sin(rad) * distance,
      v.position[1] + Math.cos(rad) * distance,
    ];

    return {
      ...v,
      heading,
      speed,
      position,
      destination: BASE_POSITION,
      battery,
      connectivity,
      status: computeStatus(v.status, battery, connectivity),
      lastUpdate: Date.now(),
      order,
    };
  }

  private simulateIntercept(
    v: Vehicle,
    order: Extract<VehicleOrder, { type: "intercept" }>,
  ): Vehicle {
    const contact = this.contactsProvider().find(
      (c) => c.id === order.contactId,
    );
    const battery = Math.max(0, v.battery - Math.random() * 0.12);
    const connectivity = Math.max(
      20,
      Math.min(100, v.connectivity + (Math.random() - 0.5) * 8),
    );

    if (!contact || contact.status === "neutralized") {
      // target gone: stand down to the return order (or plain patrol)
      const standDownOrder = order.returnOrder ?? { type: "patrol" };
      this.orders.set(v.id, standDownOrder);
      return { ...v, battery, connectivity, order: standDownOrder };
    }

    const distanceToContact = Math.hypot(
      contact.position[0] - v.position[0],
      contact.position[1] - v.position[1],
    );

    if (distanceToContact < INTERCEPT_CATCH_DEG) {
      const marker: InterceptMarker = {
        id: `intercept-${Date.now()}`,
        position: v.position,
        mode: order.mode,
        timestamp: Date.now(),
      };
      for (const listener of this.interceptListeners) listener(marker);
      this.onContactResolved(contact.id, order.mode);
      const standDownOrder = order.returnOrder ?? { type: "patrol" };
      this.orders.set(v.id, standDownOrder);

      return {
        ...v,
        battery,
        connectivity,
        status: computeStatus(v.status, battery, connectivity),
        lastUpdate: Date.now(),
        order: standDownOrder,
      };
    }

    const contactVelocity: [number, number] = [
      Math.sin((contact.heading * Math.PI) / 180) * degPerTick(contact.speed),
      Math.cos((contact.heading * Math.PI) / 180) * degPerTick(contact.speed),
    ];

    const leadTicks = solveInterceptTicks(
      v.position,
      degPerTick(INTERCEPT_SPEED_KNOTS),
      contact.position,
      contactVelocity,
    );

    const aimPoint: [number, number] = leadTicks
      ? [
          contact.position[0] + contactVelocity[0] * leadTicks,
          contact.position[1] + contactVelocity[1] * leadTicks,
        ]
      : contact.position;

    const heading = bearingTo(v.position, aimPoint);
    const distance = degPerTick(INTERCEPT_SPEED_KNOTS);
    const rad = (heading * Math.PI) / 180;
    const position: [number, number] = [
      v.position[0] + Math.sin(rad) * distance,
      v.position[1] + Math.cos(rad) * distance,
    ];

    return {
      ...v,
      heading,
      speed: INTERCEPT_SPEED_KNOTS,
      position,
      destination: aimPoint,
      battery,
      connectivity,
      status: computeStatus(v.status, battery, connectivity),
      lastUpdate: Date.now(),
      order,
    };
  }

  private simulateOrbitContact(
    v: Vehicle,
    order: Extract<VehicleOrder, { type: "orbit-contact" }>,
  ): Vehicle {
    const contact = this.contactsProvider().find(
      (c) => c.id === order.contactId,
    );
    const battery = Math.max(0, v.battery - Math.random() * 0.1);
    const connectivity = Math.max(
      20,
      Math.min(100, v.connectivity + (Math.random() - 0.5) * 8),
    );

    if (!contact || contact.status === "neutralized") {
      this.orders.set(v.id, { type: "patrol" });
      return { ...v, battery, connectivity, order: { type: "patrol" } };
    }

    const angle = (this.orbitAngles.get(v.id) ?? 0) + ORBIT_ANGULAR_SPEED_DEG;
    this.orbitAngles.set(v.id, angle % 360);

    const position = circlePosition(contact.position, order.radiusDeg, angle);
    const heading = bearingTo(v.position, position);
    const destination = circlePosition(
      contact.position,
      order.radiusDeg,
      angle + ORBIT_ANGULAR_SPEED_DEG * 3,
    );

    return {
      ...v,
      heading,
      speed: ORBIT_SPEED_KNOTS,
      position,
      destination,
      battery,
      connectivity,
      status: computeStatus(v.status, battery, connectivity),
      lastUpdate: Date.now(),
      order,
    };
  }

  private simulateHoldPosition(
    v: Vehicle,
    order: Extract<VehicleOrder, { type: "hold-position" }>,
  ): Vehicle {
    const battery = Math.max(0, v.battery - Math.random() * 0.06);
    const connectivity = Math.max(
      20,
      Math.min(100, v.connectivity + (Math.random() - 0.5) * 8),
    );
    const distanceToPoint = Math.hypot(
      order.point[0] - v.position[0],
      order.point[1] - v.position[1],
    );

    if (distanceToPoint >= HOLD_ARRIVAL_DEG) {
      const heading = bearingTo(v.position, order.point);
      const distance = degPerTick(HOLD_SPEED_KNOTS);
      const rad = (heading * Math.PI) / 180;
      const position: [number, number] = [
        v.position[0] + Math.sin(rad) * distance,
        v.position[1] + Math.cos(rad) * distance,
      ];
      return {
        ...v,
        heading,
        speed: HOLD_SPEED_KNOTS,
        position,
        destination: order.point,
        battery,
        connectivity,
        status: computeStatus(v.status, battery, connectivity),
        lastUpdate: Date.now(),
        order,
      };
    }

    // on station: hold still, and if embargoing, watch for contacts nearing the line
    const holdingOrder = order.phase === "holding" ? order : { ...order, phase: "holding" as const };
    this.orders.set(v.id, holdingOrder);
    if (holdingOrder.embargoLine) {
      const alreadyHandled = new Set(
        this.vehicles
          .map((other) => this.orders.get(other.id))
          .filter(
            (o): o is Extract<VehicleOrder, { type: "intercept" }> =>
              o?.type === "intercept",
          )
          .map((o) => o.contactId),
      );
      const approaching = this.contactsProvider().find(
        (c) =>
          c.status === "unidentified" &&
          !alreadyHandled.has(c.id) &&
          distancePointToSegment(
            c.position,
            holdingOrder.embargoLine![0],
            holdingOrder.embargoLine![1],
          ) < EMBARGO_DETECT_DEG,
      );
      if (approaching) {
        const interceptOrder: VehicleOrder = {
          type: "intercept",
          contactId: approaching.id,
          mode: "inspect",
          returnOrder: holdingOrder,
        };
        this.orders.set(v.id, interceptOrder);
        return { ...v, battery, connectivity, order: interceptOrder };
      }
    }

    return {
      ...v,
      speed: 0,
      position: order.point,
      destination: order.point,
      battery,
      connectivity,
      status: computeStatus(v.status, battery, connectivity),
      lastUpdate: Date.now(),
      order: holdingOrder,
    };
  }

  private simulateCircleStep(
    v: Vehicle,
    patrol: (typeof CIRCLE_PATROLS)[number],
    order: VehicleOrder,
  ): Vehicle {
    const angle = (this.circleAngles.get(v.id) ?? 0) + patrol.angularSpeedDeg;
    this.circleAngles.set(v.id, angle % 360);

    const position = circlePosition(patrol.center, patrol.radiusDeg, angle);
    const heading = bearingTo(v.position, position);
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
      heading,
      speed: Math.max(6, Math.min(12, v.speed + (Math.random() - 0.5))),
      position,
      destination,
      battery,
      connectivity,
      status: computeStatus(v.status, battery, connectivity),
      lastUpdate: Date.now(),
      order,
    };
  }

  private simulateStationaryStep(v: Vehicle, order: VehicleOrder): Vehicle {
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
      order,
    };
  }

  private simulateWanderStep(v: Vehicle, order: VehicleOrder): Vehicle {
    // pick a new waypoint once the current destination has been reached
    const destination: [number, number] =
      Math.hypot(
        v.destination[0] - v.position[0],
        v.destination[1] - v.position[1],
      ) < DESTINATION_REACHED_DEG
        ? randomPatrolPoint(Math.random)
        : v.destination;

    // steer toward the destination with a little heading jitter for realism
    const bearingToDestination = bearingTo(v.position, destination);
    const heading =
      (bearingToDestination + (Math.random() - 0.5) * 15 + 360) % 360;

    const speed = Math.max(
      0,
      Math.min(28, v.speed + (Math.random() - 0.5) * 2),
    );
    const distance = degPerTick(speed);
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
      order,
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
