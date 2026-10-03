import { CommonModule } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { ComplianceService } from '../../core/services/compliance.service';
import { PropertiesTabComponent } from './properties-tab.component';
import { ProjectTabComponent } from './project-tab.component';
import { BomTabComponent } from './bom-tab.component';
import { ChecksTabComponent } from './checks-tab.component';

type InspectorTab = 'props' | 'project' | 'bom' | 'checks';

@Component({
  selector: 'cp-inspector',
  standalone: true,
  imports: [CommonModule, PropertiesTabComponent, ProjectTabComponent, BomTabComponent, ChecksTabComponent],
  templateUrl: './inspector.component.html',
})
export class InspectorComponent {
  readonly compliance = inject(ComplianceService);
  readonly tab = signal<InspectorTab>('props');

  setTab(t: InspectorTab): void {
    this.tab.set(t);
  }
}
