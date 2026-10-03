import { DOCUMENT } from '@angular/common';
import { DestroyRef, Injectable, computed, inject, signal } from '@angular/core';
import { DrawerStepId } from '../util/drawer-steps.util';
import {
  DrawerState,
  INITIAL_DRAWER_STATE,
  closeOverlay,
  isDrawerVisible,
  openDrawer,
  toggleDrawer,
  viewportChanged,
} from '../util/drawer-state.util';

/** Matches Tailwind's `lg` breakpoint, where the drawer becomes a pinned side panel. */
const DESKTOP_QUERY = '(min-width: 1024px)';

/** UI layout state (not part of the document, so it never enters undo history or saves). */
@Injectable({ providedIn: 'root' })
export class LayoutStore {
  private readonly doc = inject(DOCUMENT);
  private readonly state = signal<DrawerState>(INITIAL_DRAWER_STATE);

  readonly activeStep = signal<DrawerStepId>('project');

  readonly isDesktop = computed(() => this.state().isDesktop);
  readonly pinned = computed(() => this.state().pinned);
  readonly overlayOpen = computed(() => this.state().overlayOpen);
  readonly drawerVisible = computed(() => isDrawerVisible(this.state()));

  constructor() {
    const query = this.doc.defaultView?.matchMedia?.(DESKTOP_QUERY);
    if (query) {
      this.state.update((s) => viewportChanged(s, query.matches));
      const onChange = (e: MediaQueryListEvent): void => this.state.update((s) => viewportChanged(s, e.matches));
      query.addEventListener('change', onChange);
      inject(DestroyRef).onDestroy(() => query.removeEventListener('change', onChange));
    }
  }

  toggleDrawer(): void {
    this.state.update(toggleDrawer);
  }

  /** Opens the drawer, optionally jumping to a step. */
  open(step?: DrawerStepId): void {
    if (step) this.activeStep.set(step);
    this.state.update(openDrawer);
  }

  /** Closes the overlay drawer; a pinned desktop drawer stays put. */
  closeOverlay(): void {
    this.state.update(closeOverlay);
  }

  setOverlayOpen(open: boolean): void {
    this.state.update((s) => (open ? openDrawer(s) : closeOverlay(s)));
  }

  setStep(step: DrawerStepId): void {
    this.activeStep.set(step);
  }
}
