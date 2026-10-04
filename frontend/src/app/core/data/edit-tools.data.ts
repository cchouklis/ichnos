import type { Tool } from '../models';

export interface EditTool {
  readonly id: Tool;
  readonly label: string;
  readonly shortcut: string;
  readonly description: string;
  readonly iconPath: string;
}

export const EDIT_TOOLS: readonly EditTool[] = [
  {
    id: 'select',
    label: 'Select',
    shortcut: 'V',
    description: 'Click to select, Shift+click to add. Drag a component to move it, drag empty space to box-select.',
    iconPath: 'm4 4 7.07 17 2.51-7.39L21 11.07z',
  },
  {
    id: 'wall',
    label: 'Walls',
    shortcut: 'W',
    description: 'Click to add points, double-click or Enter to finish. Right-click deletes a wall; Ctrl+drag selects walls.',
    iconPath: 'M4 20 20 4M4 4v4M4 4h4M20 20v-4M20 20h-4',
  },
  {
    id: 'room',
    label: 'Room',
    shortcut: 'R',
    description: 'Drag a rectangle to create four walls and a room in one step.',
    iconPath: 'M5 5h14a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1z',
  },
  {
    id: 'component',
    label: 'Parts',
    shortcut: 'P',
    description: 'Click the plan to place the chosen component; it snaps to walls. Right-click deletes. Esc stops placing.',
    iconPath: 'M8 3h8a3 3 0 0 1 3 3v12a3 3 0 0 1-3 3H8a3 3 0 0 1-3-3V6a3 3 0 0 1 3-3zM12 9m-1.6 0a1.6 1.6 0 1 0 3.2 0a1.6 1.6 0 1 0-3.2 0M9.5 15h5',
  },
  {
    id: 'wire',
    label: 'Wires',
    shortcut: 'C',
    description: 'Click one component, then another, to connect them. Right-click deletes a wire.',
    iconPath: 'M3.6 6a2.4 2.4 0 1 0 4.8 0a2.4 2.4 0 1 0-4.8 0M15.6 18a2.4 2.4 0 1 0 4.8 0a2.4 2.4 0 1 0-4.8 0M8 8c3 0 5 8 8 8',
  },
];
