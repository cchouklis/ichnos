import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { EditorStore } from '../../../core/state/editor.store';
import { ProjectStore } from '../../../core/state/project-store.service';

@Component({
  selector: 'cp-wiring-step',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule],
  template: `
    <div class="space-y-3">
      <button type="button" class="btn btn-sm w-full" [class.btn-primary]="editor.tool() === 'wire'" (click)="editor.setTool('wire')">
        Wire tool: connect two devices
      </button>
      <ul class="list-disc space-y-1 pl-4 text-[11.5px] leading-relaxed text-base-content/70">
        <li>Click one device, then the next, to connect them. Right-click a wire to delete it.</li>
        <li>Hold Ctrl and drag to select several wires; change their circuit in the panel.</li>
        <li>Wire colours show the circuit.</li>
        <li>Press Escape to cancel a wire you have started.</li>
      </ul>
      <button
        type="button"
        class="btn btn-sm w-full"
        [class.btn-primary]="store.simulate()"
        [attr.aria-pressed]="store.simulate()"
        (click)="store.toggleSimulate()"
      >{{ store.simulate() ? 'Stop power simulation' : 'Simulate power' }}</button>
      <div class="rounded-box border border-base-content/10 bg-base-200 p-2.5 text-sm">
        {{ store.wires().length }} wires · {{ store.circuitCount() }} circuits · {{ store.wireLengthMeters() | number: '1.1-1' }} m of cable
      </div>
    </div>
  `,
})
export class WiringStepComponent {
  readonly store = inject(ProjectStore);
  readonly editor = inject(EditorStore);
}
