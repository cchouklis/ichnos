import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { ComponentInstance, PowerRole, Wire } from '../models';
import { solvePower, type SwitchSetting } from './power-solver.ts';

const roles: Record<string, PowerRole> = { panel: 'source', outlet: 'conductor', jbox: 'conductor', sw: 'switch', dim: 'dimmer', lamp: 'load' };
const roleOf = (c: ComponentInstance): PowerRole => roles[c.type];
const comp = (id: string, type: string): ComponentInstance => ({ id, type, x: 0, y: 0, rot: 0, circuit: 1, label: id, notes: '' });
const wire = (id: string, a: string, b: string): Wire => ({ id, a, b, circuit: 1 });
const settings = (entries: Record<string, SwitchSetting>) => new Map(Object.entries(entries));

const demo = {
  components: [comp('panel', 'panel'), comp('sw', 'sw'), comp('jbox', 'jbox'), comp('dim', 'dim'), comp('lamp', 'lamp'), comp('o1', 'outlet'), comp('o2', 'outlet')],
  wires: [wire('w1', 'panel', 'sw'), wire('w2', 'sw', 'jbox'), wire('w3', 'jbox', 'dim'), wire('w4', 'dim', 'lamp'), wire('w5', 'panel', 'o1'), wire('w6', 'o1', 'o2')],
};
const solveDemo = (s: Record<string, SwitchSetting> = {}) => solvePower(demo.components, demo.wires, settings(s), roleOf);

test('everything on: lamp at full level, outlets chained, flow runs away from the panel', () => {
  const { levels, flows } = solveDemo();
  assert.equal(levels.get('lamp'), 1);
  assert.equal(levels.get('o2'), 1);
  assert.deepEqual(flows.get('w1'), { from: 'panel', to: 'sw' });
  assert.deepEqual(flows.get('w6'), { from: 'o1', to: 'o2' });
});

test('an open switch cuts everything downstream but not the switch itself or the outlets', () => {
  const { levels, flows } = solveDemo({ sw: { on: false, level: 1 } });
  assert.equal(levels.get('sw'), 1);
  assert.equal(levels.has('jbox'), false);
  assert.equal(levels.has('lamp'), false);
  assert.equal(levels.get('o2'), 1);
  assert.equal(flows.has('w2'), false);
});

test('a dimmer scales the level of everything downstream', () => {
  const { levels } = solveDemo({ dim: { on: true, level: 0.4 } });
  assert.equal(levels.get('dim'), 1);
  assert.equal(levels.get('lamp'), 0.4);
});

test('dimmers in series multiply', () => {
  const comps = [comp('panel', 'panel'), comp('d1', 'dim'), comp('d2', 'dim'), comp('lamp', 'lamp')];
  const wires = [wire('a', 'panel', 'd1'), wire('b', 'd1', 'd2'), wire('c', 'd2', 'lamp')];
  const { levels } = solvePower(comps, wires, settings({ d1: { on: true, level: 0.5 }, d2: { on: true, level: 0.5 } }), roleOf);
  assert.equal(levels.get('lamp'), 0.25);
});

test('unconnected components and components without a panel stay unpowered', () => {
  assert.equal(solveDemo().levels.has('nope'), false);
  const noPanel = solvePower(demo.components.slice(1), demo.wires, settings({}), roleOf);
  assert.equal(noPanel.levels.size, 0);
  assert.equal(noPanel.flows.size, 0);
});

test('a lamp is a dead end and does not pass power on', () => {
  const comps = [comp('panel', 'panel'), comp('lamp', 'lamp'), comp('o', 'outlet')];
  const { levels } = solvePower(comps, [wire('a', 'panel', 'lamp'), wire('b', 'lamp', 'o')], settings({}), roleOf);
  assert.equal(levels.get('lamp'), 1);
  assert.equal(levels.has('o'), false);
});

test('the brighter path wins when a lamp is fed twice, and loops terminate', () => {
  const comps = [comp('panel', 'panel'), comp('d', 'dim'), comp('o', 'outlet'), comp('lamp', 'lamp')];
  const wires = [wire('a', 'panel', 'd'), wire('b', 'd', 'lamp'), wire('c', 'panel', 'o'), wire('d', 'o', 'lamp'), wire('e', 'o', 'panel')];
  const { levels } = solvePower(comps, wires, settings({ d: { on: true, level: 0.3 } }), roleOf);
  assert.equal(levels.get('lamp'), 1);
});

test('two panels feed the same network and wires to missing components are ignored', () => {
  const comps = [comp('p1', 'panel'), comp('p2', 'panel'), comp('o', 'outlet')];
  const { levels } = solvePower(comps, [wire('a', 'p2', 'o'), wire('b', 'o', 'ghost')], settings({}), roleOf);
  assert.equal(levels.get('o'), 1);
  assert.equal(levels.has('ghost'), false);
});
