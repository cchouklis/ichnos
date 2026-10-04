import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { ComponentInstance, Wall, Wire } from '../models';
import {
  elementsInRect, removeElements, segmentIntersectsRect, sharedValue, toggleRef, normalizeRect, pointInRect,
} from './selection.util';

const wall = (id: string, x1: number, y1: number, x2: number, y2: number): Wall =>
  ({ id, x1, y1, x2, y2, thicknessMm: 120, heightMm: 2700 });
const comp = (id: string, x: number, y: number): ComponentInstance =>
  ({ id, type: 'outlet-single', x, y, rot: 0, circuit: 1, label: id, notes: '' });
const wire = (id: string, a: string, b: string): Wire => ({ id, a, b, circuit: 1 });

test('segmentIntersectsRect: inside, crossing, outside, parallel', () => {
  const r = { x1: 0, y1: 0, x2: 2, y2: 2 };
  assert.equal(segmentIntersectsRect({ x: 0.5, y: 0.5 }, { x: 1, y: 1 }, r), true);
  assert.equal(segmentIntersectsRect({ x: -1, y: 1 }, { x: 3, y: 1 }, r), true);
  assert.equal(segmentIntersectsRect({ x: 3, y: 0 }, { x: 3, y: 2 }, r), false);
  assert.equal(segmentIntersectsRect({ x: -1, y: 3 }, { x: 3, y: 3 }, r), false);
  assert.equal(segmentIntersectsRect({ x: -1, y: -1 }, { x: -0.1, y: 5 }, r), false);
});

test('normalizeRect and pointInRect accept any corner order', () => {
  const r = normalizeRect({ x1: 2, y1: 2, x2: 0, y2: 0 });
  assert.deepEqual(r, { x1: 0, y1: 0, x2: 2, y2: 2 });
  assert.equal(pointInRect({ x: 1, y: 1 }, { x1: 2, y1: 2, x2: 0, y2: 0 }), true);
});

test('elementsInRect respects kinds filter', () => {
  const doc = {
    walls: [wall('w1', 0, 0, 4, 0), wall('w2', 10, 10, 12, 10)],
    rooms: [],
    components: [comp('c1', 1, 0.1), comp('c2', 8, 8)],
    wires: [wire('x1', 'c1', 'c2')],
  };
  const rect = { x1: -1, y1: -1, x2: 2, y2: 1 };
  assert.deepEqual(elementsInRect(doc, rect, ['wall']), [{ kind: 'wall', id: 'w1' }]);
  assert.deepEqual(elementsInRect(doc, rect, ['component']), [{ kind: 'component', id: 'c1' }]);
  assert.deepEqual(elementsInRect(doc, rect, ['wire']), [{ kind: 'wire', id: 'x1' }]);
  assert.equal(elementsInRect(doc, rect).length, 3);
});

test('removeElements cascades to wires and room wall lists and does not mutate input', () => {
  const doc = {
    walls: [wall('w1', 0, 0, 1, 0), wall('w2', 1, 0, 1, 1)],
    rooms: [{ id: 'r1', label: 'R', wallIds: ['w1', 'w2'] }],
    components: [comp('c1', 0, 0), comp('c2', 1, 1)],
    wires: [wire('x1', 'c1', 'c2')],
  };
  const a = removeElements(doc, [{ kind: 'component', id: 'c1' }]);
  assert.equal(a.components.length, 1);
  assert.equal(a.wires.length, 0);
  const b = removeElements(doc, [{ kind: 'wall', id: 'w1' }]);
  assert.deepEqual(b.rooms[0].wallIds, ['w2']);
  assert.equal(b.walls.length, 1);
  assert.equal(doc.walls.length, 2);
});

test('toggleRef adds and removes', () => {
  const ref = { kind: 'wall', id: 'w1' } as const;
  assert.deepEqual(toggleRef([], ref), [ref]);
  assert.deepEqual(toggleRef([ref], ref), []);
});

test('sharedValue', () => {
  assert.equal(sharedValue([]), null);
  assert.equal(sharedValue([120, 120]), 120);
  assert.equal(sharedValue([120, 150]), null);
});
