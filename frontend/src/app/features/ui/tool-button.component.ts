import { ChangeDetectionStrategy, Component, DestroyRef, ElementRef, computed, effect, inject, input, output, signal, untracked, viewChild } from '@angular/core';
import { DOCUMENT } from '@angular/common';
import { computePopoverPosition, type PopoverSide } from '../../core/util/popover-position.util';

export type TooltipSide = PopoverSide;

const LONG_PRESS_MS = 450;
const PEEK_MS = 3000;

let nextTipId = 0;

/**
 * Icon button with an explanatory tooltip. The tooltip is a popover in the browser's top layer, so it is
 * never clipped by a parent and is kept inside the viewport on every screen size.
 */
@Component({
  selector: 'cp-tool-button',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'inline-block' },
  template: `
    <button
      #trigger
      type="button"
      class="btn btn-square btn-sm transition-transform duration-150 hover:scale-110 hover:shadow-md focus-visible:scale-110 active:scale-95 disabled:hover:scale-100 pointer-coarse:size-11"
      [class.btn-primary]="active()"
      [class.btn-ghost]="!active()"
      [attr.aria-label]="label()"
      [attr.aria-describedby]="tipId"
      [attr.aria-pressed]="toggle() ? active() : null"
      [disabled]="disabled()"
      (pointerenter)="onPointerEnter($event)"
      (pointerleave)="onPointerLeave()"
      (focus)="onFocus($event)"
      (blur)="focused.set(false)"
      (pointerdown)="startLongPress($event)"
      (pointerup)="cancelLongPress()"
      (pointercancel)="cancelLongPress()"
      (contextmenu)="$event.preventDefault()"
      (click)="onClick()"
    >
      <ng-content />
    </button>
    <div
      #tip
      popover="manual"
      role="tooltip"
      [id]="tipId"
      class="pointer-events-none m-0 inset-auto w-max max-w-[min(15rem,calc(100vw-1rem))] rounded-field border-0 bg-neutral px-2.5 py-1.5 text-left text-neutral-content shadow-lg"
    >
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
  `,
})
export class ToolButtonComponent {
  readonly label = input.required<string>();
  readonly description = input<string>('');
  readonly shortcut = input<string>('');
  readonly active = input(false);
  readonly toggle = input(false);
  readonly disabled = input(false);
  readonly side = input<TooltipSide>('bottom');
  readonly pressed = output<void>();

  protected readonly tipId = `cp-tip-${nextTipId++}`;
  protected readonly hovered = signal(false);
  protected readonly focused = signal(false);
  protected readonly peeking = signal(false);
  private readonly visible = computed(() => this.hovered() || this.focused() || this.peeking());

  private readonly trigger = viewChild.required<ElementRef<HTMLButtonElement>>('trigger');
  private readonly tip = viewChild.required<ElementRef<HTMLElement>>('tip');
  private readonly doc = inject(DOCUMENT);

  private longPressTimer?: ReturnType<typeof setTimeout>;
  private peekTimer?: ReturnType<typeof setTimeout>;
  private suppressNextClick = false;

  constructor() {
    inject(DestroyRef).onDestroy(() => {
      clearTimeout(this.longPressTimer);
      clearTimeout(this.peekTimer);
    });
    effect(() => {
      const show = this.visible();
      untracked(() => this.toggleTip(show));
    });
  }

  protected onPointerEnter(event: PointerEvent): void {
    if (event.pointerType === 'mouse') this.hovered.set(true);
  }

  protected onPointerLeave(): void {
    this.hovered.set(false);
    this.cancelLongPress();
  }

  protected onFocus(event: FocusEvent): void {
    if ((event.target as HTMLElement).matches(':focus-visible')) this.focused.set(true);
  }

  protected startLongPress(event: PointerEvent): void {
    if (event.pointerType === 'mouse') return;
    this.longPressTimer = setTimeout(() => this.peek(), LONG_PRESS_MS);
  }

  protected cancelLongPress(): void {
    clearTimeout(this.longPressTimer);
  }

  protected onClick(): void {
    this.hovered.set(false);
    if (this.suppressNextClick) {
      this.suppressNextClick = false;
      return;
    }
    this.pressed.emit();
  }

  private peek(): void {
    this.suppressNextClick = true;
    this.peeking.set(true);
    clearTimeout(this.peekTimer);
    this.peekTimer = setTimeout(() => {
      this.peeking.set(false);
      this.suppressNextClick = false;
    }, PEEK_MS);
  }

  private toggleTip(show: boolean): void {
    const tip = this.tip().nativeElement;
    const open = tip.matches(':popover-open');
    if (!show) {
      if (open) tip.hidePopover();
      return;
    }
    if (!open) tip.showPopover();
    const win = this.doc.defaultView;
    if (!win) return;
    const anchor = this.trigger().nativeElement.getBoundingClientRect();
    const size = tip.getBoundingClientRect();
    const pos = computePopoverPosition(anchor, size, { width: win.innerWidth, height: win.innerHeight }, this.side());
    tip.style.left = `${pos.left}px`;
    tip.style.top = `${pos.top}px`;
  }
}
