import type { Contact, Vehicle } from "../../lib/types";

// Picks the closest vehicle to a contact, preferring ones not already on a mission.
export function findNearestVehicle(
  vehicles: Vehicle[],
  contact: Contact,
): Vehicle | undefined {
  const distanceTo = (v: Vehicle) =>
    Math.hypot(
      v.position[0] - contact.position[0],
      v.position[1] - contact.position[1],
    );

  const available = vehicles.filter(
    (v) => v.order.type === "patrol" && v.status !== "offline",
  );
  const pool = available.length
    ? available
    : vehicles.filter((v) => v.status !== "offline");

  return pool.reduce<Vehicle | undefined>((nearest, v) => {
    if (!nearest) return v;
    return distanceTo(v) < distanceTo(nearest) ? v : nearest;
  }, undefined);
}
