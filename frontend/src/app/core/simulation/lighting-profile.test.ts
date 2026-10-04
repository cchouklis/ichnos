import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ambientLevels, brightestLamps, lightingProfileFor } from './lighting-profile.ts';

test('touch devices get a smaller light pool with fewer, cheaper shadows', () => {
  const touch = lightingProfileFor(true);
  const desktop = lightingProfileFor(false);
  assert.ok(touch.poolSize < desktop.poolSize);
  assert.ok(touch.shadowCasters < desktop.shadowCasters);
  assert.ok(touch.shadowMapSize < desktop.shadowMapSize);
});

test('shadow casters never exceed the pool', () => {
  for (const coarse of [true, false]) {
    const p = lightingProfileFor(coarse);
    assert.ok(p.shadowCasters <= p.poolSize);
  }
});

test('ambient light drops only while simulating at night', () => {
  assert.ok(ambientLevels(true, false).sky < ambientLevels(false, false).sky);
  assert.equal(ambientLevels(true, false).sun, 0);
  assert.deepEqual(ambientLevels(true, true), ambientLevels(false, false));
});

test('brightestLamps keeps the strongest powered lamps and skips unpowered ones', () => {
  const lamps = [{ id: 'a', level: 0.2 }, { id: 'b', level: 0 }, { id: 'c', level: 1 }, { id: 'd', level: 0.6 }];
  assert.deepEqual(brightestLamps(lamps, 2).map((l) => l.id), ['c', 'd']);
  assert.equal(brightestLamps(lamps, 10).length, 3);
});
