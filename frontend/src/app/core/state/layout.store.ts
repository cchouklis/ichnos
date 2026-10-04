import { DOCUMENT } from '@angular/common';
import { DestroyRef, Injectable, computed, inject, signal } from '@angular/core';
import { DrawerStepId } from '../util/drawer-steps.util';
import { DESKTOP_MIN_WIDTH, TABLET_MIN_WIDTH, ViewportClass, viewportClassFor } from '../util/viewport.util';

const DESKTOP_QUERY = `(min-width: ${DESKTOP_MIN_WIDTH}px)`;
const TABLET_QUERY = `(min-width: ${TABLET_MIN_WIDTH}px)`;
const COARSE_POINTER_QUERY = '(pointer: coarse)';

type GuideOpenByViewport = Readonly<Record<ViewportClass, boolean>>;

/** The guide is open beside the plan on desktop, and opened on demand on tablet and phone. */
const INITIAL_GUIDE_OPEN: GuideOpenByViewport = { desktop: true, tablet: false, phone: false };

/** UI layout state (not part of the document, so it never enters undo history or saves). */
@Injectable({ providedIn: 'root' })
export class LayoutStore {
  private readonly doc = inject(DOCUMENT);

  private readonly desktopQuery = signal(false);
  private readonly tabletQuery = signal(false);
  private readonly guideOpenBy = signal<GuideOpenByViewport>(INITIAL_GUIDE_OPEN);

  readonly coarsePointer = signal(false);
  readonly activeStep = signal<DrawerStepId>('project');
  readonly menuOpen = signal(false);

  readonly viewport = computed(() =>
    viewportClassFor({ tablet: this.tabletQuery(), desktop: this.desktopQuery(), coarsePointer: this.coarsePointer() }),
  );
  readonly compact = computed(() => this.viewport() !== 'desktop');
  readonly guideOpen = computed(() => this.guideOpenBy()[this.viewport()]);

  constructor() {
    const win = this.doc.defaultView;
    const destroyRef = inject(DestroyRef);
    const watch = (query: string, apply: (matches: boolean) => void): void => {
      const list = win?.matchMedia?.(query);
      if (!list) return;
      apply(list.matches);
      const onChange = (e: MediaQueryListEvent): void => apply(e.matches);
      list.addEventListener('change', onChange);
      destroyRef.onDestroy(() => list.removeEventListener('change', onChange));
    };

    watch(DESKTOP_QUERY, (matches) => this.desktopQuery.set(matches));
    watch(TABLET_QUERY, (matches) => this.tabletQuery.set(matches));
    watch(COARSE_POINTER_QUERY, (matches) => this.coarsePointer.set(matches));
  }

  toggleGuide(): void {
    this.setGuideOpen(!this.guideOpen());
  }

  /** Opens the guide, optionally on a given step. */
  openGuide(step?: DrawerStepId): void {
    if (step) this.activeStep.set(step);
    this.menuOpen.set(false);
    this.setGuideOpen(true);
  }

  closeGuide(): void {
    this.setGuideOpen(false);
  }

  /** Taps on a step icon: open it, or close the guide when that step is already showing. */
  toggleStep(step: DrawerStepId): void {
    if (this.guideOpen() && this.activeStep() === step) this.closeGuide();
    else this.openGuide(step);
  }

  /** On a phone the guide covers the plan, so it closes once the user has made a choice. */
  dismissGuideOnPhone(): void {
    if (this.viewport() === 'phone') this.closeGuide();
  }

  setStep(step: DrawerStepId): void {
    this.activeStep.set(step);
  }

  openMenu(): void {
    this.closeGuide();
    this.menuOpen.set(true);
  }

  closeMenu(): void {
    this.menuOpen.set(false);
  }

  private setGuideOpen(open: boolean): void {
    const viewport = this.viewport();
    this.guideOpenBy.update((state) => (state[viewport] === open ? state : { ...state, [viewport]: open }));
  }
}
