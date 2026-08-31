import type {
  AlertSource,
  ContactSource,
  MissionService,
  TelemetrySource,
  VehicleRepository,
  VideoSource,
} from "./types";
import { MockAlertSource } from "./mock/mockAlertSource";
import {
  MockMissionService,
  MockVehicleRepository,
} from "./mock/mockRepositories";
import { createMockVehicles, BASE_POSITION } from "./mock/mockData";
import { SyncedContactSource, SyncedTelemetrySource } from "./mock/syncedSources";
import {
  WsAlertSource,
  WsContactSource,
  WsTelemetrySource,
} from "./real/wsSources";

const USE_MOCK = import.meta.env.VITE_USE_MOCK !== "false";

export function createTelemetrySource(): TelemetrySource {
  if (USE_MOCK) return new SyncedTelemetrySource();
  return new WsTelemetrySource(import.meta.env.VITE_WS_TELEMETRY_URL ?? "");
}

export function createContactSource(): ContactSource {
  if (USE_MOCK) return new SyncedContactSource();
  return new WsContactSource(import.meta.env.VITE_WS_CONTACTS_URL ?? "");
}

// Fixed home port location. Mock-only for now; a real backend would expose
// this via its own API once one exists.
export function getBaseLocation(): [number, number] {
  return BASE_POSITION;
}

export function createAlertSource(): AlertSource {
  if (USE_MOCK)
    return new MockAlertSource(createMockVehicles().map((v) => v.id));
  return new WsAlertSource(import.meta.env.VITE_WS_ALERTS_URL ?? "");
}

export function createVehicleRepository(): VehicleRepository {
  return new MockVehicleRepository();
}

export function createMissionService(): MissionService {
  return new MockMissionService();
}

const RIDE_STREAM_URL = `${import.meta.env.BASE_URL}video/ride.mp4`;
const STILL_STREAM_URL = new URL("../../../still.mp4", import.meta.url).href;
const ARRIVED_STREAM_URL = new URL("../../../arrived.mp4", import.meta.url)
  .href;

export function createVideoSource(): VideoSource {
  return {
    getStreamUrl(_vehicleId: string, variant = "default") {
      if (variant === "still") return STILL_STREAM_URL;
      if (variant === "arrived") return ARRIVED_STREAM_URL;
      return RIDE_STREAM_URL;
    },
  };
}
