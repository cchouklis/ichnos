import { test } from 'node:test';
import assert from 'node:assert/strict';
import { viewportClassFor } from './viewport.util.ts';

test('desktop wins over tablet, tablet over phone', () => {
  assert.equal(viewportClassFor({ tablet: false, desktop: false, coarsePointer: false }), 'phone');
  assert.equal(viewportClassFor({ tablet: true, desktop: false, coarsePointer: false }), 'tablet');
  assert.equal(viewportClassFor({ tablet: true, desktop: true, coarsePointer: false }), 'desktop');
});

test('a wide touch screen is still a tablet', () => {
  assert.equal(viewportClassFor({ tablet: true, desktop: true, coarsePointer: true }), 'tablet');
});
