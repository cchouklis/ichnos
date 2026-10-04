import { test } from 'node:test';
import assert from 'node:assert/strict';
import { computePopoverPosition } from './popover-position.util.ts';

const viewport = { width: 400, height: 600 };
const size = { width: 200, height: 40 };

test('centres below the anchor when there is room', () => {
  const pos = computePopoverPosition({ left: 150, top: 100, width: 44, height: 44 }, size, viewport, 'bottom');
  assert.deepEqual(pos, { left: 72, top: 150 });
});

test('stays inside the viewport horizontally', () => {
  const left = computePopoverPosition({ left: 8, top: 100, width: 44, height: 44 }, size, viewport, 'bottom');
  assert.equal(left.left, 8);
  const right = computePopoverPosition({ left: 360, top: 100, width: 44, height: 44 }, size, viewport, 'bottom');
  assert.equal(right.left, 192);
});

test('flips above when there is no room below', () => {
  const pos = computePopoverPosition({ left: 150, top: 560, width: 44, height: 44 }, size, viewport, 'bottom');
  assert.equal(pos.top, 514);
});

test('flips to the right of a left-side anchor with no room on its left', () => {
  const pos = computePopoverPosition({ left: 8, top: 300, width: 44, height: 44 }, size, viewport, 'left');
  assert.equal(pos.left, 58);
});
