import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { DRAWER_STEPS } from '../../core/data/drawer-steps.data';
import { GuideProgressService } from '../../core/state/guide-progress.service';
import { LayoutStore } from '../../core/state/layout.store';

/** Tablet navigation rail: one labelled button per guide step; tapping opens or closes its docked panel. */
@Component({
  selector: 'cp-drawer-rail',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block shrink-0' },
  template: `
    <nav class="flex h-full w-16 flex-col items-center gap-1 overflow-hidden border-r border-base-content/10 bg-base-100 py-2 short:gap-0.5 short:py-1" aria-label="Project guide">
      @for (step of steps; track step.id) {
        @let selected = layout.guideOpen() && layout.activeStep() === step.id;
        <button
          type="button"
          class="relative flex min-h-14 w-14 short:min-h-9 flex-col items-center justify-center gap-0.5 rounded-box text-[10px] font-semibold transition-colors"
          [class]="selected ? 'bg-primary/15 text-primary' : 'text-base-content/70 hover:bg-base-200'"
          [attr.aria-pressed]="selected"
          [attr.aria-label]="step.title + ', ' + progress.statusLabel(step.id)"
          (click)="layout.toggleStep(step.id)"
        >
          <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path [attr.d]="step.iconPath" /></svg>
          <span class="short:sr-only">{{ shortTitle(step.title) }}</span>
          @if (step.id === 'review' && progress.issueCount() > 0) {
            <span class="badge badge-error badge-xs absolute right-1 top-1" aria-hidden="true">{{ progress.issueCount() }}</span>
          }
        </button>
      }
    </nav>
  `,
})
export class DrawerRailComponent {
  protected readonly layout = inject(LayoutStore);
  protected readonly progress = inject(GuideProgressService);
  protected readonly steps = DRAWER_STEPS;

  protected shortTitle(title: string): string {
    return title.split(' ')[0];
  }
}
