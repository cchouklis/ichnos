import type { ComponentInstance, Point, Wall } from '../models';

export function clamp(value: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, value));
}

export function distance(a: Point, b: Point): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

export function closestPointOnSegment(p: Point, x1: number, y1: number, x2: number, y2: number): Point & { rotDeg: number } {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const len2 = dx * dx + dy * dy || 1e-9;
  let t = ((p.x - x1) * dx + (p.y - y1) * dy) / len2;
  t = clamp(t, 0, 1);
  return { x: x1 + t * dx, y: y1 + t * dy, rotDeg: (Math.atan2(dy, dx) * 180) / Math.PI };
}

/** Snaps a point to the nearest wall within range, returning the wall-aligned position + rotation. */
export function findWallSnap(p: Point, walls: readonly Wall[], radiusMeters = 0.35): (Point & { rotDeg: number }) | null {
  let best: (Point & { rotDeg: number }) | null = null;
  let bestDist = radiusMeters;
  for (const w of walls) {
    const c = closestPointOnSegment(p, w.x1, w.y1, w.x2, w.y2);
    const d = distance(p, c);
    if (d < bestDist) {
      bestDist = d;
      best = c;
    }
  }
  return best;
}

/** Nudges a point outward (spiral search) until clear of existing components, avoiding silent overlaps. */
export function avoidOverlap(p: Point, components: readonly ComponentInstance[], excludeId?: string, minDist = 0.16): Point {
  let { x, y } = p;
  let step = 0;
  const collides = () => components.some((c) => c.id !== excludeId && distance(c, { x, y }) < minDist);
  while (collides() && step < 12) {
    step++;
    const angle = step * 2.4;
    x = p.x + Math.cos(angle) * minDist * 0.9;
    y = p.y + Math.sin(angle) * minDist * 0.9;
  }
  return { x, y };
}

/** The outward-facing exit point for a wall-mounted component, perpendicular to the wall it's snapped to. */
function wallExitPoint(c: ComponentInstance): Point {
  const rad = ((c.rot || 0) * Math.PI) / 180;
  const nx = -Math.sin(rad);
  const ny = Math.cos(rad);
  return { x: c.x + nx * 0.22, y: c.y + ny * 0.22 };
}

/**
 * Orthogonal (Manhattan-style) routing between two components, in meters.
 * Exits each device perpendicular to its wall before turning — a simplified
 * approximation of a real conduit run, not true obstacle-aware pathfinding.
 */
export function wireWaypoints(a: ComponentInstance, b: ComponentInstance): Point[] {
  const pa = wallExitPoint(a);
  const pb = wallExitPoint(b);
  const midX = (pa.x + pb.x) / 2;
  return [
    { x: a.x, y: a.y },
    pa,
    { x: midX, y: pa.y },
    { x: midX, y: pb.y },
    pb,
    { x: b.x, y: b.y },
  ];
}

export function wireLengthMeters(a: ComponentInstance, b: ComponentInstance): number {
  const pts = wireWaypoints(a, b);
  let len = 0;
  for (let i = 0; i < pts.length - 1; i++) {
    len += distance(pts[i], pts[i + 1]);
  }
  return len;
}

export function pathFromWaypoints(pts: readonly Point[], scale: number): string {
  return pts.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x * scale} ${p.y * scale}`).join(' ');
}

/** Absolute area of a closed polygon via the shoelace formula, in the same units as the points. */
export function shoelaceArea(pts: readonly Point[]): number {
  let a = 0;
  for (let i = 0; i < pts.length; i++) {
    const p1 = pts[i];
    const p2 = pts[(i + 1) % pts.length];
    a += p1.x * p2.y - p2.x * p1.y;
  }
  return Math.abs(a / 2);
}

/**
 * Snap used while drafting a new wall: snaps to an existing wall's endpoint, or to the
 * in-progress chain's own starting point (so a loop can be closed by hand), else to a 10cm grid.
 */
export function snapDraftPoint(p: Point, walls: readonly Wall[], draftStart?: Point, radius = 0.2): Point {
  if (draftStart && distance(p, draftStart) < radius) {
    return { x: draftStart.x, y: draftStart.y };
  }
  for (const w of walls) {
    if (distance(p, { x: w.x1, y: w.y1 }) < radius) return { x: w.x1, y: w.y1 };
    if (distance(p, { x: w.x2, y: w.y2 }) < radius) return { x: w.x2, y: w.y2 };
  }
  return { x: Math.round(p.x * 10) / 10, y: Math.round(p.y * 10) / 10 };
}
