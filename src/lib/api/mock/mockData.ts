import type { Mission, Vehicle } from "../../types";

// Fictional patrol area in open water east of Gotland, mock only. Keep radius
// well clear of Gotland's east coast (~0.9deg away) so vehicles stay at sea.
export const PATROL_CENTER: [number, number] = [19.9, 57.5];
export const PATROL_MAX_RADIUS_DEG = 0.42;
const ORIGIN = PATROL_CENTER;

const VEHICLE_NAMES = [
  "Osprey-01",
  "Osprey-02",
  "Osprey-03",
  "Osprey-04",
  "Kestrel-01",
  "Kestrel-02",
  "Kestrel-03",
  "Kestrel-04",
  "Petrel-01",
  "Petrel-02",
  "Petrel-03",
  "Petrel-04",
  "Tern-01",
  "Tern-02",
  "Tern-03",
];

function seededRandom(seed: number) {
  let value = seed;
  return () => {
    value = (value * 9301 + 49297) % 233280;
    return value / 233280;
  };
}

export function randomPatrolPoint(rand: () => number): [number, number] {
  const angle = rand() * Math.PI * 2;
  const radius = 0.08 + rand() * (PATROL_MAX_RADIUS_DEG - 0.1);
  return [
    PATROL_CENTER[0] + Math.cos(angle) * radius,
    PATROL_CENTER[1] + Math.sin(angle) * radius * 0.6,
  ];
}

// Mock movement scenarios: some vehicles patrol a fixed circle (two vehicles
// per circle, on opposite sides), some stay anchored in place, the rest wander
// between random waypoints (see randomPatrolPoint / MockTelemetrySource).
export interface CirclePatrol {
  center: [number, number];
  radiusDeg: number;
  angularSpeedDeg: number; // per simulation tick
  vehicles: { id: string; startAngleDeg: number }[];
}

export const CIRCLE_PATROLS: CirclePatrol[] = [
  {
    center: [PATROL_CENTER[0] - 0.22, PATROL_CENTER[1] + 0.14],
    radiusDeg: 0.09,
    angularSpeedDeg: 6,
    vehicles: [
      { id: "veh-1", startAngleDeg: 0 },
      { id: "veh-2", startAngleDeg: 180 },
    ],
  },
  {
    center: [PATROL_CENTER[0] + 0.2, PATROL_CENTER[1] - 0.16],
    radiusDeg: 0.09,
    angularSpeedDeg: 6,
    vehicles: [
      { id: "veh-3", startAngleDeg: 0 },
      { id: "veh-4", startAngleDeg: 180 },
    ],
  },
];

export const STATIONARY_VEHICLE_IDS = ["veh-5", "veh-6", "veh-7"];

export function circlePosition(
  center: [number, number],
  radiusDeg: number,
  angleDeg: number,
): [number, number] {
  const rad = (angleDeg * Math.PI) / 180;
  return [
    center[0] + Math.cos(rad) * radiusDeg,
    center[1] + Math.sin(rad) * radiusDeg * 0.6,
  ];
}

function findCirclePatrol(id: string) {
  return CIRCLE_PATROLS.find((patrol) =>
    patrol.vehicles.some((v) => v.id === id),
  );
}

export function createMockVehicles(): Vehicle[] {
  const rand = seededRandom(42);
  return VEHICLE_NAMES.map((name, i) => {
    const id = `veh-${i + 1}`;
    const angle = rand() * Math.PI * 2;
    const radius = 0.08 + rand() * (PATROL_MAX_RADIUS_DEG - 0.1);
    const statusRoll = rand();
    const status: Vehicle["status"] =
      statusRoll > 0.92
        ? "critical"
        : statusRoll > 0.8
          ? "warning"
          : statusRoll > 0.1
            ? "active"
            : "idle";

    const circlePatrol = findCirclePatrol(id);
    const circleVehicle = circlePatrol?.vehicles.find((v) => v.id === id);
    const isStationary = STATIONARY_VEHICLE_IDS.includes(id);

    let position: [number, number];
    let heading: number;
    let speed: number;
    let destination: [number, number];

    if (circlePatrol && circleVehicle) {
      position = circlePosition(
        circlePatrol.center,
        circlePatrol.radiusDeg,
        circleVehicle.startAngleDeg,
      );
      const ahead = circlePosition(
        circlePatrol.center,
        circlePatrol.radiusDeg,
        circleVehicle.startAngleDeg + circlePatrol.angularSpeedDeg,
      );
      heading =
        (Math.atan2(ahead[0] - position[0], ahead[1] - position[1]) * 180) /
          Math.PI +
        360;
      heading %= 360;
      speed = 8 + rand() * 3;
      destination = circlePosition(
        circlePatrol.center,
        circlePatrol.radiusDeg,
        circleVehicle.startAngleDeg + circlePatrol.angularSpeedDeg * 3,
      );
    } else if (isStationary) {
      position = [
        ORIGIN[0] + Math.cos(angle) * radius,
        ORIGIN[1] + Math.sin(angle) * radius * 0.6,
      ];
      heading = Math.round(rand() * 360);
      speed = 0;
      destination = position;
    } else {
      position = [
        ORIGIN[0] + Math.cos(angle) * radius,
        ORIGIN[1] + Math.sin(angle) * radius * 0.6,
      ];
      heading = Math.round(rand() * 360);
      speed = Math.round(rand() * 22 * 10) / 10;
      destination = randomPatrolPoint(rand);
    }

    return {
      id,
      name,
      status,
      position,
      heading,
      speed,
      battery: Math.round(40 + rand() * 60),
      connectivity: Math.round(60 + rand() * 40),
      lastUpdate: Date.now(),
      destination,
    };
  });
}


export function createMockMissions(vehicles: Vehicle[]): Mission[] {
  return [
    {
      id: "mission-1",
      name: "Coastal Patrol Alpha",
      objectives: ["Survey shipping lane", "Report anomalies"],
      route: [
        [ORIGIN[0] - 0.2, ORIGIN[1] - 0.1],
        [ORIGIN[0], ORIGIN[1]],
        [ORIGIN[0] + 0.2, ORIGIN[1] + 0.1],
      ],
      status: "active",
      assignedVehicleIds: vehicles.slice(0, 6).map((v) => v.id),
      progress: 42,
    },
    {
      id: "mission-2",
      name: "Harbor Watch Bravo",
      objectives: ["Monitor harbor entrance", "Escort vessel traffic"],
      route: [
        [ORIGIN[0] - 0.05, ORIGIN[1] + 0.15],
        [ORIGIN[0] + 0.05, ORIGIN[1] + 0.2],
      ],
      status: "active",
      assignedVehicleIds: vehicles.slice(6, 11).map((v) => v.id),
      progress: 68,
    },
  ];
}
