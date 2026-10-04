import type { ComponentInstance, Point, Room, Wall, Wire } from '../models';
import { closestPointOnSegment, distance, shoelaceArea } from './geometry.util';

const EPS = 1e-4;
/** A wall-mounted component sits on the wall centre line, i.e. on the room boundary; this much slack counts as "in the room". */
export const BOUNDARY_TOLERANCE_M = 0.25;

export interface SheetDocument {
  walls: readonly Wall[];
  rooms: readonly Room[];
  components: readonly ComponentInstance[];
  wires: readonly Wire[];
}

/** A wire that leaves the sheet: drawn as a short stub pointing at its destination. */
export interface WireStub {
  wireId: string;
  /** The end inside the sheet. */
  insideId: string;
  /** The end outside the sheet. */
  outsideId: string;
}

export interface SheetScope {
  wallIds: ReadonlySet<string>;
  componentIds: ReadonlySet<string>;
  /** Wires with both ends inside: editable in the sheet. */
  wireIds: ReadonlySet<string>;
  stubs: readonly WireStub[];
}

export function roomWalls(room: Room, walls: readonly Wall[]): Wall[] {
  const byId = new Map(walls.map((w) => [w.id, w]));
  return room.wallIds.map((id) => byId.get(id)).filter((w): w is Wall => !!w);
}

/** Largest opening (door or window) that still counts as part of a room's boundary, in metres. */
export const MAX_OPENING_M = 2.5;

/**
 * Orders a room's walls into a loop by walking from each wall's far end to the nearest unused wall.
 * Openings up to MAX_OPENING_M between walls (doors, windows) are bridged by a straight edge.
 * Returns the boundary points, or [] when the walls do not enclose anything (fewer than three,
 * a gap that is too large, or a loop that does not return to its start).
 */
export function roomPolygon(room: Room, walls: readonly Wall[]): Point[] {
  const remaining = roomWalls(room, walls);
  if (remaining.length < 3) return [];
  const first = remaining.shift() as Wall;
  const start: Point = { x: first.x1, y: first.y1 };
  const poly: Point[] = [start];
  let tip: Point = { x: first.x2, y: first.y2 };
  poly.push(tip);
  while (remaining.length) {
    let best = { index: -1, flip: false, dist: Infinity };
    remaining.forEach((w, index) => {
      const dStart = distance(tip, { x: w.x1, y: w.y1 });
      const dEnd = distance(tip, { x: w.x2, y: w.y2 });
      if (dStart < best.dist) best = { index, flip: false, dist: dStart };
      if (dEnd < best.dist) best = { index, flip: true, dist: dEnd };
    });
    if (best.dist > MAX_OPENING_M) return [];
    const [w] = remaining.splice(best.index, 1);
    const near: Point = best.flip ? { x: w.x2, y: w.y2 } : { x: w.x1, y: w.y1 };
    const far: Point = best.flip ? { x: w.x1, y: w.y1 } : { x: w.x2, y: w.y2 };
    if (distance(near, tip) > EPS) poly.push(near);
    poly.push(far);
    tip = far;
  }
  if (distance(tip, start) > MAX_OPENING_M) return [];
  if (distance(tip, start) <= EPS) poly.pop();
  return poly;
}

/** Closure is derived, never stored: a room may exist (and be saved) before it is closed. */
export function isRoomClosed(room: Room, walls: readonly Wall[]): boolean {
  return roomPolygon(room, walls).length >= 3;
}

export function roomArea(room: Room, walls: readonly Wall[]): number {
  const poly = roomPolygon(room, walls);
  return poly.length >= 3 ? shoelaceArea(poly) : 0;
}

export function pointInPolygon(p: Point, poly: readonly Point[]): boolean {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const a = poly[i];
    const b = poly[j];
    if (a.y > p.y !== b.y > p.y && p.x < ((b.x - a.x) * (p.y - a.y)) / (b.y - a.y) + a.x) inside = !inside;
  }
  return inside;
}

function distanceToPolygonEdge(p: Point, poly: readonly Point[]): number {
  let best = Infinity;
  for (let i = 0; i < poly.length; i++) {
    const a = poly[i];
    const b = poly[(i + 1) % poly.length];
    best = Math.min(best, distance(p, closestPointOnSegment(p, a.x, a.y, b.x, b.y)));
  }
  return best;
}

/**
 * The room a point belongs to, or null. A point strictly inside wins (smallest room first, so nested
 * rooms resolve to the inner one); otherwise the room whose boundary is closest within the tolerance,
 * which is how wall-mounted components are assigned.
 */
export function roomIdAt(p: Point, doc: Pick<SheetDocument, 'rooms' | 'walls'>, tolerance = BOUNDARY_TOLERANCE_M): string | null {
  let inside: { id: string; area: number } | null = null;
  let near: { id: string; dist: number } | null = null;
  for (const room of doc.rooms) {
    const poly = roomPolygon(room, doc.walls);
    if (poly.length < 3) continue;
    if (pointInPolygon(p, poly)) {
      const area = shoelaceArea(poly);
      if (!inside || area < inside.area) inside = { id: room.id, area };
      continue;
    }
    const d = distanceToPolygonEdge(p, poly);
    if (d <= tolerance && (!near || d < near.dist)) near = { id: room.id, dist: d };
  }
  return inside?.id ?? near?.id ?? null;
}

/** What belongs to a room sheet. `roomId === null` (the master plan) has no scope: everything is editable. */
export function scopeToRoom(doc: SheetDocument, roomId: string): SheetScope {
  const room = doc.rooms.find((r) => r.id === roomId);
  const wallIds = new Set(room?.wallIds ?? []);
  const componentIds = new Set(doc.components.filter((c) => c.roomId === roomId).map((c) => c.id));
  const wireIds = new Set<string>();
  const stubs: WireStub[] = [];
  for (const w of doc.wires) {
    const a = componentIds.has(w.a);
    const b = componentIds.has(w.b);
    if (a && b) wireIds.add(w.id);
    else if (a || b) stubs.push({ wireId: w.id, insideId: a ? w.a : w.b, outsideId: a ? w.b : w.a });
  }
  return { wallIds, componentIds, wireIds, stubs };
}

/** Components without a room get one from their position (used when loading data that predates sheets). */
export function assignRoomIds(doc: SheetDocument): ComponentInstance[] {
  return doc.components.map((c) => (c.roomId === undefined ? { ...c, roomId: roomIdAt(c, doc) } : c));
}
