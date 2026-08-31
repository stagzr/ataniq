import type { Mission, Vehicle } from "../../types";

// Fictional patrol area in open water east of Gotland, mock only. Keep radius
// well clear of Gotland's east coast (~0.9deg away) so vehicles stay at sea.
export const PATROL_CENTER: [number, number] = [19.9, 57.5];
export const PATROL_MAX_RADIUS_DEG = 0.28;
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
  const radius = 0.03 + rand() * (PATROL_MAX_RADIUS_DEG - 0.05);
  return [
    PATROL_CENTER[0] + Math.cos(angle) * radius,
    PATROL_CENTER[1] + Math.sin(angle) * radius * 0.6,
  ];
}

export function createMockVehicles(): Vehicle[] {
  const rand = seededRandom(42);
  return VEHICLE_NAMES.map((name, i) => {
    const angle = rand() * Math.PI * 2;
    const radius = 0.03 + rand() * (PATROL_MAX_RADIUS_DEG - 0.05);
    const statusRoll = rand();
    return {
      id: `veh-${i + 1}`,
      name,
      status:
        statusRoll > 0.92
          ? "critical"
          : statusRoll > 0.8
            ? "warning"
            : statusRoll > 0.1
              ? "active"
              : "idle",
      position: [
        ORIGIN[0] + Math.cos(angle) * radius,
        ORIGIN[1] + Math.sin(angle) * radius * 0.6,
      ],
      heading: Math.round(rand() * 360),
      speed: Math.round(rand() * 22 * 10) / 10,
      battery: Math.round(40 + rand() * 60),
      connectivity: Math.round(60 + rand() * 40),
      lastUpdate: Date.now(),
      destination: randomPatrolPoint(rand),
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
