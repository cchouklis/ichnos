/**
 * Pure drawer state transitions. On desktop the drawer is pinned open or collapsed; below the
 * desktop breakpoint it is an overlay that is opened and closed. Keeping this as a reducer
 * makes the rules testable without a browser.
 */
export interface DrawerState {
  readonly isDesktop: boolean;
  /** Desktop: whether the drawer is shown beside the editor. */
  readonly pinned: boolean;
  /** Below desktop: whether the overlay drawer is open. */
  readonly overlayOpen: boolean;
}

export const INITIAL_DRAWER_STATE: DrawerState = { isDesktop: false, pinned: true, overlayOpen: false };

export function isDrawerVisible(s: DrawerState): boolean {
  return s.isDesktop ? s.pinned : s.overlayOpen;
}

export function toggleDrawer(s: DrawerState): DrawerState {
  return s.isDesktop ? { ...s, pinned: !s.pinned } : { ...s, overlayOpen: !s.overlayOpen };
}

export function openDrawer(s: DrawerState): DrawerState {
  return s.isDesktop ? { ...s, pinned: true } : { ...s, overlayOpen: true };
}

/** Closes the overlay. On desktop the pinned drawer is left alone: collapsing is a deliberate toggle. */
export function closeOverlay(s: DrawerState): DrawerState {
  return s.overlayOpen ? { ...s, overlayOpen: false } : s;
}

/** Crossing the breakpoint never leaves a stale overlay open behind the pinned drawer. */
export function viewportChanged(s: DrawerState, isDesktop: boolean): DrawerState {
  return s.isDesktop === isDesktop ? s : { ...s, isDesktop, overlayOpen: false };
}
