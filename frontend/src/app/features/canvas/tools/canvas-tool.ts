import type { ElementKind, ElementRef, Point, Tool } from '../../../core/models';
import { EditorStore } from '../../../core/state/editor.store';
import { ProjectStore } from '../../../core/state/project-store.service';
import { includesRef, refsOfKind } from '../../../core/util/selection.util';

/** What the canvas knows about a pointer event, already converted to plan coordinates (metres). */
export interface PointerInfo {
  plan: Point;
  /** The element under the pointer, if any (only set for press events). */
  hit: ElementRef | null;
  shift: boolean;
}

export interface ToolEnv {
  project: ProjectStore;
  editor: EditorStore;
}

/** Snaps to a 100 mm grid. */
export function snapToGrid(p: Point): Point {
  return { x: Math.round(p.x * 10) / 10, y: Math.round(p.y * 10) / 10 };
}

/**
 * Strategy interface: each editor tool decides what the primary press, secondary (erase) press,
 * move and release mean. The canvas only translates raw pointer events into these calls.
 */
export interface CanvasTool {
  readonly id: Tool;
  /** Element kinds this tool may erase and box-select. */
  readonly kinds: readonly ElementKind[];
  /** One-line instruction for the status hint; may read signals. */
  hint(): string;
  primaryDown(p: PointerInfo): void;
  move(p: PointerInfo): void;
  primaryUp(p: PointerInfo): void;
  /** Right-click, or a tap in the touch "erase" mode. */
  secondaryDown(p: PointerInfo): void;
  /** Enter / double-click: finish the thing in progress. */
  commit(): void;
  /** Esc: abandon the thing in progress. Returns true if there was something to abandon. */
  cancel(): boolean;
  /** A second finger landed: stop the current gesture cleanly without losing finished work. */
  interrupt(): void;
  /** The tool was deactivated: drop all transient state. */
  reset(): void;
}

export abstract class BaseTool implements CanvasTool {
  abstract readonly id: Tool;
  abstract readonly kinds: readonly ElementKind[];

  constructor(protected readonly env: ToolEnv) {}

  abstract hint(): string;
  abstract primaryDown(p: PointerInfo): void;

  move(_p: PointerInfo): void {}
  primaryUp(_p: PointerInfo): void {}
  commit(): void {}
  cancel(): boolean {
    return false;
  }
  interrupt(): void {
    this.reset();
  }
  reset(): void {}

  secondaryDown(p: PointerInfo): void {
    this.erase(p.hit);
  }

  /**
   * Deletes the element under the pointer. If it is part of the selection, every selected element
   * of the same kind goes with it, so one right-click clears a marquee selection.
   */
  protected erase(hit: ElementRef | null): boolean {
    if (!hit || !this.kinds.includes(hit.kind)) return false;
    const selection = this.env.editor.selection();
    const refs = includesRef(selection, hit) ? refsOfKind(selection, hit.kind) : [hit];
    this.env.project.deleteElements(refs);
    return true;
  }
}
