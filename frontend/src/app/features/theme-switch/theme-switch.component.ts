import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { ThemeService } from '../../core/theme/theme.service';
import { ThemeMode } from '../../core/theme/theme.util';

interface ThemeOption {
  readonly mode: ThemeMode;
  readonly label: string;
  readonly hint: string;
}

const OPTIONS: readonly ThemeOption[] = [
  { mode: 'light', label: 'Light', hint: 'Always use the light theme' },
  { mode: 'dark', label: 'Dark', hint: 'Always use the dark theme' },
  { mode: 'system', label: 'System', hint: 'Follow this device’s light or dark setting' },
];

@Component({
  selector: 'cp-theme-switch',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="join" role="group" aria-label="Colour theme">
      @for (option of options; track option.mode) {
        <div class="tooltip tooltip-bottom join-item" [attr.data-tip]="option.label + ': ' + option.hint">
          <button
            type="button"
            class="btn btn-sm btn-square join-item"
            [class.btn-primary]="theme.mode() === option.mode"
            [class.btn-ghost]="theme.mode() !== option.mode"
            [attr.aria-pressed]="theme.mode() === option.mode"
            [attr.aria-label]="option.label + ' theme. ' + option.hint"
            (click)="theme.setMode(option.mode)"
          >
            @switch (option.mode) {
              @case ('light') {
                <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></svg>
              }
              @case ('dark') {
                <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8Z"/></svg>
              }
              @default {
                <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><rect x="3" y="4" width="18" height="12" rx="2"/><path d="M8 20h8M12 16v4"/></svg>
              }
            }
          </button>
        </div>
      }
    </div>
  `,
})
export class ThemeSwitchComponent {
  readonly theme = inject(ThemeService);
  readonly options = OPTIONS;
}
