import type { AlertSource, MissionService, TelemetrySource, VehicleRepository, VideoSource } from './types'
import { MockAlertSource } from './mock/mockAlertSource'
import { MockMissionService, MockVehicleRepository } from './mock/mockRepositories'
import { createMockVehicles } from './mock/mockData'
import { MockTelemetrySource } from './mock/mockTelemetrySource'
import { WsAlertSource, WsTelemetrySource } from './real/wsSources'

const USE_MOCK = import.meta.env.VITE_USE_MOCK !== 'false'

export function createTelemetrySource(): TelemetrySource {
  if (USE_MOCK) return new MockTelemetrySource()
  return new WsTelemetrySource(import.meta.env.VITE_WS_TELEMETRY_URL ?? '')
}

export function createAlertSource(): AlertSource {
  if (USE_MOCK) return new MockAlertSource(createMockVehicles().map((v) => v.id))
  return new WsAlertSource(import.meta.env.VITE_WS_ALERTS_URL ?? '')
}

export function createVehicleRepository(): VehicleRepository {
  return new MockVehicleRepository()
}

export function createMissionService(): MissionService {
  return new MockMissionService()
}

const SAMPLE_STREAM_URLS = [
  'https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4',
  'https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.webm',
]

export function createVideoSource(): VideoSource {
  return {
    getStreamUrl(vehicleId: string) {
      const index = Math.abs(hashCode(vehicleId)) % SAMPLE_STREAM_URLS.length
      return SAMPLE_STREAM_URLS[index]
    },
  }
}

function hashCode(value: string): number {
  let hash = 0
  for (let i = 0; i < value.length; i++) hash = (hash << 5) - hash + value.charCodeAt(i)
  return hash
}
