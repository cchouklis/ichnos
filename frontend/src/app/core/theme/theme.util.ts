/**
 * Pure theme helpers. Deliberately free of Angular and DOM imports so they can be unit
 * tested in isolation and reused by the 2D plan, the 3D scene and the pre-bootstrap script.
 */

export type ThemeMode = 'light' | 'dark' | 'system';
export type EffectiveTheme = 'ichnos-light' | 'ichnos-dark';

export const THEME_STORAGE_KEY = 'ichnos.theme';
export const THEME_MODES: readonly ThemeMode[] = ['light', 'dark', 'system'];

/** Anything that is not a known mode (missing, tampered, from an older version) falls back to following the device. */
export function parseThemeMode(value: unknown): ThemeMode {
  return value === 'light' || value === 'dark' || value === 'system' ? value : 'system';
}

export function resolveTheme(mode: ThemeMode, prefersDark: boolean): EffectiveTheme {
  if (mode === 'light') return 'ichnos-light';
  if (mode === 'dark') return 'ichnos-dark';
  return prefersDark ? 'ichnos-dark' : 'ichnos-light';
}

// ---------------------------------------------------------------------------
// Colours used by SVG/WebGL, which cannot read daisyUI's CSS variables directly.
// All values were checked for at least 3:1 contrast (graphics) against the
// canvas background of their theme.
// ---------------------------------------------------------------------------

const CIRCUIT_PALETTES: Readonly<Record<EffectiveTheme, readonly string[]>> = {
  'ichnos-dark': ['#4fd1ff', '#ffb020', '#34d399', '#ff5470', '#c98bff', '#ffe27a'],
  'ichnos-light': ['#0b6bcb', '#b45309', '#0f8a5f', '#c62828', '#7b3fd1', '#8a6d00'],
};

/** Wire colour for a circuit number. Non-finite or out-of-range numbers wrap safely instead of yielding undefined. */
export function circuitColor(theme: EffectiveTheme, circuit: number): string {
  const palette = CIRCUIT_PALETTES[theme];
  const n = Number.isFinite(circuit) ? Math.trunc(circuit) : 1;
  const index = (((n - 1) % palette.length) + palette.length) % palette.length;
  return palette[index];
}

/** Light-theme replacements for the catalogue's category colours, which were chosen for a dark canvas. */
const LIGHT_VARIANTS: Readonly<Record<string, string>> = {
  '#ffb020': '#b86500',
  '#4fd1ff': '#0a76b8',
  '#ffe27a': '#8a6d00',
  '#ff5470': '#c62828',
  '#8fa3c4': '#52627f',
};

export function themedColor(hex: string, theme: EffectiveTheme): string {
  if (theme === 'ichnos-dark') return hex;
  return LIGHT_VARIANTS[hex.toLowerCase()] ?? hex;
}

export interface SceneColors {
  readonly floor: number;
  readonly gridMajor: number;
  readonly gridMinor: number;
  readonly wall: number;
  readonly hemiSky: number;
  readonly hemiGround: number;
}

export const SCENE_COLORS: Readonly<Record<EffectiveTheme, SceneColors>> = {
  'ichnos-dark': { floor: 0x0f1830, gridMajor: 0x2b3c63, gridMinor: 0x18233d, wall: 0xd7dfef, hemiSky: 0xbfd6ff, hemiGround: 0x1a1200 },
  'ichnos-light': { floor: 0xeef1f9, gridMajor: 0xb4bfdc, gridMinor: 0xd3dae9, wall: 0x8d9bbd, hemiSky: 0xffffff, hemiGround: 0xcfd6e6 },
};
