export interface LightingProfile {
  readonly poolSize: number;
  readonly shadowCasters: number;
  readonly shadowMapSize: number;
}

export interface AmbientLevels {
  readonly sky: number;
  readonly sun: number;
}

export const LAMP_CANDELA = 22;
export const LAMP_COLOR = 0xffd98a;

const DESKTOP_PROFILE: LightingProfile = { poolSize: 8, shadowCasters: 3, shadowMapSize: 1024 };
const TOUCH_PROFILE: LightingProfile = { poolSize: 4, shadowCasters: 1, shadowMapSize: 512 };
const DAYLIGHT: AmbientLevels = { sky: 0.9, sun: 0.9 };
const NIGHT: AmbientLevels = { sky: 0.06, sun: 0 };

export function lightingProfileFor(coarsePointer: boolean): LightingProfile {
  return coarsePointer ? TOUCH_PROFILE : DESKTOP_PROFILE;
}

export function ambientLevels(simulating: boolean, daylight: boolean): AmbientLevels {
  return simulating && !daylight ? NIGHT : DAYLIGHT;
}

export function brightestLamps<T extends { readonly level: number }>(lamps: readonly T[], count: number): T[] {
  return lamps
    .filter((lamp) => lamp.level > 0)
    .sort((a, b) => b.level - a.level)
    .slice(0, count);
}
