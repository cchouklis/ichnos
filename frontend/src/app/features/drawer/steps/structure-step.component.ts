import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { EditorStore } from '../../../core/state/editor.store';
import { ProjectStore } from '../../../core/state/project-store.service';

@Component({
  selector: 'cp-structure-step',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule],
  template: `
    <div class="space-y-3">
      <div class="grid grid-cols-2 gap-2">
        <button type="button" class="btn btn-sm" [class.btn-primary]="editor.tool() === 'wall'" (click)="editor.setTool('wall')">Draw walls</button>
        <button type="button" class="btn btn-sm" [class.btn-primary]="editor.tool() === 'room'" (click)="editor.setTool('room')">Quick room</button>
      </div>
      <ul class="list-disc space-y-1 pl-4 text-[11.5px] leading-relaxed text-base-content/70">
        <li>Left-click adds wall points; double-click or Enter finishes the chain.</li>
        <li>Right-click deletes a wall (or removes the last point while drawing).</li>
        <li>Hold Ctrl and drag to select several walls; set thickness and height in mm in the panel.</li>
        <li>Close the loop on its start point to create a room. Esc cancels.</li>
      </ul>
      <div class="rounded-box border border-base-content/10 bg-base-200 p-2.5 text-sm">
        {{ store.walls().length }} walls · {{ store.wallLengthMeters() | number: '1.1-1' }} m of wall
      </div>
    </div>
  `,
})
export class StructureStepComponent {
  readonly store = inject(ProjectStore);
  readonly editor = inject(EditorStore);
}
