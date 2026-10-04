import { test } from 'node:test';
import assert from 'node:assert/strict';
import { STEP_FOR_TOOL } from './step-tools.data.ts';

test('each drawing tool maps to the step that holds its options', () => {
  assert.equal(STEP_FOR_TOOL.wall, 'structure');
  assert.equal(STEP_FOR_TOOL.room, 'structure');
  assert.equal(STEP_FOR_TOOL.component, 'components');
  assert.equal(STEP_FOR_TOOL.wire, 'wiring');
  assert.equal(STEP_FOR_TOOL.select, null);
});
