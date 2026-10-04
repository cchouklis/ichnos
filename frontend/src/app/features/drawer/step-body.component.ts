import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { DrawerStepId } from '../../core/util/drawer-steps.util';
import { ComponentsStepComponent } from './steps/components-step.component';
import { ProjectStepComponent } from './steps/project-step.component';
import { ReviewStepComponent } from './steps/review-step.component';
import { RoomsStepComponent } from './steps/rooms-step.component';
import { StructureStepComponent } from './steps/structure-step.component';
import { WiringStepComponent } from './steps/wiring-step.component';

/** The content of one guide step. Every surface that shows the guide renders steps through this. */
@Component({
  selector: 'cp-step-body',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ProjectStepComponent, RoomsStepComponent, StructureStepComponent, ComponentsStepComponent, WiringStepComponent, ReviewStepComponent],
  template: `
    @switch (step()) {
      @case ('project') { <cp-project-step /> }
      @case ('rooms') { <cp-rooms-step /> }
      @case ('structure') { <cp-structure-step /> }
      @case ('components') { <cp-components-step /> }
      @case ('wiring') { <cp-wiring-step /> }
      @case ('review') { <cp-review-step /> }
    }
  `,
})
export class StepBodyComponent {
  readonly step = input.required<DrawerStepId>();
}
