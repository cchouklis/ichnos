import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { EditorStore } from '../../core/state/editor.store';
import { DrawerStepId } from '../../core/util/drawer-steps.util';
import { ComponentsStepComponent } from './steps/components-step.component';
import { ProjectStepComponent } from './steps/project-step.component';
import { ReviewStepComponent } from './steps/review-step.component';
import { RoomsStepComponent } from './steps/rooms-step.component';
import { StructureStepComponent } from './steps/structure-step.component';
import { WiringStepComponent } from './steps/wiring-step.component';

const EDITING_STEPS: readonly DrawerStepId[] = ['structure', 'components', 'wiring'];

/** The content of one guide step. Every surface that shows the guide renders steps through this. */
@Component({
  selector: 'cp-step-body',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ProjectStepComponent, RoomsStepComponent, StructureStepComponent, ComponentsStepComponent, WiringStepComponent, ReviewStepComponent],
  template: `
    @if (locked()) {
      <div class="space-y-2 rounded-box border border-base-content/10 bg-base-200 p-3 text-sm" role="status">
        <p>The 3D view is read-only. Switch to the 2D plan to change walls, components or wires.</p>
        <button type="button" class="btn btn-primary btn-sm pointer-coarse:h-11" (click)="editor.setView('2d')">Open 2D plan</button>
      </div>
    } @else {
    @switch (step()) {
      @case ('project') { <cp-project-step /> }
      @case ('rooms') { <cp-rooms-step /> }
      @case ('structure') { <cp-structure-step /> }
      @case ('components') { <cp-components-step /> }
      @case ('wiring') { <cp-wiring-step /> }
      @case ('review') { <cp-review-step /> }
    }
    }
  `,
})
export class StepBodyComponent {
  protected readonly editor = inject(EditorStore);
  readonly step = input.required<DrawerStepId>();
  protected readonly locked = computed(() => !this.editor.planEditable() && EDITING_STEPS.includes(this.step()));
}
