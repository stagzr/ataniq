export type VehicleStatus =
  | "active"
  | "idle"
  | "warning"
  | "critical"
  | "offline";

export interface Vehicle {
  id: string;
  name: string;
  status: VehicleStatus;
  position: [number, number]; // [lng, lat]
  heading: number; // degrees, 0 = north
  speed: number; // knots
  battery: number; // percent 0-100
  connectivity: number; // signal quality 0-100
  lastUpdate: number; // epoch ms
  destination: [number, number]; // [lng, lat] waypoint the vehicle is heading toward
  order: VehicleOrder; // current directive the vehicle is carrying out
}

export type VehicleOrder =
  | { type: "patrol" }
  | { type: "return-to-base" }
  | {
      type: "intercept";
      contactId: string;
      mode: "inspect" | "attack";
      // order to resume once the intercept resolves (e.g. an embargo station)
      returnOrder?: VehicleOrder;
      missionId?: string;
    }
  | {
      type: "orbit-contact";
      contactId: string;
      radiusDeg: number;
      missionId?: string;
    }
  | {
      type: "hold-position";
      point: [number, number];
      embargoLine?: [[number, number], [number, number]];
      missionId?: string;
    };

export type VehicleCommand =
  | { type: "return-to-base" }
  | {
      type: "intercept";
      contactId: string;
      mode: "inspect" | "attack";
      missionId?: string;
    }
  | {
      type: "orbit-contact";
      contactId: string;
      radiusDeg: number;
      missionId?: string;
    }
  | {
      type: "hold-position";
      point: [number, number];
      embargoLine?: [[number, number], [number, number]];
      missionId?: string;
    }
  | { type: "resume-patrol" };

export type FormationActionType =
  | "attack"
  | "inspect"
  | "circle"
  | "line"
  | "embargo";

export type FormationGeometry =
  | { type: "circle"; center: [number, number]; radiusDeg: number }
  | { type: "line"; start: [number, number]; end: [number, number] };

export interface FormationMission {
  id: string;
  action: FormationActionType;
  vehicleIds: string[];
  contactId?: string;
  geometry?: FormationGeometry;
  createdAt: number;
}

export type MissionStatus =
  | "planned"
  | "active"
  | "paused"
  | "completed"
  | "aborted";

export interface Mission {
  id: string;
  name: string;
  objectives: string[];
  route: [number, number][];
  status: MissionStatus;
  assignedVehicleIds: string[];
  progress: number; // percent 0-100
}

export type AlertSeverity = "info" | "warning" | "critical";

export interface AlertEvent {
  id: string;
  type: string;
  severity: AlertSeverity;
  timestamp: number;
  source: string;
  description: string;
  acknowledged: boolean;
}

export interface Stream {
  vehicleId: string;
  src: string;
  active: boolean;
}

export type ContactStatus =
  | "unidentified"
  | "inspecting"
  | "identified"
  | "neutralized";

export interface Contact {
  id: string;
  label: string;
  status: ContactStatus;
  position: [number, number]; // [lng, lat]
  heading: number;
  speed: number; // knots
  destination: [number, number];
  lastUpdate: number;
}

export interface InterceptMarker {
  id: string;
  position: [number, number];
  mode: "inspect" | "attack";
  timestamp: number;
}
