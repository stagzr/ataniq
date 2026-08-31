import type { Contact, Vehicle } from "../../lib/types";

// Picks the closest vehicle to a contact, preferring ones not already on a mission.
export function findNearestVehicle(
  vehicles: Vehicle[],
  contact: Contact,
): Vehicle | undefined {
  const available = vehicles.filter(
    (v) => v.order.type === "patrol" && v.status !== "offline",
  );
  const pool = available.length
    ? available
    : vehicles.filter((v) => v.status !== "offline");

  return nearestVehicleTo(pool, contact.position);
}

// Plain closest-vehicle lookup, regardless of current order/status.
export function nearestVehicleTo(
  vehicles: Vehicle[],
  position: [number, number],
): Vehicle | undefined {
  const distanceTo = (v: Vehicle) =>
    Math.hypot(v.position[0] - position[0], v.position[1] - position[1]);

  return vehicles.reduce<Vehicle | undefined>((nearest, v) => {
    if (!nearest) return v;
    return distanceTo(v) < distanceTo(nearest) ? v : nearest;
  }, undefined);
}

// The vehicle currently dispatched to inspect, follow, or attack a given contact, if any.
export function findAssignedVehicle(
  vehicles: Vehicle[],
  contactId: string,
): Vehicle | undefined {
  return vehicles.find(
    (v) =>
      (v.order.type === "intercept" || v.order.type === "orbit-contact") &&
      v.order.contactId === contactId,
  );
}
