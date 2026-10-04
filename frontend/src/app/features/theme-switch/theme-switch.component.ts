import { ChangeDetectionStrategy, Component, inject, input } from '@angular/core';
import { ThemeService } from '../../core/theme/theme.service';
import { ThemeMode } from '../../core/theme/theme.util';
import { ToolButtonComponent } from '../ui/tool-button.component';

interface ThemeOption {
  readonly mode: ThemeMode;
  readonly label: string;
  readonly hint: string;
  readonly iconPath: string;
}

const OPTIONS: readonly ThemeOption[] = [
  { mode: 'light', label: 'Light', hint: 'Always use the light theme', iconPath: 'M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8zM12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4' },
  { mode: 'dark', label: 'Dark', hint: 'Always use the dark theme', iconPath: 'M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8Z' },
  { mode: 'system', label: 'System', hint: 'Follow this device’s light or dark setting', iconPath: 'M5 4h14a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2zM8 20h8M12 16v4' },
];

/** Theme choice. Icon buttons with tooltips in the top bar; full-width labelled buttons inside menus. */
@Component({
  selector: 'cp-theme-switch',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ToolButtonComponent],
  template: `
    @if (labelled()) {
      <div class="join w-full" role="group" aria-label="Colour theme">
        @for (option of options; track option.mode) {
          <button
            type="button"
            class="btn join-item h-11 min-w-0 flex-1 gap-1.5 px-2"
            [class]="theme.mode() === option.mode ? 'btn-primary' : 'btn-ghost'"
            [attr.aria-pressed]="theme.mode() === option.mode"
            [attr.aria-label]="option.label + ' theme. ' + option.hint"
            (click)="theme.setMode(option.mode)"
          >
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path [attr.d]="option.iconPath" /></svg>
            <span class="truncate">{{ option.label }}</span>
          </button>
        }
      </div>
    } @else {
      <div class="flex items-center gap-0.5" role="group" aria-label="Colour theme">
        @for (option of options; track option.mode) {
          <cp-tool-button
            [label]="option.label"
            [description]="option.hint"
            side="bottom"
            [toggle]="true"
            [active]="theme.mode() === option.mode"
            (pressed)="theme.setMode(option.mode)"
          >
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path [attr.d]="option.iconPath" /></svg>
          </cp-tool-button>
        }
      </div>
    }
  `,
})
export class ThemeSwitchComponent {
  readonly theme = inject(ThemeService);
  readonly options = OPTIONS;
  readonly labelled = input(false);
}
