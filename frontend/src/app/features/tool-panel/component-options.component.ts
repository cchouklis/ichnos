import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { typeById } from '../../core/data/component-types.data';
import { EditorStore } from '../../core/state/editor.store';
import { ProjectStore } from '../../core/state/project-store.service';
import { MOUNT_HEIGHT_MM, parseMmInput, type MmRange } from '../../core/units/units.util';
import { sharedValue } from '../../core/util/selection.util';
import { parseCircuit } from './circuit.util';

/** Circuit, mount height and rotation: the defaults for new components and the values of the selected ones. */
@Component({
  selector: 'cp-component-options',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <fieldset class="space-y-2">
      <legend class="mb-1 text-[11px] font-semibold">{{ legend() }}</legend>
      <label class="flex flex-col gap-1">
        <span class="text-[11px] text-base-content/70">Circuit</span>
        <input
          type="number" inputmode="numeric" min="1" max="99" step="1" class="input input-sm w-full pointer-coarse:h-11"
          [value]="circuit() ?? ''" [placeholder]="selectedCount() ? 'Mixed' : 'Auto (last used)'"
          (change)="setCircuit($any($event.target).value)"
        />
      </label>
      <label class="flex flex-col gap-1">
        <span class="text-[11px] text-base-content/70">Mount height (mm)</span>
        <input
          type="number" inputmode="numeric" class="input input-sm w-full pointer-coarse:h-11"
          [min]="mount.min" [max]="mount.max" [step]="mount.step"
          [value]="mountHeight() ?? ''" [placeholder]="mountPlaceholder()"
          (change)="setMount($any($event.target).value)"
        />
      </label>
      <label class="flex flex-col gap-1">
        <span class="text-[11px] text-base-content/70">Rotation (°) when not on a wall</span>
        <input
          type="number" inputmode="numeric" min="-180" max="360" step="15" class="input input-sm w-full pointer-coarse:h-11"
          [value]="editor.placeRotDeg()"
          (change)="setRotation($any($event.target).value)"
        />
      </label>
      @if (selectedCount() > 0) {
        <p class="text-[11px] text-base-content/70">Circuit and height also apply to {{ selectedCount() }} selected component(s).</p>
      }
    </fieldset>
  `,
})
export class ComponentOptionsComponent {
  protected readonly editor = inject(EditorStore);
  private readonly project = inject(ProjectStore);

  protected readonly mount: MmRange = MOUNT_HEIGHT_MM;

  protected readonly selectedCount = computed(() => this.editor.selectedComponentIds().length);
  private readonly selected = computed(() => {
    const ids = new Set(this.editor.selectedComponentIds());
    return this.project.components().filter((c) => ids.has(c.id));
  });

  protected readonly legend = computed(() => {
    const armed = this.editor.armedType();
    return this.editor.tool() === 'component' && armed ? typeById(armed).label : 'Components';
  });
  protected readonly circuit = computed(() =>
    this.selected().length ? sharedValue(this.selected().map((c) => c.circuit)) : this.editor.placeCircuit(),
  );
  protected readonly mountHeight = computed<number | null>(() => {
    const sel = this.selected();
    if (sel.length) return sharedValue(sel.map((c) => c.mountHeightMm ?? typeById(c.type).mountHeightMm));
    return this.editor.placeMountHeightMm();
  });
  protected readonly mountPlaceholder = computed(() => {
    if (this.selected().length) return this.mountHeight() === null ? 'Mixed' : '';
    const armed = this.editor.armedType();
    return armed ? `${typeById(armed).mountHeightMm} (type default)` : '';
  });

  protected setCircuit(raw: unknown): void {
    const v = parseCircuit(raw);
    if (v === null) return;
    this.editor.placeCircuit.set(v);
    this.project.updateComponents(this.editor.selectedComponentIds(), { circuit: v });
  }

  protected setMount(raw: unknown): void {
    const v = parseMmInput(raw, MOUNT_HEIGHT_MM);
    if (v === null) {
      if (raw === '') this.editor.placeMountHeightMm.set(null);
      return;
    }
    this.editor.placeMountHeightMm.set(v);
    this.project.updateComponents(this.editor.selectedComponentIds(), { mountHeightMm: v });
  }

  protected setRotation(raw: unknown): void {
    const n = Number(raw);
    if (Number.isFinite(n)) this.editor.placeRotDeg.set(Math.max(-180, Math.min(360, Math.round(n))));
  }
}
