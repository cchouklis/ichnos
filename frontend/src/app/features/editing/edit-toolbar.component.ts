import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { EDIT_TOOLS, type EditTool } from '../../core/data/edit-tools.data';
import { EditorStore, type InteractionMode } from '../../core/state/editor.store';
import { LayoutStore } from '../../core/state/layout.store';
import { ProjectStore } from '../../core/state/project-store.service';
import { ToolButtonComponent } from '../ui/tool-button.component';

const MODES: readonly { id: InteractionMode; label: string }[] = [
  { id: 'draw', label: 'Draw' },
  { id: 'erase', label: 'Erase' },
];

/**
 * The one tool bar on desktop and tablet. Desktop always edits; on a tablet it starts as a single Edit
 * button and opens into the tools, the touch Draw/Erase switch and Done.
 */
@Component({
  selector: 'cp-edit-toolbar',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ToolButtonComponent],
  host: { class: 'pointer-events-none absolute left-2 top-2 z-10 max-w-[calc(100%-1rem)]' },
  template: `
    <div class="pointer-events-auto flex flex-wrap items-center gap-1 rounded-box border border-base-content/10 bg-base-100/95 p-1 shadow-lg backdrop-blur" role="toolbar" aria-label="Editing tools">
      @if (!editor.canEdit()) {
        <button type="button" class="btn btn-primary h-11 gap-2 px-4" (click)="editor.startEditing()">
          <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z"/></svg>
          Edit
        </button>
      } @else {
        @for (tool of tools; track tool.id) {
          <cp-tool-button
            [label]="tool.label"
            [description]="tool.description"
            [shortcut]="tool.shortcut"
            side="bottom"
            [toggle]="true"
            [active]="editor.tool() === tool.id"
            (pressed)="choose(tool)"
          >
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path [attr.d]="tool.iconPath" /></svg>
          </cp-tool-button>
        }

        @if (!isDesktop()) {
          <span class="mx-0.5 h-6 w-px bg-base-content/15" aria-hidden="true"></span>
          @if (editor.tool() !== 'select') {
            <div class="join" role="group" aria-label="What a tap does">
              @for (m of modes; track m.id) {
                <button
                  type="button"
                  class="btn join-item h-11 min-w-16"
                  [class]="editor.mode() === m.id ? 'btn-primary' : 'btn-ghost'"
                  [attr.aria-pressed]="editor.mode() === m.id"
                  (click)="editor.setMode(m.id)"
                >{{ m.label }}</button>
              }
            </div>
          } @else if (editor.selection().length > 0) {
            <button type="button" class="btn btn-ghost h-11 gap-1.5 text-error" (click)="project.deleteSelection()">
              <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3"/></svg>
              Delete {{ editor.selection().length }}
            </button>
          }
          <button type="button" class="btn btn-neutral h-11 px-4" (click)="editor.stopEditing()">Done</button>
        }
      }
    </div>
  `,
})
export class EditToolbarComponent {
  protected readonly editor = inject(EditorStore);
  protected readonly project = inject(ProjectStore);
  private readonly layout = inject(LayoutStore);

  protected readonly tools = EDIT_TOOLS;
  protected readonly modes = MODES;

  protected isDesktop(): boolean {
    return this.layout.viewport() === 'desktop';
  }

  protected choose(tool: EditTool): void {
    if (tool.id === 'component') this.editor.chooseComponentTool();
    else this.editor.setTool(tool.id);
  }
}
