import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ProjectStore } from '../../core/state/project-store.service';
import { SimulationService } from '../../core/simulation/simulation.service';
import { LayoutStore } from '../../core/state/layout.store';
import { ExportService } from '../../core/services/export.service';
import { ComplianceService } from '../../core/services/compliance.service';
import { ThemeSwitchComponent } from '../theme-switch/theme-switch.component';

@Component({
  selector: 'cp-topbar',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, FormsModule, ThemeSwitchComponent],
  templateUrl: './topbar.component.html',
})
export class TopbarComponent {
  readonly store = inject(ProjectStore);
  readonly layout = inject(LayoutStore);
  readonly sim = inject(SimulationService);
  readonly exportSvc = inject(ExportService);
  readonly compliance = inject(ComplianceService);

  toggleView(): void {
    this.store.setView(this.store.view() === '2d' ? '3d' : '2d');
  }
}
