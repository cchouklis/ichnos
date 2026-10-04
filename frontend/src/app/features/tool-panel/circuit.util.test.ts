import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseCircuit } from './circuit.util.ts';

test('parses and clamps circuit numbers', () => {
  assert.equal(parseCircuit('3'), 3);
  assert.equal(parseCircuit('2.6'), 3);
  assert.equal(parseCircuit('0'), 1);
  assert.equal(parseCircuit('500'), 99);
});

test('empty or invalid input is null', () => {
  assert.equal(parseCircuit(''), null);
  assert.equal(parseCircuit(null), null);
  assert.equal(parseCircuit('abc'), null);
});
