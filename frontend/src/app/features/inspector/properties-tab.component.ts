import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ProjectStore } from '../../core/state/project-store.service';
import { typeById } from '../../core/data/component-types.data';
import { ThemeService } from '../../core/theme/theme.service';

@Component({
  selector: 'cp-properties-tab',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, FormsModule],
  template: `
    @if (store.selectedComponent(); as c) {
      <div class="space-y-3">
        <label class="flex flex-col">
          <span class="text-[10.5px] uppercase tracking-wide text-base-content/70 mb-1">Label</span>
          <input
            type="text"
            class="input input-sm"
            [ngModel]="c.label"
            (ngModelChange)="store.updateComponent(c.id, { label: $event })"
          />
        </label>

        <div class="grid grid-cols-2 gap-3">
          <label class="flex flex-col">
            <span class="text-[10.5px] uppercase tracking-wide text-base-content/70 mb-1">Type</span>
            <div class="flex items-center gap-2 h-8">
              <span class="h-3.5 w-3.5 rounded" [style.background]="theme.tint(typeOf(c.type).color)"></span>
              <span class="text-sm">{{ typeOf(c.type).label }}</span>
            </div>
          </label>
          <label class="flex flex-col">
            <span class="text-[10.5px] uppercase tracking-wide text-base-content/70 mb-1">Circuit #</span>
            <input
              type="number" min="1" class="input input-sm"
              [ngModel]="c.circuit"
              (ngModelChange)="store.updateComponent(c.id, { circuit: +$event || 1 })"
            />
          </label>
        </div>

        <div class="grid grid-cols-2 gap-3">
          <label class="flex flex-col">
            <span class="text-[10.5px] uppercase tracking-wide text-base-content/70 mb-1">Rotation°</span>
            <input
              type="number" step="15" class="input input-sm"
              [ngModel]="c.rot"
              (ngModelChange)="store.updateComponent(c.id, { rot: +$event || 0 })"
            />
          </label>
          <label class="flex flex-col">
            <span class="text-[10.5px] uppercase tracking-wide text-base-content/70 mb-1">Mount ht (m)</span>
            <input
              type="number" step="0.1" class="input input-sm"
              [ngModel]="c.mountHeight ?? typeOf(c.type).height"
              (ngModelChange)="store.updateComponent(c.id, { mountHeight: +$event })"
            />
          </label>
        </div>

        <div>
          <span class="text-[10.5px] uppercase tracking-wide text-base-content/70 mb-1 block">Electrical</span>
          <div class="flex gap-2">
            <span class="badge badge-outline">{{ typeOf(c.type).volts }}V</span>
            <span class="badge badge-outline">{{ typeOf(c.type).amps }}A</span>
          </div>
        </div>

        <label class="flex flex-col">
          <span class="text-[10.5px] uppercase tracking-wide text-base-content/70 mb-1">Notes</span>
          <textarea
            class="textarea textarea-sm min-h-[70px]"
            placeholder="Install notes for the electrician..."
            [ngModel]="c.notes"
            (ngModelChange)="store.updateComponent(c.id, { notes: $event })"
          ></textarea>
        </label>

        <button type="button" class="btn btn-sm btn-ghost text-error gap-2" (click)="store.deleteSelected()">
          <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m3 0-1 14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2L4 6"/></svg>
          Delete component
        </button>
      </div>
    } @else {
      <div class="flex flex-col items-center text-center text-base-content/70 py-9 px-4 gap-2">
        <svg viewBox="0 0 24 24" width="40" height="40" fill="none" stroke="currentColor" stroke-width="1.6"><path d="m4 4 7.07 17 2.51-7.39L21 11.07z"/></svg>
        <p class="text-sm">Select a component on the plan to edit its properties.</p>
      </div>
    }
  `,
})
export class PropertiesTabComponent {
  readonly store = inject(ProjectStore);
  readonly theme = inject(ThemeService);
  readonly typeOf = typeById;
}
