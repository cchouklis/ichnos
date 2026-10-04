import { Injectable, computed, inject } from '@angular/core';
import { DRAWER_STEPS } from '../data/drawer-steps.data';
import { ComplianceService } from '../services/compliance.service';
import { DrawerStepId, StepStatus, computeStepStatuses } from '../util/drawer-steps.util';
import { LayoutStore } from './layout.store';
import { ProjectStore } from './project-store.service';

const STATUS_LABEL: Record<StepStatus, string> = {
  todo: 'not started',
  done: 'complete',
  attention: 'needs attention',
};

/** Progress through the guided steps, shared by every surface that shows the guide. */
@Injectable({ providedIn: 'root' })
export class GuideProgressService {
  private readonly store = inject(ProjectStore);
  private readonly layout = inject(LayoutStore);
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
  readonly issueCount = computed(() => this.compliance.issues().length);

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
