import { signal } from '@angular/core';
import type { Point } from '../../../core/models';
import { distance, snapDraftPoint } from '../../../core/util/geometry.util';
import { BaseTool, type PointerInfo } from './canvas-tool';

/** Click to add points of a wall chain; right-click removes the last point (or erases a wall when idle). */
export class WallTool extends BaseTool {
  readonly id = 'wall' as const;
  readonly kinds = ['wall'] as const;

  /** Points placed so far. */
  readonly draft = signal<Point[]>([]);
  /** Snapped cursor position, shown as the rubber-band end of the chain. */
  readonly ghost = signal<Point | null>(null);

  hint(): string {
    return this.draft().length
      ? 'Click: next point · Double-click or Enter: finish · Right-click: undo last point · Esc: cancel'
      : 'Click: start a wall · Right-click a wall: delete · Ctrl+drag: box-select walls';
  }

  primaryDown(p: PointerInfo): void {
    const draft = this.draft();
    const snapped = snapDraftPoint(p.plan, this.env.project.walls(), draft[0]);
    const last = draft[draft.length - 1];
    if (last && distance(last, snapped) < 1e-6) return;
    const next = [...draft, snapped];
    // Clicking back on the first point closes the loop and finishes the room.
    if (draft.length >= 3 && distance(draft[0], snapped) < 1e-6) {
      this.env.project.commitWallChain(next);
      this.reset();
      return;
    }
    this.draft.set(next);
  }

  override move(p: PointerInfo): void {
    const draft = this.draft();
    if (!draft.length) return;
    this.ghost.set(snapDraftPoint(p.plan, this.env.project.walls(), draft[0]));
  }

  override secondaryDown(p: PointerInfo): void {
    const draft = this.draft();
    if (draft.length) {
      if (draft.length === 1) this.reset();
      else this.draft.set(draft.slice(0, -1));
      return;
    }
    this.erase(p.hit);
  }

  override commit(): void {
    const draft = this.draft();
    if (draft.length >= 2) this.env.project.commitWallChain(draft);
    this.reset();
  }

  override cancel(): boolean {
    if (!this.draft().length) return false;
    this.reset();
    return true;
  }

  /** A pinch must not drop the points already placed. */
  override interrupt(): void {}

  override reset(): void {
    this.draft.set([]);
    this.ghost.set(null);
  }
}
