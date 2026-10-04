import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { SimulationService } from '../../core/simulation/simulation.service';

@Component({
  selector: 'cp-simulation-panel',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (sim.enabled()) {
      <section class="w-60 rounded-box border border-base-content/10 bg-base-100/95 shadow-xl backdrop-blur" aria-label="Power simulation">
        <header class="flex items-center justify-between gap-2 px-3 py-2">
          <h2 class="text-xs font-semibold uppercase tracking-wide text-base-content/70">Power simulation</h2>
          <button
            type="button"
            class="btn btn-ghost btn-xs btn-square"
            [attr.aria-expanded]="!collapsed()"
            [attr.aria-label]="collapsed() ? 'Expand simulation controls' : 'Collapse simulation controls'"
            (click)="collapsed.set(!collapsed())"
          >
            <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.4" aria-hidden="true" [class.rotate-180]="collapsed()"><path d="m6 9 6 6 6-6"/></svg>
          </button>
        </header>

        @if (!collapsed()) {
          <div class="max-h-[40vh] space-y-2.5 overflow-y-auto px-3 pb-3">
            <label class="flex cursor-pointer items-center justify-between gap-2 text-xs">
              <span>Daylight</span>
              <input type="checkbox" class="toggle toggle-sm" [checked]="sim.daylight()" (change)="sim.toggleDaylight()" />
            </label>

            @for (control of sim.controls(); track control.id) {
              <div class="space-y-1">
                <label class="flex cursor-pointer items-center justify-between gap-2 text-xs">
                  <span class="truncate">{{ control.label }}</span>
                  <input type="checkbox" class="toggle toggle-sm toggle-primary" [checked]="control.setting.on" (change)="sim.toggleSwitch(control.id)" />
                </label>
                @if (control.dimmable) {
                  <input
                    type="range" min="0" max="100" step="5" class="range range-xs range-primary w-full"
                    [attr.aria-label]="control.label + ' brightness'"
                    [value]="control.setting.level * 100"
                    [disabled]="!control.setting.on"
                    (input)="sim.setDimmerLevel(control.id, $any($event.target).valueAsNumber / 100)"
                  />
                }
              </div>
            } @empty {
              <p class="text-[11px] text-base-content/70">No switches yet. Add one and wire it between the panel and a light.</p>
            }

            <p class="text-[11px] leading-snug text-base-content/70">You can also click a switch on the plan or in 3D.</p>
          </div>
        }
      </section>
    }
  `,
})
export class SimulationPanelComponent {
  protected readonly sim = inject(SimulationService);
  protected readonly collapsed = signal(false);
}
