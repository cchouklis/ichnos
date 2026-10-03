import { ComponentCategory, ComponentType } from '../models';

export const CATEGORY_META: Record<ComponentCategory, { label: string; color: string }> = {
  outlets: { label: 'Outlets', color: '#ffb020' },
  switches: { label: 'Switches', color: '#4fd1ff' },
  lighting: { label: 'Lighting', color: '#ffe27a' },
  distribution: { label: 'Distribution', color: '#ff5470' },
  boxes: { label: 'Boxes', color: '#8fa3c4' },
};

export const COMPONENT_TYPES: ComponentType[] = [
  { id: 'outlet-single', cat: 'outlets', label: 'Single Outlet', color: '#ffb020', height: 0.3, icon: 'outlet1', volts: 120, amps: 15 },
  { id: 'outlet-duplex', cat: 'outlets', label: 'Duplex Outlet', color: '#ffb020', height: 0.3, icon: 'outlet2', volts: 120, amps: 15 },
  { id: 'outlet-gfci', cat: 'outlets', label: 'GFCI Outlet', color: '#ffb020', height: 0.3, icon: 'outletGfci', volts: 120, amps: 20 },
  { id: 'outlet-usb', cat: 'outlets', label: 'USB Outlet', color: '#ffb020', height: 0.3, icon: 'outletUsb', volts: 120, amps: 15 },
  { id: 'outlet-220', cat: 'outlets', label: '220V Outlet', color: '#ff5470', height: 0.3, icon: 'outlet220', volts: 220, amps: 30 },
  { id: 'switch-single', cat: 'switches', label: 'Single-Pole Switch', color: '#4fd1ff', height: 1.2, icon: 'switch1', volts: 120, amps: 15 },
  { id: 'switch-3way', cat: 'switches', label: '3-Way Switch', color: '#4fd1ff', height: 1.2, icon: 'switch3', volts: 120, amps: 15 },
  { id: 'switch-dimmer', cat: 'switches', label: 'Dimmer Switch', color: '#4fd1ff', height: 1.2, icon: 'dimmer', volts: 120, amps: 10 },
  { id: 'light-ceiling', cat: 'lighting', label: 'Ceiling Light', color: '#ffe27a', height: 2.7, icon: 'ceilingLight', volts: 120, amps: 2 },
  { id: 'light-recessed', cat: 'lighting', label: 'Recessed Light', color: '#ffe27a', height: 2.7, icon: 'recessed', volts: 120, amps: 1 },
  { id: 'light-sconce', cat: 'lighting', label: 'Wall Sconce', color: '#ffe27a', height: 1.8, icon: 'sconce', volts: 120, amps: 1 },
  { id: 'light-pendant', cat: 'lighting', label: 'Pendant Light', color: '#ffe27a', height: 2.4, icon: 'pendant', volts: 120, amps: 2 },
  { id: 'panel', cat: 'distribution', label: 'Electrical Panel', color: '#ff5470', height: 1.5, icon: 'panel', volts: 240, amps: 200 },
  { id: 'junction', cat: 'boxes', label: 'Junction Box', color: '#8fa3c4', height: 2.4, icon: 'junction', volts: 120, amps: 20 },
];

const TYPE_INDEX: ReadonlyMap<string, ComponentType> = new Map(COMPONENT_TYPES.map((t) => [t.id, t]));

export function typeById(id: string): ComponentType {
  const t = TYPE_INDEX.get(id);
  if (!t) {
    throw new Error(`Unknown component type id: ${id}`);
  }
  return t;
}

/** Inner SVG markup for a component "kind" glyph, drawn in a 24x24 box. */
export function svgIcon(kind: string): string {
  switch (kind) {
    case 'outlet1':
      return `<rect x="5" y="4" width="14" height="16" rx="3" fill="none" stroke="currentColor" stroke-width="1.6"/><circle cx="12" cy="10" r="1.3" fill="currentColor"/><rect x="9" y="14" width="2.2" height="3" fill="currentColor"/><rect x="12.8" y="14" width="2.2" height="3" fill="currentColor"/>`;
    case 'outlet2':
      return `<rect x="3" y="4" width="18" height="16" rx="3" fill="none" stroke="currentColor" stroke-width="1.6"/><line x1="12" y1="4" x2="12" y2="20" stroke="currentColor" stroke-width="1.2" opacity=".5"/><rect x="5.3" y="14" width="1.8" height="2.6" fill="currentColor"/><rect x="8.3" y="14" width="1.8" height="2.6" fill="currentColor"/><rect x="13.9" y="14" width="1.8" height="2.6" fill="currentColor"/><rect x="16.9" y="14" width="1.8" height="2.6" fill="currentColor"/>`;
    case 'outletGfci':
      return `<rect x="4" y="3" width="16" height="18" rx="3" fill="none" stroke="currentColor" stroke-width="1.6"/><rect x="7" y="6" width="4" height="2.4" rx="1" fill="currentColor"/><rect x="13" y="6" width="4" height="2.4" rx="1" fill="currentColor"/><rect x="8.6" y="13" width="1.8" height="2.8" fill="currentColor"/><rect x="13.6" y="13" width="1.8" height="2.8" fill="currentColor"/>`;
    case 'outletUsb':
      return `<rect x="4" y="4" width="16" height="16" rx="3" fill="none" stroke="currentColor" stroke-width="1.6"/><rect x="8" y="14.4" width="2" height="2.6" fill="currentColor"/><rect x="14" y="14.4" width="2" height="2.6" fill="currentColor"/><rect x="8.5" y="6" width="7" height="4" rx="1" fill="none" stroke="currentColor" stroke-width="1.3"/><path d="M12 6v-1.6" stroke="currentColor" stroke-width="1.3"/>`;
    case 'outlet220':
      return `<rect x="4" y="4" width="16" height="16" rx="3" fill="none" stroke="currentColor" stroke-width="1.8"/><path d="M8 8l8 8M16 8l-8 8" stroke="currentColor" stroke-width="1.6"/>`;
    case 'switch1':
      return `<rect x="6" y="3" width="12" height="18" rx="3" fill="none" stroke="currentColor" stroke-width="1.6"/><rect x="8.4" y="5.6" width="7.2" height="7.6" rx="1.6" fill="currentColor" opacity=".9"/>`;
    case 'switch3':
      return `<rect x="6" y="3" width="12" height="18" rx="3" fill="none" stroke="currentColor" stroke-width="1.6"/><rect x="8.4" y="5.6" width="7.2" height="7.6" rx="1.6" fill="currentColor" opacity=".9"/><text x="12" y="18.5" font-size="5.5" text-anchor="middle" fill="currentColor" font-family="monospace">3W</text>`;
    case 'dimmer':
      return `<rect x="6" y="3" width="12" height="18" rx="3" fill="none" stroke="currentColor" stroke-width="1.6"/><circle cx="12" cy="9" r="3.2" fill="none" stroke="currentColor" stroke-width="1.4"/><rect x="8.5" y="15" width="7" height="2.4" rx="1.2" fill="currentColor" opacity=".85"/>`;
    case 'ceilingLight':
      return `<circle cx="12" cy="12" r="4.4" fill="none" stroke="currentColor" stroke-width="1.7"/><g stroke="currentColor" stroke-width="1.4"><line x1="12" y1="2.5" x2="12" y2="5.4"/><line x1="12" y1="18.6" x2="12" y2="21.5"/><line x1="2.5" y1="12" x2="5.4" y2="12"/><line x1="18.6" y1="12" x2="21.5" y2="12"/><line x1="5.6" y1="5.6" x2="7.6" y2="7.6"/><line x1="16.4" y1="16.4" x2="18.4" y2="18.4"/><line x1="18.4" y1="5.6" x2="16.4" y2="7.6"/><line x1="7.6" y1="16.4" x2="5.6" y2="18.4"/></g>`;
    case 'recessed':
      return `<circle cx="12" cy="12" r="8" fill="none" stroke="currentColor" stroke-width="1.4"/><circle cx="12" cy="12" r="3.6" fill="currentColor" opacity=".85"/>`;
    case 'sconce':
      return `<path d="M4 20a8 8 0 0 1 16 0" fill="none" stroke="currentColor" stroke-width="1.6"/><circle cx="12" cy="14" r="2.6" fill="currentColor" opacity=".85"/>`;
    case 'pendant':
      return `<line x1="12" y1="2" x2="12" y2="9" stroke="currentColor" stroke-width="1.4"/><path d="M7 9h10l-2.4 8h-5.2z" fill="none" stroke="currentColor" stroke-width="1.6"/>`;
    case 'panel':
      return `<rect x="4" y="3" width="16" height="18" rx="2" fill="none" stroke="currentColor" stroke-width="1.7"/><g fill="currentColor" opacity=".85"><rect x="6.4" y="6" width="4.6" height="1.8"/><rect x="6.4" y="9" width="4.6" height="1.8"/><rect x="6.4" y="12" width="4.6" height="1.8"/><rect x="6.4" y="15" width="4.6" height="1.8"/><rect x="13" y="6" width="4.6" height="1.8"/><rect x="13" y="9" width="4.6" height="1.8"/><rect x="13" y="12" width="4.6" height="1.8"/></g>`;
    case 'junction':
      return `<path d="M12 2 20 6.5v11L12 22 4 17.5v-11z" fill="none" stroke="currentColor" stroke-width="1.6"/><path d="M9 9l6 6M15 9l-6 6" stroke="currentColor" stroke-width="1.4"/>`;
    default:
      return '';
  }
}
