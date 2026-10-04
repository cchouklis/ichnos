import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { EditorStore } from '../../core/state/editor.store';
import { ProjectStore } from '../../core/state/project-store.service';
import { WALL_HEIGHT_MM, WALL_THICKNESS_MM, parseMmInput, type MmRange } from '../../core/units/units.util';
import { sharedValue } from '../../core/util/selection.util';

/** Wall thickness and height in mm: the defaults for new walls and the values of the selected walls. */
@Component({
  selector: 'cp-wall-options',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <fieldset class="space-y-2">
      <legend class="mb-1 text-[11px] font-semibold">Walls</legend>
      <label class="flex flex-col gap-1">
        <span class="text-[11px] text-base-content/70">Thickness (mm)</span>
        <input
          type="number" inputmode="numeric" class="input input-sm w-full pointer-coarse:h-11"
          [min]="thickness.min" [max]="thickness.max" [step]="thickness.step"
          [value]="wallThickness() ?? ''" [placeholder]="wallThickness() === null ? 'Mixed' : ''"
          (change)="setThickness($any($event.target).value)"
        />
      </label>
      <label class="flex flex-col gap-1">
        <span class="text-[11px] text-base-content/70">Height (mm)</span>
        <input
          type="number" inputmode="numeric" class="input input-sm w-full pointer-coarse:h-11"
          [min]="height.min" [max]="height.max" [step]="height.step"
          [value]="wallHeight() ?? ''" [placeholder]="wallHeight() === null ? 'Mixed' : ''"
          (change)="setHeight($any($event.target).value)"
        />
      </label>
      @if (selectedCount() > 0) {
        <p class="text-[11px] text-base-content/70">Also applied to {{ selectedCount() }} selected wall(s).</p>
      }
    </fieldset>
  `,
})
export class WallOptionsComponent {
  private readonly editor = inject(EditorStore);
  private readonly project = inject(ProjectStore);

  protected readonly thickness: MmRange = WALL_THICKNESS_MM;
  protected readonly height: MmRange = WALL_HEIGHT_MM;

  protected readonly selectedCount = computed(() => this.editor.selectedWallIds().length);
  private readonly selected = computed(() => {
    const ids = new Set(this.editor.selectedWallIds());
    return this.project.walls().filter((w) => ids.has(w.id));
  });

  protected readonly wallThickness = computed(() =>
    this.selected().length ? sharedValue(this.selected().map((w) => w.thicknessMm)) : this.editor.wallThicknessMm(),
  );
  protected readonly wallHeight = computed(() =>
    this.selected().length ? sharedValue(this.selected().map((w) => w.heightMm)) : this.editor.wallHeightMm(),
  );

  protected setThickness(raw: unknown): void {
    const v = parseMmInput(raw, WALL_THICKNESS_MM);
    if (v === null) return;
    this.editor.wallThicknessMm.set(v);
    this.project.updateWalls(this.editor.selectedWallIds(), { thicknessMm: v });
  }

  protected setHeight(raw: unknown): void {
    const v = parseMmInput(raw, WALL_HEIGHT_MM);
    if (v === null) return;
    this.editor.wallHeightMm.set(v);
    this.project.updateWalls(this.editor.selectedWallIds(), { heightMm: v });
  }
}
