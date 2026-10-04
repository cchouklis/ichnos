import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { ExportService } from '../../core/services/export.service';
import { SimulationService } from '../../core/simulation/simulation.service';
import { LayoutStore } from '../../core/state/layout.store';
import { ProjectStore } from '../../core/state/project-store.service';
import { ThemeSwitchComponent } from '../theme-switch/theme-switch.component';

/** The phone menu: every action is visible as a row, no nested menus. */
@Component({
  selector: 'cp-menu-actions',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ThemeSwitchComponent],
  template: `
    <div class="space-y-5 px-4 pb-4 pt-1">
      <section aria-labelledby="menu-view">
        <h3 id="menu-view" class="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-base-content/70">View</h3>
        <div class="join w-full" role="group">
          <button type="button" class="btn join-item h-12 flex-1" [class]="store.view() === '2d' ? 'btn-primary' : 'btn-ghost'" [attr.aria-pressed]="store.view() === '2d'" (click)="setView('2d')">2D plan</button>
          <button type="button" class="btn join-item h-12 flex-1" [class]="store.view() === '3d' ? 'btn-primary' : 'btn-ghost'" [attr.aria-pressed]="store.view() === '3d'" (click)="setView('3d')">3D view</button>
        </div>
      </section>

      <section aria-labelledby="menu-power">
        <h3 id="menu-power" class="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-base-content/70">Power</h3>
        <button type="button" class="btn h-12 w-full" [class.btn-primary]="sim.enabled()" [attr.aria-pressed]="sim.enabled()" (click)="toggleSimulation()">
          {{ sim.enabled() ? 'Stop simulation' : 'Simulate power' }}
        </button>
      </section>

      <section aria-labelledby="menu-theme">
        <h3 id="menu-theme" class="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-base-content/70">Theme</h3>
        <cp-theme-switch [labelled]="true" />
      </section>

      <section aria-labelledby="menu-export">
        <h3 id="menu-export" class="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-base-content/70">Export</h3>
        <div class="flex flex-col gap-2">
          <button type="button" class="btn btn-primary h-12" (click)="exportSvc.exportJson()">Project (.json)</button>
          <button type="button" class="btn h-12" (click)="exportSvc.exportMaterialsCsv()">Materials (.csv)</button>
        </div>
      </section>
    </div>
  `,
})
export class MenuActionsComponent {
  protected readonly store = inject(ProjectStore);
  protected readonly sim = inject(SimulationService);
  protected readonly exportSvc = inject(ExportService);
  private readonly layout = inject(LayoutStore);

  protected setView(view: '2d' | '3d'): void {
    this.store.setView(view);
    this.layout.closeMenu();
  }

  protected toggleSimulation(): void {
    this.sim.toggle();
    this.layout.closeMenu();
  }
}
