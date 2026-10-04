import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { EditorStore } from '../../core/state/editor.store';
import { ProjectStore } from '../../core/state/project-store.service';
import { sharedValue } from '../../core/util/selection.util';
import { parseCircuit } from './circuit.util';

/** Wire circuit: the default for new wires and the value of the selected wires. */
@Component({
  selector: 'cp-wire-options',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <fieldset class="space-y-2">
      <legend class="mb-1 text-[11px] font-semibold">Wires</legend>
      <label class="flex flex-col gap-1">
        <span class="text-[11px] text-base-content/70">Circuit</span>
        <input
          type="number" inputmode="numeric" min="1" max="99" step="1" class="input input-sm w-full pointer-coarse:h-11"
          [value]="circuit() ?? ''"
          [placeholder]="circuit() === null ? (selectedCount() ? 'Mixed' : 'From first component') : ''"
          (change)="setCircuit($any($event.target).value)"
        />
      </label>
      @if (selectedCount() > 0) {
        <p class="text-[11px] text-base-content/70">Also applied to {{ selectedCount() }} selected wire(s).</p>
      }
    </fieldset>
  `,
})
export class WireOptionsComponent {
  private readonly editor = inject(EditorStore);
  private readonly project = inject(ProjectStore);

  protected readonly selectedCount = computed(() => this.editor.selectedWireIds().length);
  private readonly selected = computed(() => {
    const ids = new Set(this.editor.selectedWireIds());
    return this.project.wires().filter((w) => ids.has(w.id));
  });
  protected readonly circuit = computed(() =>
    this.selected().length ? sharedValue(this.selected().map((w) => w.circuit)) : this.editor.wireCircuit(),
  );

  protected setCircuit(raw: unknown): void {
    const v = parseCircuit(raw);
    if (v === null) return;
    this.editor.wireCircuit.set(v);
    this.project.updateWires(this.editor.selectedWireIds(), { circuit: v });
  }
}
