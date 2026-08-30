import type { AlertEvent } from "../../types";
import type { AlertSource } from "../types";

const ALERT_TEMPLATES: Array<{
  type: string;
  severity: AlertEvent["severity"];
  description: string;
}> = [
  {
    type: "battery",
    severity: "warning",
    description: "Battery level below 30%",
  },
  {
    type: "battery",
    severity: "critical",
    description: "Battery level critical, return to base recommended",
  },
  {
    type: "connectivity",
    severity: "warning",
    description: "Signal quality degraded",
  },
  {
    type: "connectivity",
    severity: "critical",
    description: "Vehicle connection lost",
  },
  {
    type: "geofence",
    severity: "warning",
    description: "Vehicle approaching mission boundary",
  },
  { type: "system", severity: "info", description: "Waypoint reached" },
];

const MIN_INTERVAL_MS = 4000;
const MAX_INTERVAL_MS = 12000;

export class MockAlertSource implements AlertSource {
  private timer: ReturnType<typeof setTimeout> | undefined;
  private listeners: Array<(alert: AlertEvent) => void> = [];
  private vehicleIds: string[];

  constructor(vehicleIds: string[]) {
    this.vehicleIds = vehicleIds;
  }

  connect(): void {
    this.scheduleNext();
  }

  disconnect(): void {
    if (this.timer) clearTimeout(this.timer);
    this.timer = undefined;
  }

  onAlert(callback: (alert: AlertEvent) => void): void {
    this.listeners.push(callback);
  }

  private scheduleNext(): void {
    const delay =
      MIN_INTERVAL_MS + Math.random() * (MAX_INTERVAL_MS - MIN_INTERVAL_MS);
    this.timer = setTimeout(() => {
      this.emitRandomAlert();
      this.scheduleNext();
    }, delay);
  }

  private emitRandomAlert(): void {
    const template =
      ALERT_TEMPLATES[Math.floor(Math.random() * ALERT_TEMPLATES.length)];
    const source =
      this.vehicleIds[Math.floor(Math.random() * this.vehicleIds.length)];
    const alert: AlertEvent = {
      id: `alert-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      type: template.type,
      severity: template.severity,
      timestamp: Date.now(),
      source,
      description: template.description,
      acknowledged: false,
    };
    for (const listener of this.listeners) listener(alert);
  }
}
