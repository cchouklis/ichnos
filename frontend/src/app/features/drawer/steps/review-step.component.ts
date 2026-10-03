import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { ComplianceService } from '../../../core/services/compliance.service';
import { ExportService } from '../../../core/services/export.service';
import { BomTabComponent } from '../../inspector/bom-tab.component';
import { ChecksTabComponent } from '../../inspector/checks-tab.component';

type ReviewTab = 'checks' | 'bom' | 'export';

@Component({
  selector: 'cp-review-step',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [BomTabComponent, ChecksTabComponent],
  template: `
    <div class="space-y-3">
      <div role="tablist" class="tabs tabs-box tabs-sm">
        <button type="button" role="tab" class="tab gap-1" [class.tab-active]="tab() === 'checks'" [attr.aria-selected]="tab() === 'checks'" (click)="tab.set('checks')">
          Checks
          @if (compliance.issues().length > 0) {
            <span class="badge badge-error badge-xs">{{ compliance.issues().length }}</span>
          }
        </button>
        <button type="button" role="tab" class="tab" [class.tab-active]="tab() === 'bom'" [attr.aria-selected]="tab() === 'bom'" (click)="tab.set('bom')">Materials</button>
        <button type="button" role="tab" class="tab" [class.tab-active]="tab() === 'export'" [attr.aria-selected]="tab() === 'export'" (click)="tab.set('export')">Export</button>
      </div>

      @switch (tab()) {
        @case ('checks') { <cp-checks-tab /> }
        @case ('bom') { <cp-bom-tab /> }
        @case ('export') {
          <div class="flex flex-col gap-2">
            <button type="button" class="btn btn-sm btn-primary" (click)="exportSvc.exportJson()">Export project (.json)</button>
            <button type="button" class="btn btn-sm" (click)="exportSvc.exportMaterialsCsv()">Export materials (.csv)</button>
          </div>
        }
      }
    </div>
  `,
})
export class ReviewStepComponent {
  readonly compliance = inject(ComplianceService);
  readonly exportSvc = inject(ExportService);
  readonly tab = signal<ReviewTab>('checks');
}
