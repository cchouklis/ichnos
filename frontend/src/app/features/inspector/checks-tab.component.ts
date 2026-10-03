import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { ComplianceIssue } from '../../core/models';
import { ComplianceService } from '../../core/services/compliance.service';
import { EditorStore } from '../../core/state/editor.store';

@Component({
  selector: 'cp-checks-tab',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule],
  template: `
    @if (compliance.issues().length === 0) {
      <div class="flex flex-col items-center text-center text-base-content/70 py-9 px-4 gap-2">
        <svg viewBox="0 0 24 24" width="40" height="40" fill="none" stroke="currentColor" class="text-success" stroke-width="1.6"><path d="m5 13 4 4L19 7"/></svg>
        <p class="text-sm">No issues found.<br />Outlet spacing and circuit loads look reasonable.</p>
      </div>
    } @else {
      <div class="rounded-box border border-dashed border-base-content/20 bg-base-200 p-2.5 text-[11px] text-base-content/70 mb-2.5">
        Simplified heuristics for a quick sanity check — not a substitute for a local code review.
      </div>
      <div class="space-y-1.5">
        @for (issue of compliance.issues(); track $index) {
          <button
            type="button"
            class="flex w-full items-start gap-2 rounded-box border bg-base-200 p-2.5 text-left text-[11.5px] leading-snug transition-colors hover:border-base-content/30"
            [class]="issue.severity === 'error' ? 'border-error' : 'border-base-content/10'"
            (click)="focus(issue)"
          >
            <svg
              viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2"
              class="mt-0.5 shrink-0"
              [class.text-error]="issue.severity === 'error'"
              [class.text-primary]="issue.severity !== 'error'"
            ><path d="M12 9v4M12 17h.01M10.3 3.9 1.8 18a1.6 1.6 0 0 0 1.4 2.4h17.6a1.6 1.6 0 0 0 1.4-2.4L13.7 3.9a1.6 1.6 0 0 0-2.8 0Z"/></svg>
            <span>{{ issue.message }}</span>
          </button>
        }
      </div>
    }
  `,
})
export class ChecksTabComponent {
  readonly compliance = inject(ComplianceService);
  private readonly editor = inject(EditorStore);

  focus(issue: ComplianceIssue): void {
    const id = String(issue.focus.id);
    this.editor.setTool('select');
    if (issue.focus.type === 'component' || issue.focus.type === 'wall') {
      this.editor.selectOne(issue.focus.type, id);
    } else {
      this.editor.clearSelection();
    }
  }
}
