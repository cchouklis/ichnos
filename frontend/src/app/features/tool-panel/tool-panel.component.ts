import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { EditorStore } from '../../core/state/editor.store';
import { ComponentOptionsComponent } from './component-options.component';
import { WallOptionsComponent } from './wall-options.component';
import { WireOptionsComponent } from './wire-options.component';

const TITLES: Record<string, string> = {
  wall: 'Wall options',
  room: 'Room options',
  wire: 'Wire options',
  component: 'Component options',
};

/** Desktop floating panel with the options of what the user is about to place or has selected. */
@Component({
  selector: 'cp-tool-panel',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [WallOptionsComponent, ComponentOptionsComponent, WireOptionsComponent],
  template: `
    @if (visible()) {
      <section class="w-full rounded-box border border-base-content/10 bg-base-100/95 shadow-xl backdrop-blur" aria-label="Tool options">
        <header class="flex items-center justify-between gap-2 px-3 py-2">
          <h2 class="text-xs font-semibold uppercase tracking-wide text-base-content/70">{{ title() }}</h2>
          <button
            type="button"
            class="btn btn-ghost btn-xs btn-square"
            [attr.aria-expanded]="!collapsed()"
            [attr.aria-label]="collapsed() ? 'Expand tool options' : 'Collapse tool options'"
            (click)="collapsed.set(!collapsed())"
          >
            <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.4" aria-hidden="true" [class.rotate-180]="collapsed()"><path d="m6 9 6 6 6-6"/></svg>
          </button>
        </header>

        @if (!collapsed()) {
          <div class="max-h-[40vh] space-y-3 overflow-y-auto px-3 pb-3">
            @if (showWalls()) { <cp-wall-options /> }
            @if (showComponents()) { <cp-component-options /> }
            @if (showWires()) { <cp-wire-options /> }
          </div>
        }
      </section>
    }
  `,
})
export class ToolPanelComponent {
  private readonly editor = inject(EditorStore);

  protected readonly collapsed = signal(false);

  protected readonly showWalls = computed(() => ['wall', 'room'].includes(this.editor.tool()) || this.editor.selectedWallIds().length > 0);
  protected readonly showComponents = computed(() => this.editor.tool() === 'component' || this.editor.selectedComponentIds().length > 0);
  protected readonly showWires = computed(() => this.editor.tool() === 'wire' || this.editor.selectedWireIds().length > 0);
  protected readonly visible = computed(() => this.showWalls() || this.showComponents() || this.showWires());
  protected readonly title = computed(() => TITLES[this.editor.tool()] ?? 'Selection');
}
