import type { ComponentInstance, ProjectDto, Wall } from '../models';
import { mmToMeters, metersToMm } from '../units/units.util';

/**
 * Wire format of the current backend (lengths in metres).
 * Temporary anti-corruption layer: removed in Phase 6 when the API switches to millimetres.
 */
export interface WallWire extends Omit<Wall, 'thicknessMm' | 'heightMm'> {
  thickness: number;
  height: number;
}

/** The current backend has no room sheets: roomId is not sent and is re-derived from geometry on load. */
export interface ComponentWire extends Omit<ComponentInstance, 'mountHeightMm' | 'roomId'> {
  mountHeight?: number;
}

export interface ProjectWire extends Omit<ProjectDto, 'walls' | 'components'> {
  walls: WallWire[];
  components: ComponentWire[];
}

export function toWire(dto: ProjectDto): ProjectWire {
  return {
    ...dto,
    walls: dto.walls.map(({ thicknessMm, heightMm, ...w }) => ({
      ...w,
      thickness: mmToMeters(thicknessMm),
      height: mmToMeters(heightMm),
    })),
    components: dto.components.map(({ mountHeightMm, roomId: _roomId, ...c }) =>
      mountHeightMm === undefined ? c : { ...c, mountHeight: mmToMeters(mountHeightMm) },
    ),
  };
}

export function fromWire(wire: ProjectWire): ProjectDto {
  return {
    ...wire,
    walls: wire.walls.map(({ thickness, height, ...w }) => ({
      ...w,
      thicknessMm: Math.round(metersToMm(thickness)),
      heightMm: Math.round(metersToMm(height)),
    })),
    components: wire.components.map(({ mountHeight, ...c }) =>
      mountHeight === undefined || mountHeight === null
        ? c
        : { ...c, mountHeightMm: Math.round(metersToMm(mountHeight)) },
    ),
  };
}
