import { Injectable, computed, signal } from '@angular/core';
import type { ElementKind, ElementRef, Point, Tool } from '../models';
import { MOUNT_HEIGHT_MM, WALL_HEIGHT_MM, WALL_THICKNESS_MM } from '../units/units.util';
import { refsOfKind } from '../util/selection.util';

/** What a plain tap/click does. Mouse users get this from buttons; touch users switch it explicitly. */
export type InteractionMode = 'draw' | 'erase' | 'select';

export const MIN_ZOOM = 0.25;
export const MAX_ZOOM = 3;

/**
 * Ephemeral editor state: active tool, selection, viewport and "what will be placed next" defaults.
 * None of this is part of the saved document or the undo history.
 */
@Injectable({ providedIn: 'root' })
export class EditorStore {
  // ---- tool & mode -------------------------------------------------------
  readonly tool = signal<Tool>('select');
  readonly mode = signal<InteractionMode>('draw');

  // ---- selection ------------------------------------------------------------
  readonly selection = signal<ElementRef[]>([]);
  readonly selectedWallIds = computed(() => refsOfKind(this.selection(), 'wall').map((r) => r.id));
  readonly selectedComponentIds = computed(() => refsOfKind(this.selection(), 'component').map((r) => r.id));
  readonly selectedWireIds = computed(() => refsOfKind(this.selection(), 'wire').map((r) => r.id));
  /** Set only when exactly one element is selected and it is a component. */
  readonly singleComponentId = computed(() => {
    const s = this.selection();
    return s.length === 1 && s[0].kind === 'component' ? s[0].id : null;
  });

  // ---- viewport -----------------------------------------------------------------
  readonly zoom = signal(1);
  readonly pan = signal<Point>({ x: 80, y: 80 });

  // ---- defaults for newly created elements (editable in the tool panel) ---------------
  readonly wallThicknessMm = signal<number>(WALL_THICKNESS_MM.default);
  readonly wallHeightMm = signal<number>(WALL_HEIGHT_MM.default);
  readonly armedType = signal<string | null>(null);
  /** null = continue on the highest circuit in use. */
  readonly placeCircuit = signal<number | null>(null);
  /** null = use the component type's own default. */
  readonly placeMountHeightMm = signal<number | null>(null);
  readonly placeRotDeg = signal(0);
  /** null = new wires inherit the circuit of their first component. */
  readonly wireCircuit = signal<number | null>(null);

  readonly defaultMountHeightMm = MOUNT_HEIGHT_MM.default;

  setTool(tool: Tool): void {
    this.tool.set(tool);
    if (tool !== 'component') this.armedType.set(null);
  }

  setMode(mode: InteractionMode): void {
    this.mode.set(mode);
  }

  /** Arms a component type for sticky placement and switches to the component tool. */
  armComponent(typeId: string): void {
    this.armedType.set(typeId);
    this.tool.set('component');
  }

  setSelection(refs: readonly ElementRef[]): void {
    this.selection.set([...refs]);
  }

  clearSelection(): void {
    if (this.selection().length) this.selection.set([]);
  }

  selectOne(kind: ElementKind, id: string): void {
    this.selection.set([{ kind, id }]);
  }

  setZoom(z: number): void {
    this.zoom.set(Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, z)));
  }

  setPan(p: Point): void {
    this.pan.set(p);
  }
}
