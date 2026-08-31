import type { Contact } from "../../types";
import type { ContactSource } from "../types";
import { createMockContacts, randomPatrolPoint } from "./mockData";

const TICK_MS = 1500;
const DESTINATION_REACHED_DEG = 0.02;

// Simple wandering contacts (unidentified vessels), independent of fleet vehicles.
export class MockContactSource implements ContactSource {
  private contacts: Contact[] = createMockContacts();
  private timer: ReturnType<typeof setInterval> | undefined;
  private listeners: Array<(contacts: Contact[]) => void> = [];

  connect(): void {
    if (this.timer) return;
    this.timer = setInterval(() => this.tick(), TICK_MS);
  }

  disconnect(): void {
    if (this.timer) clearInterval(this.timer);
    this.timer = undefined;
  }

  onUpdate(callback: (contacts: Contact[]) => void): void {
    this.listeners.push(callback);
  }

  getSnapshot(): Contact[] {
    return this.contacts;
  }

  resolveContact(contactId: string, mode: "inspect" | "attack"): void {
    this.contacts = this.contacts.map((c) =>
      c.id === contactId
        ? { ...c, status: mode === "attack" ? "neutralized" : "identified" }
        : c,
    );
    for (const listener of this.listeners) listener(this.contacts);
  }

  private tick(): void {
    this.contacts = this.contacts.map((c) => this.simulateStep(c));
    for (const listener of this.listeners) listener(this.contacts);
  }

  private simulateStep(c: Contact): Contact {
    if (c.status === "neutralized") return c;

    const destination: [number, number] =
      Math.hypot(
        c.destination[0] - c.position[0],
        c.destination[1] - c.position[1],
      ) < DESTINATION_REACHED_DEG
        ? randomPatrolPoint(Math.random)
        : c.destination;

    const bearing =
      (Math.atan2(
        destination[0] - c.position[0],
        destination[1] - c.position[1],
      ) *
        180) /
      Math.PI;
    const heading = (bearing + (Math.random() - 0.5) * 10 + 360) % 360;

    const speed = Math.max(2, Math.min(14, c.speed + (Math.random() - 0.5)));
    const distance = (speed * (TICK_MS / 1000)) / 20000;
    const rad = (heading * Math.PI) / 180;
    const position: [number, number] = [
      c.position[0] + Math.sin(rad) * distance,
      c.position[1] + Math.cos(rad) * distance,
    ];

    return {
      ...c,
      heading,
      speed,
      position,
      destination,
      lastUpdate: Date.now(),
    };
  }
}
