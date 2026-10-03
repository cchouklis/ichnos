import { DrawerStepId } from '../util/drawer-steps.util';

export interface DrawerStep {
  readonly id: DrawerStepId;
  readonly title: string;
  readonly summary: string;
}

/** The natural order of the work: set up, lay out, place, connect, then check and hand off. */
export const DRAWER_STEPS: readonly DrawerStep[] = [
  { id: 'project', title: 'Project', summary: 'Name, underlay and saving' },
  { id: 'rooms', title: 'Rooms', summary: 'Review and name your rooms' },
  { id: 'structure', title: 'Structure', summary: 'Draw the walls' },
  { id: 'components', title: 'Components', summary: 'Place outlets, switches and lights' },
  { id: 'wiring', title: 'Wiring & power', summary: 'Connect devices and test power' },
  { id: 'review', title: 'Review', summary: 'Checks, materials and export' },
];
