import type { AlertEvent, Vehicle } from "../../types";
import type { AlertSource, TelemetrySource } from "../types";

// Real implementations connect to a live WebSocket backend once one exists.
// Same interface as the mock sources, so swapping requires no UI/store changes.

export class WsTelemetrySource implements TelemetrySource {
  private socket: WebSocket | undefined;
  private listeners: Array<(vehicles: Vehicle[]) => void> = [];

  constructor(private url: string) {}

  connect(): void {
    this.socket = new WebSocket(this.url);
    this.socket.onmessage = (event) => {
      const vehicles = JSON.parse(event.data) as Vehicle[];
      for (const listener of this.listeners) listener(vehicles);
    };
  }

  disconnect(): void {
    this.socket?.close();
    this.socket = undefined;
  }

  onUpdate(callback: (vehicles: Vehicle[]) => void): void {
    this.listeners.push(callback);
  }
}

export class WsAlertSource implements AlertSource {
  private socket: WebSocket | undefined;
  private listeners: Array<(alert: AlertEvent) => void> = [];

  constructor(private url: string) {}

  connect(): void {
    this.socket = new WebSocket(this.url);
    this.socket.onmessage = (event) => {
      const alert = JSON.parse(event.data) as AlertEvent;
      for (const listener of this.listeners) listener(alert);
    };
  }

  disconnect(): void {
    this.socket?.close();
    this.socket = undefined;
  }

  onAlert(callback: (alert: AlertEvent) => void): void {
    this.listeners.push(callback);
  }
}
