import type {
  AlertSource,
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
import { createMockVehicles } from "./mock/mockData";
import { MockTelemetrySource } from "./mock/mockTelemetrySource";
import { WsAlertSource, WsTelemetrySource } from "./real/wsSources";

const USE_MOCK = import.meta.env.VITE_USE_MOCK !== "false";

export function createTelemetrySource(): TelemetrySource {
  if (USE_MOCK) return new MockTelemetrySource();
  return new WsTelemetrySource(import.meta.env.VITE_WS_TELEMETRY_URL ?? "");
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

const SAMPLE_STREAM_URL = `${import.meta.env.BASE_URL}video/ride.mp4`;

export function createVideoSource(): VideoSource {
  return {
    getStreamUrl(_vehicleId: string) {
      return SAMPLE_STREAM_URL;
    },
  };
}
