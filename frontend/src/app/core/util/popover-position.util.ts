export type PopoverSide = 'top' | 'bottom' | 'left' | 'right';

export interface Box {
  readonly left: number;
  readonly top: number;
  readonly width: number;
  readonly height: number;
}

export interface Size {
  readonly width: number;
  readonly height: number;
}

const OPPOSITE: Record<PopoverSide, PopoverSide> = { top: 'bottom', bottom: 'top', left: 'right', right: 'left' };

function origin(anchor: Box, size: Size, side: PopoverSide, gap: number): { left: number; top: number } {
  switch (side) {
    case 'top':
      return { left: anchor.left + anchor.width / 2 - size.width / 2, top: anchor.top - size.height - gap };
    case 'bottom':
      return { left: anchor.left + anchor.width / 2 - size.width / 2, top: anchor.top + anchor.height + gap };
    case 'left':
      return { left: anchor.left - size.width - gap, top: anchor.top + anchor.height / 2 - size.height / 2 };
    case 'right':
      return { left: anchor.left + anchor.width + gap, top: anchor.top + anchor.height / 2 - size.height / 2 };
  }
}

function overflows(pos: { left: number; top: number }, size: Size, viewport: Size, margin: number): boolean {
  return pos.left < margin || pos.top < margin || pos.left + size.width > viewport.width - margin || pos.top + size.height > viewport.height - margin;
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(value, Math.max(min, max)));
}

/** Places a popover next to its anchor on the preferred side, flips to the opposite side when it does not fit, and always keeps it inside the viewport. */
export function computePopoverPosition(anchor: Box, size: Size, viewport: Size, side: PopoverSide, gap = 6, margin = 8): { left: number; top: number } {
  const preferred = origin(anchor, size, side, gap);
  const chosen = overflows(preferred, size, viewport, margin) ? origin(anchor, size, OPPOSITE[side], gap) : preferred;
  const fallback = overflows(chosen, size, viewport, margin) && !overflows(preferred, size, viewport, margin) ? preferred : chosen;
  return {
    left: clamp(fallback.left, margin, viewport.width - size.width - margin),
    top: clamp(fallback.top, margin, viewport.height - size.height - margin),
  };
}
