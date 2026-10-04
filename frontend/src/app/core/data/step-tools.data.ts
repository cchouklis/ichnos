import type { Tool } from '../models';
import type { DrawerStepId } from '../util/drawer-steps.util';

/** The guide step that holds the options of each tool. Select has none of its own. */
export const STEP_FOR_TOOL: Readonly<Record<Tool, DrawerStepId | null>> = {
  select: null,
  wall: 'structure',
  room: 'structure',
  component: 'components',
  wire: 'wiring',
};
