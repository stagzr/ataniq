// Evenly spaces `count` points around a circle of `radiusDeg` centered on `center`.
export function computeCirclePositions(
  center: [number, number],
  radiusDeg: number,
  count: number,
): [number, number][] {
  if (count <= 0) return [];
  return Array.from({ length: count }, (_, i) => {
    const angle = (i / count) * Math.PI * 2;
    return [
      center[0] + Math.sin(angle) * radiusDeg,
      center[1] + Math.cos(angle) * radiusDeg * 0.6,
    ] as [number, number];
  });
}

// Evenly spaces `count` points along the segment from `start` to `end` (inclusive).
export function computeLinePositions(
  start: [number, number],
  end: [number, number],
  count: number,
): [number, number][] {
  if (count <= 0) return [];
  if (count === 1) {
    return [[(start[0] + end[0]) / 2, (start[1] + end[1]) / 2]];
  }
  return Array.from({ length: count }, (_, i) => {
    const t = i / (count - 1);
    return [
      start[0] + (end[0] - start[0]) * t,
      start[1] + (end[1] - start[1]) * t,
    ] as [number, number];
  });
}

// Shortest distance from a point to a line segment, in degrees (flat approximation).
export function distancePointToSegment(
  point: [number, number],
  segStart: [number, number],
  segEnd: [number, number],
): number {
  const [px, py] = point;
  const [ax, ay] = segStart;
  const [bx, by] = segEnd;
  const dx = bx - ax;
  const dy = by - ay;
  const lengthSq = dx * dx + dy * dy;
  if (lengthSq === 0) return Math.hypot(px - ax, py - ay);

  let t = ((px - ax) * dx + (py - ay) * dy) / lengthSq;
  t = Math.max(0, Math.min(1, t));
  const closestX = ax + t * dx;
  const closestY = ay + t * dy;
  return Math.hypot(px - closestX, py - closestY);
}
