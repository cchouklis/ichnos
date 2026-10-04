import { ChangeDetectionStrategy, Component, computed, inject, input, output } from '@angular/core';
import { GuideProgressService } from '../../core/state/guide-progress.service';
import { LayoutStore } from '../../core/state/layout.store';
import { ProjectStore } from '../../core/state/project-store.service';
import { PropertiesTabComponent } from '../inspector/properties-tab.component';
import { StepBodyComponent } from './step-body.component';

/** Tablet and phone guide: one step at a time, with the step's real inputs. */
@Component({
  selector: 'cp-guide-panel',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [StepBodyComponent, PropertiesTabComponent],
  host: { class: 'flex h-full min-h-0 flex-1 flex-col' },
  template: `
    @if (closable()) {
      <header class="flex items-center justify-between gap-2 border-b border-base-content/10 px-3 py-2">
        <div class="min-w-0">
          <h2 class="font-display text-sm font-bold">Project guide</h2>
          <p class="text-[11px] text-base-content/70">{{ progress.completedCount() }} of {{ progress.steps.length }} steps complete</p>
        </div>
        <button type="button" class="btn btn-ghost btn-square btn-sm pointer-coarse:size-11" aria-label="Close project guide" (click)="dismissed.emit()">
          <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M18 6 6 18M6 6l12 12"/></svg>
        </button>
      </header>
    }

    @if (tabs()) {
      <div role="tablist" aria-label="Guide steps" class="flex shrink-0 gap-1 overflow-x-auto border-b border-base-content/10 px-2 py-2">
        @for (step of progress.steps; track step.id; let i = $index) {
          <button
            type="button"
            role="tab"
            class="flex min-h-12 min-w-16 shrink-0 flex-col items-center justify-center gap-0.5 rounded-box px-2 text-[10.5px] font-semibold transition-colors"
            [class]="layout.activeStep() === step.id ? 'bg-primary/15 text-primary' : 'text-base-content/70'"
            [attr.aria-selected]="layout.activeStep() === step.id"
            [attr.aria-label]="step.title + ', ' + progress.statusLabel(step.id)"
            (click)="layout.setStep(step.id)"
          >
            <span class="flex size-6 items-center justify-center rounded-full text-[11px] font-bold" [class]="progress.markerClass(step.id)">{{ i + 1 }}</span>
            <span>{{ step.title }}</span>
          </button>
        }
      </div>
    }

    <div class="min-h-0 flex-1 overflow-y-auto overflow-x-hidden overscroll-contain px-3 py-3">
      @if (store.selectedComponent(); as selected) {
        <section class="mb-4 rounded-box border border-base-content/10 bg-base-200/60 p-3" aria-label="Selected component">
          <h3 class="mb-2 text-[10.5px] font-semibold uppercase tracking-wide text-base-content/70">Selected: {{ selected.label }}</h3>
          <cp-properties-tab />
        </section>
      }
      <h3 class="font-display text-base font-bold">{{ active().title }}</h3>
      <p class="mb-3 text-[12px] text-base-content/70">{{ active().summary }}</p>
      <cp-step-body [step]="active().id" />
    </div>

    <footer class="flex shrink-0 items-center justify-between gap-2 border-t border-base-content/10 px-3 py-2">
      @if (progress.activeIndex() > 0) {
        <button type="button" class="btn btn-ghost btn-sm pointer-coarse:h-11" (click)="progress.go(-1)">Back</button>
      } @else {
        <span></span>
      }
      @if (progress.activeIndex() < progress.steps.length - 1) {
        <button type="button" class="btn btn-primary btn-sm pointer-coarse:h-11" (click)="progress.go(1)">Next: {{ next().title }}</button>
      }
    </footer>
  `,
})
export class GuidePanelComponent {
  protected readonly layout = inject(LayoutStore);
  protected readonly store = inject(ProjectStore);
  protected readonly progress = inject(GuideProgressService);

  readonly tabs = input(false);
  readonly closable = input(false);
  readonly dismissed = output<void>();

  protected readonly active = computed(() => this.progress.steps[Math.max(0, this.progress.activeIndex())]);
  protected readonly next = computed(() => this.progress.steps[this.progress.activeIndex() + 1]);
}
