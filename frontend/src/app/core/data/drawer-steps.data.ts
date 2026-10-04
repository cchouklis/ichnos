import { DrawerStepId } from '../util/drawer-steps.util';

export interface DrawerStep {
  readonly id: DrawerStepId;
  readonly title: string;
  readonly summary: string;
  readonly iconPath: string;
}

/** The natural order of the work: set up, lay out, place, connect, then check and hand off. */
export const DRAWER_STEPS: readonly DrawerStep[] = [
  { id: 'project', title: 'Project', summary: 'Name, underlay and saving', iconPath: 'M4 4h12l4 4v12H4zM8 4v5h7V4M8 20v-6h8v6' },
  { id: 'rooms', title: 'Rooms', summary: 'Review and name your rooms', iconPath: 'M3 10.5 12 3l9 7.5V21H3zM9 21v-6h6v6' },
  { id: 'structure', title: 'Structure', summary: 'Draw the walls', iconPath: 'M4 20 20 4M4 4v4M4 4h4M20 20v-4M20 20h-4' },
  { id: 'components', title: 'Components', summary: 'Place outlets, switches and lights', iconPath: 'M7 3h10v18H7zM12 8v.01M10 15h4' },
  { id: 'wiring', title: 'Wiring & power', summary: 'Connect devices and test power', iconPath: 'M13 2 3 14h7l-1 8 11-14h-8z' },
  { id: 'review', title: 'Review', summary: 'Checks, materials and export', iconPath: 'M5 13l4 4L19 7' },
];
