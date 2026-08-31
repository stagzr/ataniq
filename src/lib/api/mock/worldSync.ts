import type {
  Contact,
  FormationMission,
  InterceptMarker,
  Vehicle,
  VehicleCommand,
} from "../../types";
import { MockContactSource } from "./mockContactSource";
import { MockTelemetrySource } from "./mockTelemetrySource";

// Keeps every open tab of the app looking at the same simulated fleet.
// One tab wins a Web Locks election and becomes the "leader" that actually
// runs the mock simulation; every tab (leader included) broadcasts and
// listens for updates over a BroadcastChannel so viewer tabs mirror the
// leader's state and forward commands back to it instead of running their
// own disconnected simulation.
type WorldMessage =
  | { kind: "vehicles"; vehicles: Vehicle[] }
  | { kind: "contacts"; contacts: Contact[] }
  | { kind: "intercept-marker"; marker: InterceptMarker }
  | { kind: "command"; vehicleId: string; command: VehicleCommand }
  | { kind: "mission-add"; mission: FormationMission }
  | { kind: "mission-update"; mission: FormationMission }
  | { kind: "mission-remove"; missionId: string }
  | { kind: "request-missions" }
  | { kind: "missions-snapshot"; missions: FormationMission[] };

const LEADER_LOCK_NAME = "ataniq-world-leader";

class World {
  private channel = new BroadcastChannel("ataniq-world");
  private isLeader = false;
  private realTelemetry: MockTelemetrySource | undefined;
  private realContacts: MockContactSource | undefined;
  private vehicleListeners = new Set<(vehicles: Vehicle[]) => void>();
  private contactListeners = new Set<(contacts: Contact[]) => void>();
  private markerListeners = new Set<(marker: InterceptMarker) => void>();
  private missions = new Map<string, FormationMission>();
  private missionListeners = new Set<(missions: FormationMission[]) => void>();
  private latestVehicles: Vehicle[] = [];
  private latestContacts: Contact[] = [];

  constructor() {
    this.channel.onmessage = (e: MessageEvent<WorldMessage>) =>
      this.handleMessage(e.data);
    this.channel.postMessage({ kind: "request-missions" });
    this.electLeader();
  }

  private electLeader(): void {
    if (!("locks" in navigator)) {
      // fallback for environments without the Web Locks API
      this.becomeLeader();
      return;
    }
    navigator.locks.request(
      LEADER_LOCK_NAME,
      { ifAvailable: true },
      async (lock) => {
        if (lock) {
          this.becomeLeader();
          await new Promise(() => {}); // hold the lock for the life of this tab
        } else {
          this.isLeader = false;
        }
      },
    );
  }

  private becomeLeader(): void {
    this.isLeader = true;
    this.realTelemetry = new MockTelemetrySource();
    this.realContacts = new MockContactSource();
    const contacts = this.realContacts;
    this.realTelemetry.setContactsProvider(() => contacts.getSnapshot());
    this.realTelemetry.setContactResolvedHandler((contactId, mode) =>
      contacts.resolveContact(contactId, mode),
    );
    this.realTelemetry.onUpdate((vehicles) => {
      this.latestVehicles = vehicles;
      this.channel.postMessage({ kind: "vehicles", vehicles });
      for (const l of this.vehicleListeners) l(vehicles);
    });
    this.realTelemetry.onInterceptMarker((marker) => {
      this.channel.postMessage({ kind: "intercept-marker", marker });
      for (const l of this.markerListeners) l(marker);
    });
    this.realContacts.onUpdate((contactsList) => {
      this.latestContacts = contactsList;
      this.channel.postMessage({ kind: "contacts", contacts: contactsList });
      for (const l of this.contactListeners) l(contactsList);
    });
    this.realTelemetry.connect();
    this.realContacts.connect();
  }

  private handleMessage(msg: WorldMessage): void {
    switch (msg.kind) {
      case "vehicles":
        this.latestVehicles = msg.vehicles;
        for (const l of this.vehicleListeners) l(msg.vehicles);
        break;
      case "contacts":
        this.latestContacts = msg.contacts;
        for (const l of this.contactListeners) l(msg.contacts);
        break;
      case "intercept-marker":
        for (const l of this.markerListeners) l(msg.marker);
        break;
      case "command":
        if (this.isLeader) this.realTelemetry?.sendCommand(msg.vehicleId, msg.command);
        break;
      case "mission-add":
        this.missions.set(msg.mission.id, msg.mission);
        this.notifyMissions();
        break;
      case "mission-update":
        this.missions.set(msg.mission.id, msg.mission);
        this.notifyMissions();
        break;
      case "mission-remove":
        this.missions.delete(msg.missionId);
        this.notifyMissions();
        break;
      case "request-missions":
        if (this.missions.size) {
          this.channel.postMessage({
            kind: "missions-snapshot",
            missions: [...this.missions.values()],
          });
        }
        break;
      case "missions-snapshot":
        for (const m of msg.missions) this.missions.set(m.id, m);
        this.notifyMissions();
        break;
    }
  }

  private notifyMissions(): void {
    const list = [...this.missions.values()];
    for (const l of this.missionListeners) l(list);
  }

  onVehicles(cb: (vehicles: Vehicle[]) => void): () => void {
    this.vehicleListeners.add(cb);
    if (this.latestVehicles.length) cb(this.latestVehicles);
    return () => this.vehicleListeners.delete(cb);
  }

  onContacts(cb: (contacts: Contact[]) => void): () => void {
    this.contactListeners.add(cb);
    if (this.latestContacts.length) cb(this.latestContacts);
    return () => this.contactListeners.delete(cb);
  }

  onInterceptMarker(cb: (marker: InterceptMarker) => void): () => void {
    this.markerListeners.add(cb);
    return () => this.markerListeners.delete(cb);
  }

  sendCommand(vehicleId: string, command: VehicleCommand): void {
    if (this.isLeader && this.realTelemetry) {
      this.realTelemetry.sendCommand(vehicleId, command);
    } else {
      this.channel.postMessage({ kind: "command", vehicleId, command });
    }
  }

  onMissions(cb: (missions: FormationMission[]) => void): () => void {
    this.missionListeners.add(cb);
    if (this.missions.size) cb([...this.missions.values()]);
    return () => this.missionListeners.delete(cb);
  }

  addMission(mission: FormationMission): void {
    this.missions.set(mission.id, mission);
    this.channel.postMessage({ kind: "mission-add", mission });
    this.notifyMissions();
  }

  updateMission(mission: FormationMission): void {
    this.missions.set(mission.id, mission);
    this.channel.postMessage({ kind: "mission-update", mission });
    this.notifyMissions();
  }

  removeMission(missionId: string): void {
    this.missions.delete(missionId);
    this.channel.postMessage({ kind: "mission-remove", missionId });
    this.notifyMissions();
  }
}

export const world = new World();
