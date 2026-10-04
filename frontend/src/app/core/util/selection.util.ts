import type { ComponentInstance, ElementKind, ElementRef, Point, Room, Wall, Wire } from '../models';
import { wireWaypoints } from './geometry.util';

export interface PlanDocument {
  walls: readonly Wall[];
  rooms: readonly Room[];
  components: readonly ComponentInstance[];
  wires: readonly Wire[];
}

/** Axis-aligned rectangle in plan coordinates (metres); corners may be given in any order. */
export interface Rect {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

export const ALL_KINDS: readonly ElementKind[] = ['wall', 'component', 'wire'];

export function normalizeRect(r: Rect): Rect {
  return {
    x1: Math.min(r.x1, r.x2),
    y1: Math.min(r.y1, r.y2),
    x2: Math.max(r.x1, r.x2),
    y2: Math.max(r.y1, r.y2),
  };
}

export function pointInRect(p: Point, rect: Rect): boolean {
  const r = normalizeRect(rect);
  return p.x >= r.x1 && p.x <= r.x2 && p.y >= r.y1 && p.y <= r.y2;
}

/** Liang–Barsky: true if the segment a→b touches or crosses the rectangle. */
export function segmentIntersectsRect(a: Point, b: Point, rect: Rect): boolean {
  const r = normalizeRect(rect);
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const p = [-dx, dx, -dy, dy];
  const q = [a.x - r.x1, r.x2 - a.x, a.y - r.y1, r.y2 - a.y];
  let t0 = 0;
  let t1 = 1;
  for (let i = 0; i < 4; i++) {
    if (p[i] === 0) {
      if (q[i] < 0) return false;
    } else {
      const t = q[i] / p[i];
      if (p[i] < 0) {
        if (t > t1) return false;
        t0 = Math.max(t0, t);
      } else {
        if (t < t0) return false;
        t1 = Math.min(t1, t);
      }
    }
  }
  return true;
}

export function refKey(ref: ElementRef): string {
  return `${ref.kind}:${ref.id}`;
}

export function sameRef(a: ElementRef, b: ElementRef): boolean {
  return a.kind === b.kind && a.id === b.id;
}

export function includesRef(list: readonly ElementRef[], ref: ElementRef): boolean {
  return list.some((r) => sameRef(r, ref));
}

/** Adds the ref if absent, removes it if present (shift-click semantics). */
export function toggleRef(list: readonly ElementRef[], ref: ElementRef): ElementRef[] {
  return includesRef(list, ref) ? list.filter((r) => !sameRef(r, ref)) : [...list, ref];
}

/** All elements of the allowed kinds that the rectangle touches. */
export function elementsInRect(doc: PlanDocument, rect: Rect, kinds: readonly ElementKind[] = ALL_KINDS): ElementRef[] {
  const out: ElementRef[] = [];
  if (kinds.includes('wall')) {
    for (const w of doc.walls) {
      if (segmentIntersectsRect({ x: w.x1, y: w.y1 }, { x: w.x2, y: w.y2 }, rect)) out.push({ kind: 'wall', id: w.id });
    }
  }
  if (kinds.includes('component')) {
    for (const c of doc.components) {
      if (pointInRect(c, rect)) out.push({ kind: 'component', id: c.id });
    }
  }
  if (kinds.includes('wire')) {
    const byId = new Map(doc.components.map((c) => [c.id, c]));
    for (const wire of doc.wires) {
      const a = byId.get(wire.a);
      const b = byId.get(wire.b);
      if (!a || !b) continue;
      const pts = wireWaypoints(a, b);
      for (let i = 0; i < pts.length - 1; i++) {
        if (segmentIntersectsRect(pts[i], pts[i + 1], rect)) {
          out.push({ kind: 'wire', id: wire.id });
          break;
        }
      }
    }
  }
  return out;
}

/**
 * Returns a copy of the document without the referenced elements, keeping it consistent:
 * wires attached to a removed component go too, and removed walls leave every room's wall list.
 */
export function removeElements(doc: PlanDocument, refs: readonly ElementRef[]): PlanDocument {
  const ids = (kind: ElementKind) => new Set(refs.filter((r) => r.kind === kind).map((r) => r.id));
  const wallIds = ids('wall');
  const compIds = ids('component');
  const wireIds = ids('wire');
  return {
    walls: doc.walls.filter((w) => !wallIds.has(w.id)),
    // A room survives losing a wall (it may simply be open again); the wall just leaves its list.
    rooms: doc.rooms.map((r) => (r.wallIds.some((id) => wallIds.has(id)) ? { ...r, wallIds: r.wallIds.filter((id) => !wallIds.has(id)) } : r)),
    components: doc.components.filter((c) => !compIds.has(c.id)),
    wires: doc.wires.filter((w) => !wireIds.has(w.id) && !compIds.has(w.a) && !compIds.has(w.b)),
  };
}

/** The common value of a list, or null when empty or mixed (used for multi-selection fields). */
export function sharedValue<T>(values: readonly T[]): T | null {
  if (!values.length) return null;
  return values.every((v) => v === values[0]) ? values[0] : null;
}

/** Filters refs down to one kind. */
export function refsOfKind(refs: readonly ElementRef[], kind: ElementKind): ElementRef[] {
  return refs.filter((r) => r.kind === kind);
}

/** Every element of the allowed kinds, e.g. for "select all". */
export function allElements(doc: PlanDocument, kinds: readonly ElementKind[] = ALL_KINDS): ElementRef[] {
  return [
    ...(kinds.includes('wall') ? doc.walls.map((w): ElementRef => ({ kind: 'wall', id: w.id })) : []),
    ...(kinds.includes('component') ? doc.components.map((c): ElementRef => ({ kind: 'component', id: c.id })) : []),
    ...(kinds.includes('wire') ? doc.wires.map((w): ElementRef => ({ kind: 'wire', id: w.id })) : []),
  ];
}
