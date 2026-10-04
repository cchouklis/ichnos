import { DOCUMENT } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ProjectStore } from '../../core/state/project-store.service';
import { SimulationService } from '../../core/simulation/simulation.service';
import { EditorStore } from '../../core/state/editor.store';
import { LayoutStore } from '../../core/state/layout.store';
import { ExportService } from '../../core/services/export.service';
import { ComplianceService } from '../../core/services/compliance.service';
import { ThemeSwitchComponent } from '../theme-switch/theme-switch.component';

@Component({
  selector: 'cp-topbar',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule, ThemeSwitchComponent],
  templateUrl: './topbar.component.html',
})
export class TopbarComponent {
  readonly store = inject(ProjectStore);
  readonly layout = inject(LayoutStore);
  readonly editor = inject(EditorStore);
  readonly sim = inject(SimulationService);
  readonly exportSvc = inject(ExportService);
  readonly compliance = inject(ComplianceService);
  private readonly doc = inject(DOCUMENT);

  exportJson(): void {
    this.exportSvc.exportJson();
    this.closeMenu();
  }

  exportMaterials(): void {
    this.exportSvc.exportMaterialsCsv();
    this.closeMenu();
  }

  /** The dropdown is focus-driven, so blurring closes it. */
  private closeMenu(): void {
    (this.doc.activeElement as HTMLElement | null)?.blur();
  }
}
