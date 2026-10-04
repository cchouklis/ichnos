import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { GuideProgressService } from '../../core/state/guide-progress.service';
import { LayoutStore } from '../../core/state/layout.store';
import { ProjectStore } from '../../core/state/project-store.service';
import { PropertiesTabComponent } from '../inspector/properties-tab.component';
import { StepBodyComponent } from './step-body.component';

/** Desktop guide: all six steps as an accordion beside the plan. */
@Component({
  selector: 'cp-drawer',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [PropertiesTabComponent, StepBodyComponent],
  templateUrl: './drawer.component.html',
})
export class DrawerComponent {
  readonly layout = inject(LayoutStore);
  readonly store = inject(ProjectStore);
  readonly progress = inject(GuideProgressService);
}
