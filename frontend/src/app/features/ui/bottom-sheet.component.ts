import { ChangeDetectionStrategy, Component, ElementRef, effect, input, output, viewChild } from '@angular/core';

/** Modal bottom sheet on a native <dialog>: focus trap, Escape and backdrop dismissal come from the platform. */
@Component({
  selector: 'cp-bottom-sheet',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <dialog #dialog class="modal modal-bottom" [attr.aria-label]="label()" (close)="closed.emit()">
      <div class="modal-box flex max-h-[85dvh] w-full max-w-none flex-col gap-0 overflow-hidden rounded-t-2xl p-0 pb-[env(safe-area-inset-bottom)]">
        <div class="mx-auto mt-2 h-1 w-10 shrink-0 rounded-full bg-base-content/20" aria-hidden="true"></div>
        <header class="flex shrink-0 items-center justify-between px-4 py-2">
          <h2 class="font-display text-base font-bold">{{ label() }}</h2>
          <button type="button" class="btn btn-ghost btn-circle btn-sm size-11" aria-label="Close" (click)="closed.emit()">
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M18 6 6 18M6 6l12 12"/></svg>
          </button>
        </header>
        <div class="flex min-h-0 flex-1 flex-col overflow-y-auto overflow-x-hidden overscroll-contain">
          <ng-content />
        </div>
      </div>
      <form method="dialog" class="modal-backdrop"><button type="submit" aria-label="Close" tabindex="-1">close</button></form>
    </dialog>
  `,
})
export class BottomSheetComponent {
  readonly open = input.required<boolean>();
  readonly label = input.required<string>();
  readonly closed = output<void>();

  private readonly dialog = viewChild.required<ElementRef<HTMLDialogElement>>('dialog');

  constructor() {
    effect(() => {
      const el = this.dialog().nativeElement;
      if (this.open() && !el.open) el.showModal();
      else if (!this.open() && el.open) el.close();
    });
  }
}
