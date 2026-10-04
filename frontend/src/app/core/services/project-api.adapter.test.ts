import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { ProjectDto } from '../models';
import { fromWire, toWire } from './project-api.adapter';

const dto: ProjectDto = {
  id: null, name: 'P', scalePxPerMeter: 60, rooms: [], wires: [],
  walls: [{ id: 'w1', x1: 0, y1: 0, x2: 1, y2: 0, thicknessMm: 120, heightMm: 2700 }],
  components: [
    { id: 'c1', type: 'outlet-single', x: 0, y: 0, rot: 0, circuit: 1, label: '', notes: '', mountHeightMm: 300 },
    { id: 'c2', type: 'outlet-single', x: 0, y: 0, rot: 0, circuit: 1, label: '', notes: '' },
  ],
};

test('toWire converts mm to metres', () => {
  const w = toWire(dto);
  assert.equal(w.walls[0].thickness, 0.12);
  assert.equal(w.walls[0].height, 2.7);
  assert.equal(w.components[0].mountHeight, 0.3);
  assert.equal('mountHeight' in w.components[1], false);
});

test('toWire drops roomId, which the current backend does not know', () => {
  const w = toWire({ ...dto, components: [{ ...dto.components[0], roomId: 'r1' }] });
  assert.equal('roomId' in w.components[0], false);
});

test('round trip is lossless', () => {
  assert.deepEqual(fromWire(toWire(dto)), dto);
});
