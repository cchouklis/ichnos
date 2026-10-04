import { ChangeDetectionStrategy, Component } from '@angular/core';
import { ComponentOptionsComponent } from '../../tool-panel/component-options.component';
import { PaletteComponent } from '../../palette/palette.component';

@Component({
  selector: 'cp-components-step',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ComponentOptionsComponent, PaletteComponent],
  template: `
    <div class="space-y-3">
      <cp-component-options />
      <cp-palette />
    </div>
  `,
})
export class ComponentsStepComponent {}
