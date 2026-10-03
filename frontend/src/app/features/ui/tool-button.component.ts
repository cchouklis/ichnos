import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';

export type TooltipSide = 'top' | 'bottom' | 'left' | 'right';

/**
 * Icon button with a rich hover/focus tooltip: what it does, how to use it and its shortcut.
 * Content (the icon) is projected. Tooltips appear on hover and keyboard focus.
 */
@Component({
  selector: 'cp-tool-button',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'inline-block' },
  template: `
    <div
      class="tooltip"
      [class.tooltip-top]="side() === 'top'"
      [class.tooltip-bottom]="side() === 'bottom'"
      [class.tooltip-left]="side() === 'left'"
      [class.tooltip-right]="side() === 'right'"
    >
      <div class="tooltip-content max-w-60 text-left">
        <div class="flex items-center gap-2 text-xs font-semibold">
          <span>{{ label() }}</span>
          @if (shortcut()) {
            <kbd class="kbd kbd-xs text-base-content">{{ shortcut() }}</kbd>
          }
        </div>
        @if (description()) {
          <div class="mt-0.5 text-[11px] leading-snug opacity-90">{{ description() }}</div>
        }
      </div>
      <button
        type="button"
        class="btn btn-square btn-sm transition-transform duration-150 hover:scale-110 hover:shadow-md focus-visible:scale-110 active:scale-95 disabled:hover:scale-100"
        [class.btn-primary]="active()"
        [class.btn-ghost]="!active()"
        [attr.aria-label]="label()"
        [attr.aria-pressed]="toggle() ? active() : null"
        [disabled]="disabled()"
        (click)="pressed.emit()"
      >
        <ng-content />
      </button>
    </div>
  `,
})
export class ToolButtonComponent {
  readonly label = input.required<string>();
  readonly description = input<string>('');
  readonly shortcut = input<string>('');
  readonly active = input(false);
  /** True for buttons that stay pressed (tools, modes); adds aria-pressed. */
  readonly toggle = input(false);
  readonly disabled = input(false);
  readonly side = input<TooltipSide>('bottom');
  readonly pressed = output<void>();
}
