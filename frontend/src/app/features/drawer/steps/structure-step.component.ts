import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { EditorStore } from '../../../core/state/editor.store';
import { ProjectStore } from '../../../core/state/project-store.service';
import { WallOptionsComponent } from '../../tool-panel/wall-options.component';

@Component({
  selector: 'cp-structure-step',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, WallOptionsComponent],
  template: `
    <div class="space-y-3">
      <cp-wall-options />
      <div class="grid grid-cols-2 gap-2">
        <button type="button" class="btn btn-sm pointer-coarse:h-11" [class.btn-primary]="editor.tool() === 'wall'" (click)="editor.setTool('wall')">Draw walls</button>
        <button type="button" class="btn btn-sm pointer-coarse:h-11" [class.btn-primary]="editor.tool() === 'room'" (click)="editor.setTool('room')">Quick room</button>
      </div>
      <p class="text-[11.5px] leading-relaxed text-base-content/70">
        Walls: add points, then finish the chain. Quick room: drag a rectangle for four walls and a room.
      </p>
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
