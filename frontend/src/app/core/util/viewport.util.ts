export type ViewportClass = 'phone' | 'tablet' | 'desktop';

export const TABLET_MIN_WIDTH = 640;
export const DESKTOP_MIN_WIDTH = 1024;

export interface ViewportMatches {
  readonly tablet: boolean;
  readonly desktop: boolean;
  /** The primary pointer is a finger: wide touch screens (large tablets) still get the tablet layout. */
  readonly coarsePointer: boolean;
}

export function viewportClassFor({ tablet, desktop, coarsePointer }: ViewportMatches): ViewportClass {
  if (desktop && !coarsePointer) return 'desktop';
  return tablet ? 'tablet' : 'phone';
}
