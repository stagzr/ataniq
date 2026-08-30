import type { Mission, Vehicle } from '../../types'
import type { MissionService, VehicleRepository } from '../types'
import { createMockMissions, createMockVehicles } from './mockData'

export class MockVehicleRepository implements VehicleRepository {
  async getVehicles(): Promise<Vehicle[]> {
    return createMockVehicles()
  }
}

export class MockMissionService implements MissionService {
  async getMissions(): Promise<Mission[]> {
    const vehicles = createMockVehicles()
    return createMockMissions(vehicles)
  }
}
