/**
 * Millimetre handling. Wall thickness, wall height and mount heights are whole millimetres
 * everywhere in the UI and the document. Plan coordinates are still metres (see the
 * architecture plan, ADR-3), so conversion to metres happens here and only at the edges
 * that need it (the 3D scene, geometry maths, the current backend).
 */

export const MM_PER_METER = 1000;

export function mmToMeters(mm: number): number {
  return mm / MM_PER_METER;
}

export function metersToMm(meters: number): number {
  return Math.round(meters * MM_PER_METER);
}

export interface MmRange {
  readonly min: number;
  readonly max: number;
  readonly step: number;
  readonly default: number;
}

// Ranges match the validation the backend will enforce (Phase 6).
export const WALL_THICKNESS_MM: MmRange = { min: 10, max: 1000, step: 10, default: 120 };
export const WALL_HEIGHT_MM: MmRange = { min: 500, max: 10000, step: 50, default: 2700 };
export const MOUNT_HEIGHT_MM: MmRange = { min: 0, max: 10000, step: 10, default: 1200 };

/** Rounds to a whole millimetre and keeps the value inside the range. Non-finite input yields the default. */
export function clampToRange(value: number, range: MmRange): number {
  if (!Number.isFinite(value)) return range.default;
  return Math.min(range.max, Math.max(range.min, Math.round(value)));
}

/** Parses a form field value. Returns null when it is empty or not a number, so callers can ignore it. */
export function parseMmInput(raw: unknown, range: MmRange): number | null {
  if (raw === null || raw === undefined || raw === '') return null;
  const n = typeof raw === 'number' ? raw : Number(raw);
  return Number.isFinite(n) ? clampToRange(n, range) : null;
}

export function formatMm(mm: number): string {
  return `${Math.round(mm)} mm`;
}
