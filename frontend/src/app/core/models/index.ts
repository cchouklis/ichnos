export interface Wall {
  id: string;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  /** Wall thickness in millimetres. */
  thicknessMm: number;
  /** Wall height in millimetres. */
  heightMm: number;
}

export interface Room {
  id: string;
  label: string;
  /** Ordered wall ids forming the closed loop. */
  wallIds: string[];
}

export interface ComponentInstance {
  id: string;
  /** References a ComponentType.id from the catalog. */
  type: string;
  x: number;
  y: number;
  rot: number;
  circuit: number;
  label: string;
  notes: string;
  /** Room this component belongs to; null/undefined = only in the master plan. Undefined also means "not derived yet" for data loaded from older saves. */
  roomId?: string | null;
  /** Override for the type's default mount height, in millimetres. */
  mountHeightMm?: number;
}

export interface Wire {
  id: string;
  /** Component ids this wire connects. */
  a: string;
  b: string;
  circuit: number;
}

export type ComponentCategory = 'outlets' | 'switches' | 'lighting' | 'distribution' | 'boxes';

export interface ComponentType {
  id: string;
  cat: ComponentCategory;
  label: string;
  color: string;
  /** Default mount height in millimetres. */
  mountHeightMm: number;
  icon: string;
  volts: number;
  amps: number;
}

export type Tool = 'select' | 'wall' | 'room' | 'wire' | 'component';

export type ElementKind = 'wall' | 'component' | 'wire';

/** Typed reference to a document element. */
export interface ElementRef {
  kind: ElementKind;
  id: string;
}
export type ViewMode = '2d' | '3d';

/** Full-document payload — matches ProjectDto on the backend. */
export interface ProjectDto {
  id: string | null;
  name: string;
  scalePxPerMeter: number;
  walls: Wall[];
  rooms: Room[];
  components: ComponentInstance[];
  wires: Wire[];
}

/** Matches ProjectSummaryDto on the backend. */
export interface ProjectSummaryDto {
  id: string;
  name: string;
  componentCount: number;
  wallCount: number;
  updatedAt: string;
}

export type IssueSeverity = 'warn' | 'error';

export interface ComplianceIssue {
  severity: IssueSeverity;
  message: string;
  focus: { type: 'wall' | 'circuit' | 'component'; id: string | number };
}

export interface Point {
  x: number;
  y: number;
}

export type BackendStatus = 'checking' | 'online' | 'offline';
