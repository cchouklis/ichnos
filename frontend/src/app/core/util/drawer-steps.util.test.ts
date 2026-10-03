import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { computeStepStatuses, type StepInput } from './drawer-steps.util.ts';

const empty: StepInput = {
  projectName: 'House',
  roomCount: 0,
  wallCount: 0,
  componentCount: 0,
  wireCount: 0,
  unwiredCount: 0,
  errorCount: 0,
  warningCount: 0,
};

describe('computeStepStatuses', () => {
  it('marks an empty project as todo apart from the name', () => {
    const s = computeStepStatuses(empty);
    assert.deepEqual(s, {
      project: 'done',
      rooms: 'todo',
      structure: 'todo',
      components: 'todo',
      wiring: 'todo',
      review: 'todo',
    });
  });

  it('flags a blank project name', () => {
    assert.equal(computeStepStatuses({ ...empty, projectName: '   ' }).project, 'attention');
  });

  it('wiring needs attention while components are unwired, and is done once wired', () => {
    const base = { ...empty, componentCount: 3 };
    assert.equal(computeStepStatuses({ ...base, unwiredCount: 2 }).wiring, 'attention');
    assert.equal(computeStepStatuses({ ...base, wireCount: 0 }).wiring, 'todo');
    assert.equal(computeStepStatuses({ ...base, wireCount: 2 }).wiring, 'done');
  });

  it('review reflects compliance results', () => {
    const base = { ...empty, componentCount: 3, wireCount: 2 };
    assert.equal(computeStepStatuses(base).review, 'done');
    assert.equal(computeStepStatuses({ ...base, warningCount: 1 }).review, 'attention');
    assert.equal(computeStepStatuses({ ...base, errorCount: 1 }).review, 'attention');
  });
});
