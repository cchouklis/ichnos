import type { ComponentInstance, PowerRole, Wire } from '../models';

export interface SwitchSetting {
  readonly on: boolean;
  readonly level: number;
}

export type SwitchSettings = ReadonlyMap<string, SwitchSetting>;

export interface WireFlow {
  readonly from: string;
  readonly to: string;
}

export interface PowerState {
  readonly levels: ReadonlyMap<string, number>;
  readonly flows: ReadonlyMap<string, WireFlow>;
}

export const DEFAULT_SWITCH_SETTING: SwitchSetting = { on: true, level: 1 };
export const EMPTY_POWER_STATE: PowerState = { levels: new Map(), flows: new Map() };

const MIN_LEVEL = 1e-6;

type RoleOf = (component: ComponentInstance) => PowerRole;

function outgoingLevel(role: PowerRole, incoming: number, setting: SwitchSetting): number {
  switch (role) {
    case 'source':
      return 1;
    case 'conductor':
      return incoming;
    case 'switch':
      return setting.on ? incoming : 0;
    case 'dimmer':
      return setting.on ? incoming * setting.level : 0;
    case 'load':
      return 0;
  }
}

function adjacency(wires: readonly Wire[]): Map<string, Wire[]> {
  const byComponent = new Map<string, Wire[]>();
  for (const wire of wires) {
    for (const id of [wire.a, wire.b]) {
      const list = byComponent.get(id);
      if (list) list.push(wire);
      else byComponent.set(id, [wire]);
    }
  }
  return byComponent;
}

export function solvePower(
  components: readonly ComponentInstance[],
  wires: readonly Wire[],
  settings: SwitchSettings,
  roleOf: RoleOf,
): PowerState {
  const roles = new Map(components.map((c) => [c.id, roleOf(c)]));
  const wiresOf = adjacency(wires);
  const levels = new Map<string, number>();
  const flows = new Map<string, WireFlow>();
  const queue: string[] = [];

  for (const [id, role] of roles) {
    if (role === 'source') {
      levels.set(id, 1);
      queue.push(id);
    }
  }

  for (let head = 0; head < queue.length; head++) {
    const id = queue[head];
    const role = roles.get(id) as PowerRole;
    const out = outgoingLevel(role, levels.get(id) ?? 0, settings.get(id) ?? DEFAULT_SWITCH_SETTING);
    if (out <= MIN_LEVEL) continue;

    for (const wire of wiresOf.get(id) ?? []) {
      const neighbour = wire.a === id ? wire.b : wire.a;
      if (!roles.has(neighbour) || neighbour === id) continue;
      if ((levels.get(neighbour) ?? 0) + MIN_LEVEL < out) {
        levels.set(neighbour, out);
        flows.set(wire.id, { from: id, to: neighbour });
        queue.push(neighbour);
      } else if (!flows.has(wire.id)) {
        flows.set(wire.id, { from: id, to: neighbour });
      }
    }
  }

  return { levels, flows };
}
