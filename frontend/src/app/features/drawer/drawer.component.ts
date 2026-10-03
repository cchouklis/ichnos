import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { DRAWER_STEPS } from '../../core/data/drawer-steps.data';
import { ComplianceService } from '../../core/services/compliance.service';
import { LayoutStore } from '../../core/state/layout.store';
import { ProjectStore } from '../../core/state/project-store.service';
import { DrawerStepId, StepStatus, computeStepStatuses } from '../../core/util/drawer-steps.util';
import { PropertiesTabComponent } from '../inspector/properties-tab.component';
import { ComponentsStepComponent } from './steps/components-step.component';
import { ProjectStepComponent } from './steps/project-step.component';
import { ReviewStepComponent } from './steps/review-step.component';
import { RoomsStepComponent } from './steps/rooms-step.component';
import { StructureStepComponent } from './steps/structure-step.component';
import { WiringStepComponent } from './steps/wiring-step.component';

const STATUS_LABEL: Record<StepStatus, string> = {
  todo: 'not started',
  done: 'complete',
  attention: 'needs attention',
};

@Component({
  selector: 'cp-drawer',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    PropertiesTabComponent,
    ProjectStepComponent,
    RoomsStepComponent,
    StructureStepComponent,
    ComponentsStepComponent,
    WiringStepComponent,
    ReviewStepComponent,
  ],
  templateUrl: './drawer.component.html',
})
export class DrawerComponent {
  readonly layout = inject(LayoutStore);
  readonly store = inject(ProjectStore);
  private readonly compliance = inject(ComplianceService);

  readonly steps = DRAWER_STEPS;

  readonly statuses = computed(() => {
    const comps = this.store.components();
    const wired = new Set<string>();
    for (const w of this.store.wires()) {
      wired.add(w.a);
      wired.add(w.b);
    }
    const issues = this.compliance.issues();
    return computeStepStatuses({
      projectName: this.store.projectName(),
      roomCount: this.store.rooms().length,
      wallCount: this.store.walls().length,
      componentCount: comps.length,
      wireCount: this.store.wires().length,
      unwiredCount: comps.filter((c) => c.type !== 'panel' && !wired.has(c.id)).length,
      errorCount: issues.filter((i) => i.severity === 'error').length,
      warningCount: issues.filter((i) => i.severity === 'warn').length,
    });
  });

  readonly completedCount = computed(() => Object.values(this.statuses()).filter((s) => s === 'done').length);
  readonly activeIndex = computed(() => this.steps.findIndex((s) => s.id === this.layout.activeStep()));

  statusLabel(id: DrawerStepId): string {
    return STATUS_LABEL[this.statuses()[id]];
  }

  go(delta: number): void {
    const next = this.steps[this.activeIndex() + delta];
    if (next) this.layout.setStep(next.id);
  }

  markerClass(id: DrawerStepId): string {
    const active = this.layout.activeStep() === id ? ' ring-2 ring-primary ring-offset-2 ring-offset-base-100' : '';
    switch (this.statuses()[id]) {
      case 'done':
        return 'bg-success text-success-content' + active;
      case 'attention':
        return 'bg-warning text-warning-content' + active;
      default:
        return 'bg-base-300 text-base-content' + active;
    }
  }
}
