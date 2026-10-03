import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { SCENE_COLORS, circuitColor, parseThemeMode, resolveTheme, themedColor } from './theme.util.ts';

describe('parseThemeMode', () => {
  it('keeps the three valid modes', () => {
    assert.equal(parseThemeMode('light'), 'light');
    assert.equal(parseThemeMode('dark'), 'dark');
    assert.equal(parseThemeMode('system'), 'system');
  });
  it('falls back to system for anything else', () => {
    for (const bad of [null, undefined, '', 'DARK', 'blue', 0, {}, ['dark']]) {
      assert.equal(parseThemeMode(bad), 'system');
    }
  });
});

describe('resolveTheme', () => {
  it('honours an explicit mode regardless of the device', () => {
    assert.equal(resolveTheme('light', true), 'ichnos-light');
    assert.equal(resolveTheme('dark', false), 'ichnos-dark');
  });
  it('follows the device in system mode', () => {
    assert.equal(resolveTheme('system', true), 'ichnos-dark');
    assert.equal(resolveTheme('system', false), 'ichnos-light');
  });
});

describe('circuitColor', () => {
  it('starts at the first colour for circuit 1 and wraps after six', () => {
    assert.equal(circuitColor('ichnos-dark', 1), '#4fd1ff');
    assert.equal(circuitColor('ichnos-dark', 7), '#4fd1ff');
    assert.equal(circuitColor('ichnos-light', 2), '#b45309');
  });
  it('never returns undefined for zero, negative or non-finite circuits', () => {
    for (const c of [0, -1, -7, Number.NaN, Number.POSITIVE_INFINITY, 2.9]) {
      assert.match(circuitColor('ichnos-light', c), /^#[0-9a-f]{6}$/);
    }
  });
});

describe('themedColor', () => {
  it('leaves colours unchanged in the dark theme', () => {
    assert.equal(themedColor('#ffe27a', 'ichnos-dark'), '#ffe27a');
  });
  it('swaps known catalogue colours in the light theme, case-insensitively', () => {
    assert.equal(themedColor('#FFE27A', 'ichnos-light'), '#8a6d00');
    assert.equal(themedColor('#ffb020', 'ichnos-light'), '#b86500');
  });
  it('passes unknown colours through', () => {
    assert.equal(themedColor('#123456', 'ichnos-light'), '#123456');
  });
});

describe('SCENE_COLORS', () => {
  it('defines every field for both themes', () => {
    for (const theme of ['ichnos-dark', 'ichnos-light'] as const) {
      for (const value of Object.values(SCENE_COLORS[theme])) {
        assert.equal(typeof value, 'number');
      }
    }
  });
});
