import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  INITIAL_DRAWER_STATE,
  closeOverlay,
  isDrawerVisible,
  openDrawer,
  toggleDrawer,
  viewportChanged,
} from './drawer-state.util.ts';

const desktop = { ...INITIAL_DRAWER_STATE, isDesktop: true };
const mobile = { ...INITIAL_DRAWER_STATE, isDesktop: false };

describe('drawer state', () => {
  it('starts pinned on desktop and closed as an overlay elsewhere', () => {
    assert.equal(isDrawerVisible(desktop), true);
    assert.equal(isDrawerVisible(mobile), false);
  });

  it('toggle collapses the pinned drawer on desktop and opens the overlay on mobile', () => {
    assert.equal(isDrawerVisible(toggleDrawer(desktop)), false);
    assert.equal(isDrawerVisible(toggleDrawer(toggleDrawer(desktop))), true);
    assert.equal(isDrawerVisible(toggleDrawer(mobile)), true);
  });

  it('open always results in a visible drawer', () => {
    assert.equal(isDrawerVisible(openDrawer(toggleDrawer(desktop))), true);
    assert.equal(isDrawerVisible(openDrawer(mobile)), true);
  });

  it('closing the overlay does not collapse a pinned desktop drawer', () => {
    assert.equal(isDrawerVisible(closeOverlay(desktop)), true);
    assert.equal(isDrawerVisible(closeOverlay(openDrawer(mobile))), false);
  });

  it('crossing the breakpoint clears a stale overlay', () => {
    const opened = openDrawer(mobile);
    const resized = viewportChanged(opened, true);
    assert.equal(resized.overlayOpen, false);
    assert.equal(resized.isDesktop, true);
  });

  it('an unchanged viewport returns the same state object', () => {
    assert.equal(viewportChanged(desktop, true), desktop);
  });
});
