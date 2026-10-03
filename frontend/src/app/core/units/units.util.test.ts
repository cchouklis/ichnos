import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  MOUNT_HEIGHT_MM,
  WALL_HEIGHT_MM,
  WALL_THICKNESS_MM,
  clampToRange,
  formatMm,
  metersToMm,
  mmToMeters,
  parseMmInput,
} from './units.util';

describe('conversion', () => {
  it('converts between millimetres and metres', () => {
    assert.equal(mmToMeters(2700), 2.7);
    assert.equal(metersToMm(0.12), 120);
    assert.equal(metersToMm(2.7), 2700);
  });
  it('rounds away floating point noise when converting from metres', () => {
    assert.equal(metersToMm(0.1 + 0.2), 300);
    assert.equal(metersToMm(1.0049), 1005);
  });
  it('round-trips whole millimetres', () => {
    for (const mm of [10, 120, 1999, 2700, 10000]) assert.equal(metersToMm(mmToMeters(mm)), mm);
  });
});

describe('clampToRange', () => {
  it('clamps to the range and rounds to whole millimetres', () => {
    assert.equal(clampToRange(5, WALL_THICKNESS_MM), 10);
    assert.equal(clampToRange(5000, WALL_THICKNESS_MM), 1000);
    assert.equal(clampToRange(119.6, WALL_THICKNESS_MM), 120);
  });
  it('returns the default for non-finite input', () => {
    assert.equal(clampToRange(Number.NaN, WALL_HEIGHT_MM), 2700);
    assert.equal(clampToRange(Number.POSITIVE_INFINITY, WALL_HEIGHT_MM), 2700);
  });
  it('allows zero only where the range does', () => {
    assert.equal(clampToRange(0, MOUNT_HEIGHT_MM), 0);
    assert.equal(clampToRange(0, WALL_HEIGHT_MM), 500);
  });
});

describe('parseMmInput', () => {
  it('parses numbers and numeric strings, clamped', () => {
    assert.equal(parseMmInput('150', WALL_THICKNESS_MM), 150);
    assert.equal(parseMmInput(99999, WALL_HEIGHT_MM), 10000);
  });
  it('returns null for empty or non-numeric input so the field is ignored', () => {
    for (const bad of ['', null, undefined, 'abc', '12px']) assert.equal(parseMmInput(bad, WALL_THICKNESS_MM), null);
  });
});

describe('formatMm', () => {
  it('formats with the unit', () => {
    assert.equal(formatMm(120), '120 mm');
    assert.equal(formatMm(119.6), '120 mm');
  });
});
