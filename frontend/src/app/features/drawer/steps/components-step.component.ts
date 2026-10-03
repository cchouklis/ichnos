import { ChangeDetectionStrategy, Component } from '@angular/core';
import { PaletteComponent } from '../../palette/palette.component';

@Component({
  selector: 'cp-components-step',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [PaletteComponent],
  template: `<cp-palette />`,
})
export class ComponentsStepComponent {}
