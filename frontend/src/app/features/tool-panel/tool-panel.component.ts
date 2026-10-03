import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { typeById } from '../../core/data/component-types.data';
import { EditorStore } from '../../core/state/editor.store';
import { ProjectStore } from '../../core/state/project-store.service';
import {
  MOUNT_HEIGHT_MM,
  WALL_HEIGHT_MM,
  WALL_THICKNESS_MM,
  parseMmInput,
  type MmRange,
} from '../../core/units/units.util';
import { sharedValue } from '../../core/util/selection.util';

/**
 * Contextual options for what the user is about to place or has selected.
 * Edits apply to the defaults for new elements AND to the current selection, as a single undo step.
 */
@Component({
  selector: 'cp-tool-panel',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (visible()) {
      <section
        class="w-full rounded-box border border-base-content/10 bg-base-100/95 shadow-xl backdrop-blur md:w-64"
        aria-label="Tool options"
      >
        <header class="flex items-center justify-between gap-2 px-3 py-2">
          <h2 class="text-xs font-semibold uppercase tracking-wide text-base-content/70">{{ title() }}</h2>
          <button
            type="button"
            class="btn btn-ghost btn-xs btn-square"
            [attr.aria-expanded]="!collapsed()"
            [attr.aria-label]="collapsed() ? 'Expand tool options' : 'Collapse tool options'"
            (click)="collapsed.set(!collapsed())"
          >
            <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.4" aria-hidden="true" [class.rotate-180]="collapsed()"><path d="m6 9 6 6 6-6"/></svg>
          </button>
        </header>

        @if (!collapsed()) {
          <div class="max-h-[40vh] space-y-3 overflow-y-auto px-3 pb-3">
            @if (showWalls()) {
              <fieldset class="space-y-2">
                <legend class="mb-1 text-[11px] font-semibold">Walls</legend>
                <label class="flex flex-col gap-1">
                  <span class="text-[11px] text-base-content/70">Thickness (mm)</span>
                  <input
                    type="number" class="input input-sm w-full"
                    [min]="thickness.min" [max]="thickness.max" [step]="thickness.step"
                    [value]="wallThickness() ?? ''" [placeholder]="wallThickness() === null ? 'Mixed' : ''"
                    (change)="setWallThickness($any($event.target).value)"
                  />
                </label>
                <label class="flex flex-col gap-1">
                  <span class="text-[11px] text-base-content/70">Height (mm)</span>
                  <input
                    type="number" class="input input-sm w-full"
                    [min]="height.min" [max]="height.max" [step]="height.step"
                    [value]="wallHeight() ?? ''" [placeholder]="wallHeight() === null ? 'Mixed' : ''"
                    (change)="setWallHeight($any($event.target).value)"
                  />
                </label>
                @if (selectedWallCount() > 0) {
                  <p class="text-[11px] text-base-content/70">Also applied to {{ selectedWallCount() }} selected wall(s).</p>
                }
              </fieldset>
            }

            @if (showComponents()) {
              <fieldset class="space-y-2">
                <legend class="mb-1 text-[11px] font-semibold">{{ componentLegend() }}</legend>
                <label class="flex flex-col gap-1">
                  <span class="text-[11px] text-base-content/70">Circuit</span>
                  <input
                    type="number" min="1" max="99" step="1" class="input input-sm w-full"
                    [value]="componentCircuit() ?? ''" [placeholder]="selectedComponentCount() ? 'Mixed' : 'Auto (last used)'"
                    (change)="setCircuit($any($event.target).value)"
                  />
                </label>
                <label class="flex flex-col gap-1">
                  <span class="text-[11px] text-base-content/70">Mount height (mm)</span>
                  <input
                    type="number" class="input input-sm w-full"
                    [min]="mount.min" [max]="mount.max" [step]="mount.step"
                    [value]="componentMount() ?? ''" [placeholder]="mountPlaceholder()"
                    (change)="setMount($any($event.target).value)"
                  />
                </label>
                @if (editor.tool() === 'component') {
                  <label class="flex flex-col gap-1">
                    <span class="text-[11px] text-base-content/70">Rotation (°) when not on a wall</span>
                    <input
                      type="number" min="-180" max="360" step="15" class="input input-sm w-full"
                      [value]="editor.placeRotDeg()"
                      (change)="setRotation($any($event.target).value)"
                    />
                  </label>
                }
                @if (selectedComponentCount() > 0) {
                  <p class="text-[11px] text-base-content/70">Also applied to {{ selectedComponentCount() }} selected component(s).</p>
                }
              </fieldset>
            }

            @if (showWires()) {
              <fieldset class="space-y-2">
                <legend class="mb-1 text-[11px] font-semibold">Wires</legend>
                <label class="flex flex-col gap-1">
                  <span class="text-[11px] text-base-content/70">Circuit</span>
                  <input
                    type="number" min="1" max="99" step="1" class="input input-sm w-full"
                    [value]="wireCircuit() ?? ''"
                    [placeholder]="wireCircuit() === null ? (selectedWireCount() ? 'Mixed' : 'From first component') : ''"
                    (change)="setWireCircuit($any($event.target).value)"
                  />
                </label>
                @if (selectedWireCount() > 0) {
                  <p class="text-[11px] text-base-content/70">Also applied to {{ selectedWireCount() }} selected wire(s).</p>
                }
              </fieldset>
            }
          </div>
        }
      </section>
    }
  `,
})
export class ToolPanelComponent {
  protected readonly editor = inject(EditorStore);
  private readonly project = inject(ProjectStore);

  protected readonly thickness: MmRange = WALL_THICKNESS_MM;
  protected readonly height: MmRange = WALL_HEIGHT_MM;
  protected readonly mount: MmRange = MOUNT_HEIGHT_MM;

  readonly collapsed = signal(false);

  readonly selectedWallCount = computed(() => this.editor.selectedWallIds().length);
  readonly selectedComponentCount = computed(() => this.editor.selectedComponentIds().length);
  readonly selectedWireCount = computed(() => this.editor.selectedWireIds().length);

  readonly showWalls = computed(() => ['wall', 'room'].includes(this.editor.tool()) || this.selectedWallCount() > 0);
  readonly showComponents = computed(() => this.editor.tool() === 'component' || this.selectedComponentCount() > 0);
  readonly showWires = computed(() => this.editor.tool() === 'wire' || this.selectedWireCount() > 0);
  readonly visible = computed(() => this.showWalls() || this.showComponents() || this.showWires());

  readonly title = computed(() => {
    switch (this.editor.tool()) {
      case 'wall': return 'Wall options';
      case 'room': return 'Room options';
      case 'wire': return 'Wire options';
      case 'component': return 'Component options';
      default: return 'Selection';
    }
  });

  readonly componentLegend = computed(() => {
    const armed = this.editor.armedType();
    return this.editor.tool() === 'component' && armed ? typeById(armed).label : 'Components';
  });

  private readonly selectedWalls = computed(() => {
    const ids = new Set(this.editor.selectedWallIds());
    return this.project.walls().filter((w) => ids.has(w.id));
  });
  private readonly selectedComponents = computed(() => {
    const ids = new Set(this.editor.selectedComponentIds());
    return this.project.components().filter((c) => ids.has(c.id));
  });
  private readonly selectedWires = computed(() => {
    const ids = new Set(this.editor.selectedWireIds());
    return this.project.wires().filter((w) => ids.has(w.id));
  });

  // ---- displayed values: the shared selection value, else the default for new elements ----
  readonly wallThickness = computed(() =>
    this.selectedWalls().length ? sharedValue(this.selectedWalls().map((w) => w.thicknessMm)) : this.editor.wallThicknessMm(),
  );
  readonly wallHeight = computed(() =>
    this.selectedWalls().length ? sharedValue(this.selectedWalls().map((w) => w.heightMm)) : this.editor.wallHeightMm(),
  );
  readonly componentCircuit = computed(() =>
    this.selectedComponents().length ? sharedValue(this.selectedComponents().map((c) => c.circuit)) : this.editor.placeCircuit(),
  );
  readonly componentMount = computed<number | null>(() => {
    const sel = this.selectedComponents();
    if (sel.length) return sharedValue(sel.map((c) => c.mountHeightMm ?? typeById(c.type).mountHeightMm));
    return this.editor.placeMountHeightMm();
  });
  readonly mountPlaceholder = computed(() => {
    if (this.selectedComponents().length) return this.componentMount() === null ? 'Mixed' : '';
    const armed = this.editor.armedType();
    return armed ? `${typeById(armed).mountHeightMm} (type default)` : '';
  });
  readonly wireCircuit = computed(() =>
    this.selectedWires().length ? sharedValue(this.selectedWires().map((w) => w.circuit)) : this.editor.wireCircuit(),
  );

  // ---- edits: defaults + selection in one undo step -------------------------------------------
  setWallThickness(raw: unknown): void {
    const v = parseMmInput(raw, WALL_THICKNESS_MM);
    if (v === null) return;
    this.editor.wallThicknessMm.set(v);
    this.project.updateWalls(this.editor.selectedWallIds(), { thicknessMm: v });
  }

  setWallHeight(raw: unknown): void {
    const v = parseMmInput(raw, WALL_HEIGHT_MM);
    if (v === null) return;
    this.editor.wallHeightMm.set(v);
    this.project.updateWalls(this.editor.selectedWallIds(), { heightMm: v });
  }

  setCircuit(raw: unknown): void {
    const v = this.parseCircuit(raw);
    if (v === null) return;
    this.editor.placeCircuit.set(v);
    this.project.updateComponents(this.editor.selectedComponentIds(), { circuit: v });
  }

  setMount(raw: unknown): void {
    const v = parseMmInput(raw, MOUNT_HEIGHT_MM);
    if (v === null) {
      if (raw === '') this.editor.placeMountHeightMm.set(null);
      return;
    }
    this.editor.placeMountHeightMm.set(v);
    this.project.updateComponents(this.editor.selectedComponentIds(), { mountHeightMm: v });
  }

  setRotation(raw: unknown): void {
    const n = Number(raw);
    if (Number.isFinite(n)) this.editor.placeRotDeg.set(Math.max(-180, Math.min(360, Math.round(n))));
  }

  setWireCircuit(raw: unknown): void {
    const v = this.parseCircuit(raw);
    if (v === null) return;
    this.editor.wireCircuit.set(v);
    this.project.updateWires(this.editor.selectedWireIds(), { circuit: v });
  }

  private parseCircuit(raw: unknown): number | null {
    if (raw === '' || raw === null || raw === undefined) return null;
    const n = Number(raw);
    return Number.isFinite(n) ? Math.max(1, Math.min(99, Math.round(n))) : null;
  }
}
