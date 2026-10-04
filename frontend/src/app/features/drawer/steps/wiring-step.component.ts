import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { EditorStore } from '../../../core/state/editor.store';
import { SimulationService } from '../../../core/simulation/simulation.service';
import { ProjectStore } from '../../../core/state/project-store.service';
import { WireOptionsComponent } from '../../tool-panel/wire-options.component';

@Component({
  selector: 'cp-wiring-step',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, WireOptionsComponent],
  template: `
    <div class="space-y-3">
      <cp-wire-options />
      <button type="button" class="btn btn-sm w-full pointer-coarse:h-11" [class.btn-primary]="editor.tool() === 'wire'" (click)="editor.setTool('wire')">
        Connect devices with wires
      </button>
      <p class="text-[11.5px] leading-relaxed text-base-content/70">
        Tap one device, then the next. Power flows from the panel; a light glows only when power reaches it through its switch.
      </p>
      <button
        type="button"
        class="btn btn-sm w-full pointer-coarse:h-11"
        [class.btn-primary]="sim.enabled()"
        [attr.aria-pressed]="sim.enabled()"
        (click)="sim.toggle()"
      >{{ sim.enabled() ? 'Stop power simulation' : 'Simulate power' }}</button>
      <div class="rounded-box border border-base-content/10 bg-base-200 p-2.5 text-sm">
        {{ store.wires().length }} wires · {{ store.circuitCount() }} circuits · {{ store.wireLengthMeters() | number: '1.1-1' }} m of cable
      </div>
    </div>
  `,
})
export class WiringStepComponent {
  readonly store = inject(ProjectStore);
  readonly sim = inject(SimulationService);
  readonly editor = inject(EditorStore);
}
