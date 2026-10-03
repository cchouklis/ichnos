export type DrawerStepId = 'project' | 'rooms' | 'structure' | 'components' | 'wiring' | 'review';
export type StepStatus = 'todo' | 'done' | 'attention';

export interface StepInput {
  readonly projectName: string;
  readonly roomCount: number;
  readonly wallCount: number;
  readonly componentCount: number;
  readonly wireCount: number;
  /** Components (other than the panel) with no wire attached. */
  readonly unwiredCount: number;
  readonly errorCount: number;
  readonly warningCount: number;
}

/**
 * Derives each step's status from the document so the drawer can guide the user:
 * `done` when the step has what it needs, `attention` when something there needs fixing,
 * `todo` when it has not been started.
 */
export function computeStepStatuses(i: StepInput): Record<DrawerStepId, StepStatus> {
  const hasComponents = i.componentCount > 0;
  return {
    project: i.projectName.trim().length > 0 ? 'done' : 'attention',
    rooms: i.roomCount > 0 ? 'done' : 'todo',
    structure: i.wallCount > 0 ? 'done' : 'todo',
    components: hasComponents ? 'done' : 'todo',
    wiring: !hasComponents ? 'todo' : i.unwiredCount > 0 ? 'attention' : i.wireCount > 0 ? 'done' : 'todo',
    review: i.errorCount > 0 ? 'attention' : hasComponents && i.warningCount === 0 ? 'done' : hasComponents ? 'attention' : 'todo',
  };
}
