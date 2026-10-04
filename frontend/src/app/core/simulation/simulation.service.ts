import { Injectable, computed, inject, signal } from '@angular/core';
import { typeById } from '../data/component-types.data';
import type { PowerRole } from '../models';
import { ProjectStore } from '../state/project-store.service';
import {
  DEFAULT_SWITCH_SETTING,
  EMPTY_POWER_STATE,
  solvePower,
  type PowerState,
  type SwitchSetting,
  type SwitchSettings,
  type WireFlow,
} from './power-solver';

export interface SwitchControl {
  readonly id: string;
  readonly label: string;
  readonly dimmable: boolean;
  readonly setting: SwitchSetting;
}

const CONTROL_ROLES: readonly PowerRole[] = ['switch', 'dimmer'];

@Injectable({ providedIn: 'root' })
export class SimulationService {
  private readonly store = inject(ProjectStore);
  private readonly settings = signal<SwitchSettings>(new Map());

  readonly enabled = signal(false);
  readonly daylight = signal(false);

  readonly state = computed<PowerState>(() =>
    this.enabled()
      ? solvePower(this.store.components(), this.store.wires(), this.settings(), (c) => typeById(c.type).power)
      : EMPTY_POWER_STATE,
  );

  readonly controls = computed<SwitchControl[]>(() =>
    this.store
      .components()
      .filter((c) => CONTROL_ROLES.includes(typeById(c.type).power))
      .map((c) => ({
        id: c.id,
        label: c.label,
        dimmable: typeById(c.type).power === 'dimmer',
        setting: this.settingOf(c.id),
      })),
  );

  toggle(): void {
    this.enabled.update((v) => !v);
  }

  toggleDaylight(): void {
    this.daylight.update((v) => !v);
  }

  levelOf(componentId: string): number {
    return this.state().levels.get(componentId) ?? 0;
  }

  flowOf(wireId: string): WireFlow | undefined {
    return this.state().flows.get(wireId);
  }

  isControl(componentId: string): boolean {
    return this.controls().some((c) => c.id === componentId);
  }

  toggleSwitch(componentId: string): void {
    const current = this.settingOf(componentId);
    this.update(componentId, { ...current, on: !current.on });
  }

  setDimmerLevel(componentId: string, level: number): void {
    this.update(componentId, { ...this.settingOf(componentId), level: Math.min(1, Math.max(0, level)) });
  }

  private settingOf(componentId: string): SwitchSetting {
    return this.settings().get(componentId) ?? DEFAULT_SWITCH_SETTING;
  }

  private update(componentId: string, setting: SwitchSetting): void {
    this.settings.update((all) => new Map(all).set(componentId, setting));
  }
}
