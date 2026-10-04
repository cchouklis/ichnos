import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { EDIT_TOOLS, type EditTool } from '../../core/data/edit-tools.data';
import { STEP_FOR_TOOL } from '../../core/data/step-tools.data';
import { EditorStore, type InteractionMode } from '../../core/state/editor.store';
import { GuideProgressService } from '../../core/state/guide-progress.service';
import { LayoutStore } from '../../core/state/layout.store';
import { ProjectStore } from '../../core/state/project-store.service';
import type { DrawerStepId } from '../../core/util/drawer-steps.util';

const MODES: readonly { id: InteractionMode; label: string }[] = [
  { id: 'draw', label: 'Draw' },
  { id: 'erase', label: 'Erase' },
];

const STEP_FOR_KIND: Record<string, DrawerStepId> = { wall: 'structure', component: 'components', wire: 'wiring' };

/**
 * Phone bottom bar. Reviewing: View, Steps, Edit, Menu. Editing: the tools replace the navigation, with
 * Done to go back. Thumb-reachable, 48 px targets, safe-area aware.
 */
@Component({
  selector: 'cp-bottom-nav',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block shrink-0 border-t border-base-content/10 bg-base-100 pb-[env(safe-area-inset-bottom)]' },
  template: `
    @if (editor.canEdit()) {
      <div class="flex items-center gap-1 px-2 pt-1.5 short:pt-1" role="toolbar" aria-label="Editing actions">
        @if (editor.tool() !== 'select') {
          <div class="join" role="group" aria-label="What a tap does">
            @for (m of modes; track m.id) {
              <button type="button" class="btn join-item btn-sm h-10 px-2.5" [class]="editor.mode() === m.id ? 'btn-primary' : 'btn-ghost'" [attr.aria-pressed]="editor.mode() === m.id" (click)="editor.setMode(m.id)">{{ m.label }}</button>
            }
          </div>
        } @else if (editor.selection().length > 0) {
          <button type="button" class="btn btn-ghost btn-sm h-10 gap-1 text-error" (click)="project.deleteSelection()">
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3"/></svg>
            Delete {{ editor.selection().length }}
          </button>
        }
        <span class="flex-1"></span>
        <button type="button" class="btn btn-ghost btn-square btn-sm size-10" [disabled]="!project.canUndo()" aria-label="Undo" (click)="project.undo()">
          <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M9 14 4 9l5-5"/><path d="M4 9h10a6 6 0 0 1 0 12H8"/></svg>
        </button>
        <button type="button" class="btn btn-ghost btn-square btn-sm size-10" [disabled]="!project.canRedo()" aria-label="Redo" (click)="project.redo()">
          <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="m15 14 5-5-5-5"/><path d="M20 9H10a6 6 0 0 0 0 12h6"/></svg>
        </button>
        @if (optionsStep(); as step) {
          <button type="button" class="btn btn-ghost btn-square btn-sm size-10" aria-label="Options" (click)="layout.openGuide(step)">
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M4 7h10M18 7h2M4 17h2M10 17h10M14 4v6M6 14v6"/></svg>
          </button>
        }
        <button type="button" class="btn btn-neutral btn-sm h-10 px-3" (click)="editor.stopEditing()">Done</button>
      </div>
      <div class="grid grid-cols-5" role="group" aria-label="Editing tools">
        @for (tool of tools; track tool.id) {
          <button type="button" class="flex min-h-14 short:min-h-11 flex-col items-center justify-center gap-0.5 text-[11px] font-medium" [class]="editor.tool() === tool.id ? 'text-primary' : 'text-base-content/70'" [attr.aria-pressed]="editor.tool() === tool.id" (click)="choose(tool)">
            <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path [attr.d]="tool.iconPath" /></svg>
            {{ tool.label }}
          </button>
        }
      </div>
    } @else {
      <nav class="grid grid-cols-4" aria-label="Main">
        <button type="button" class="flex min-h-14 short:min-h-11 flex-col items-center justify-center gap-0.5 text-[11px] font-medium" [class]="viewActive() ? 'text-primary' : 'text-base-content/70'" [attr.aria-current]="viewActive() ? 'page' : null" (click)="showPlan()">
          <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M3 10.5 12 3l9 7.5V21H3zM9 21v-6h6v6"/></svg>
          View
        </button>
        <button type="button" class="relative flex min-h-14 short:min-h-11 flex-col items-center justify-center gap-0.5 text-[11px] font-medium" [class]="layout.guideOpen() ? 'text-primary' : 'text-base-content/70'" [attr.aria-expanded]="layout.guideOpen()" (click)="layout.openGuide()">
          <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M5 13l4 4L19 7"/></svg>
          Steps
          @if (progress.issueCount() > 0) {
            <span class="badge badge-error badge-xs absolute right-5 top-1.5" aria-label="{{ progress.issueCount() }} issues">{{ progress.issueCount() }}</span>
          }
        </button>
        <button type="button" class="flex min-h-14 short:min-h-11 flex-col items-center justify-center gap-0.5 text-[11px] font-medium text-base-content/70 disabled:opacity-40" [disabled]="project.view() !== '2d'" (click)="editor.startEditing()">
          <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z"/></svg>
          Edit
        </button>
        <button type="button" class="flex min-h-14 short:min-h-11 flex-col items-center justify-center gap-0.5 text-[11px] font-medium" [class]="layout.menuOpen() ? 'text-primary' : 'text-base-content/70'" [attr.aria-expanded]="layout.menuOpen()" (click)="layout.openMenu()">
          <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M4 6h16M4 12h16M4 18h16"/></svg>
          Menu
        </button>
      </nav>
    }
  `,
})
export class BottomNavComponent {
  protected readonly editor = inject(EditorStore);
  protected readonly layout = inject(LayoutStore);
  protected readonly project = inject(ProjectStore);
  protected readonly progress = inject(GuideProgressService);

  protected readonly tools = EDIT_TOOLS;
  protected readonly modes = MODES;

  protected readonly viewActive = computed(() => !this.layout.guideOpen() && !this.layout.menuOpen());

  /** The guide step that holds the options for the active tool, or for what is selected. */
  protected readonly optionsStep = computed<DrawerStepId | null>(() => {
    const byTool = STEP_FOR_TOOL[this.editor.tool()];
    if (byTool) return byTool;
    const first = this.editor.selection()[0];
    return first ? (STEP_FOR_KIND[first.kind] ?? null) : null;
  });

  protected showPlan(): void {
    this.layout.closeGuide();
    this.layout.closeMenu();
  }

  protected choose(tool: EditTool): void {
    if (tool.id === 'component') this.editor.chooseComponentTool();
    else this.editor.setTool(tool.id);
  }
}
