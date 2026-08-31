import { MockContactSource } from "./mockContactSource";
import { MockTelemetrySource } from "./mockTelemetrySource";

// Contacts and telemetry are wired together (intercept orders need to read
// live contact positions and report back when a contact has been resolved),
// so both mock sources share one instance across the app instead of each
// consumer creating its own disconnected copy.
let telemetry: MockTelemetrySource | undefined;
let contacts: MockContactSource | undefined;

function ensureWorld() {
  if (!telemetry || !contacts) {
    telemetry = new MockTelemetrySource();
    contacts = new MockContactSource();
    const contactSource = contacts;
    telemetry.setContactsProvider(() => contactSource.getSnapshot());
    telemetry.setContactResolvedHandler((contactId, mode) => {
      contactSource.resolveContact(contactId, mode);
    });
  }
  return { telemetry, contacts };
}

export function getMockTelemetrySource(): MockTelemetrySource {
  return ensureWorld().telemetry;
}

export function getMockContactSource(): MockContactSource {
  return ensureWorld().contacts;
}
