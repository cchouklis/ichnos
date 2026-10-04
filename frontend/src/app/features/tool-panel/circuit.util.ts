export const MIN_CIRCUIT = 1;
export const MAX_CIRCUIT = 99;

/** Parses a circuit number, clamped to the supported range; null when the input is empty or not a number. */
export function parseCircuit(raw: unknown): number | null {
  if (raw === '' || raw === null || raw === undefined) return null;
  const n = Number(raw);
  return Number.isFinite(n) ? Math.max(MIN_CIRCUIT, Math.min(MAX_CIRCUIT, Math.round(n))) : null;
}
