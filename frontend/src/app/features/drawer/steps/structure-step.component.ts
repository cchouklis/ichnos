import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { ProjectStore } from '../../../core/state/project-store.service';

@Component({
  selector: 'cp-structure-step',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule],
  template: `
    <div class="space-y-3">
      <div class="grid grid-cols-2 gap-2">
        <button type="button" class="btn btn-sm" [class.btn-primary]="store.tool() === 'wall'" (click)="store.setTool('wall')">Draw walls</button>
        <button type="button" class="btn btn-sm" [class.btn-primary]="store.tool() === 'room'" (click)="store.setTool('room')">Quick room</button>
      </div>
      <ul class="list-disc space-y-1 pl-4 text-[11.5px] leading-relaxed text-base-content/70">
        <li>Click on the plan to add wall points.</li>
        <li>Double-click or press Enter to finish a wall chain.</li>
        <li>Close the loop on its start point to create a room.</li>
        <li>Press Escape to cancel what you are drawing.</li>
      </ul>
      <div class="rounded-box border border-base-content/10 bg-base-200 p-2.5 text-sm">
        {{ store.walls().length }} walls · {{ store.wallLengthMeters() | number: '1.1-1' }} m of wall
      </div>
    </div>
  `,
})
export class StructureStepComponent {
  readonly store = inject(ProjectStore);
}
