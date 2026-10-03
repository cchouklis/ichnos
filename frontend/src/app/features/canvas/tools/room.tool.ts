import { signal } from '@angular/core';
import type { Point } from '../../../core/models';
import type { Rect } from '../../../core/util/selection.util';
import { BaseTool, snapToGrid, type PointerInfo } from './canvas-tool';

/** Drag a rectangle to create four walls and a room. Right-click erases walls. */
export class RoomTool extends BaseTool {
  readonly id = 'room' as const;
  readonly kinds = ['wall'] as const;

  readonly draft = signal<Rect | null>(null);
  private start: Point | null = null;

  hint(): string {
    return this.start
      ? 'Release to create the room · Right-click or Esc: cancel'
      : 'Drag: draw a room (four walls) · Right-click a wall: delete';
  }

  primaryDown(p: PointerInfo): void {
    this.start = snapToGrid(p.plan);
    this.draft.set({ x1: this.start.x, y1: this.start.y, x2: this.start.x, y2: this.start.y });
  }

  override move(p: PointerInfo): void {
    if (!this.start) return;
    const m = snapToGrid(p.plan);
    this.draft.set({ x1: this.start.x, y1: this.start.y, x2: m.x, y2: m.y });
  }

  override primaryUp(p: PointerInfo): void {
    if (!this.start) return;
    const m = snapToGrid(p.plan);
    this.env.project.addQuickRoom(this.start.x, this.start.y, m.x, m.y);
    this.reset();
  }

  override secondaryDown(p: PointerInfo): void {
    if (this.start) {
      this.reset();
      return;
    }
    this.erase(p.hit);
  }

  override cancel(): boolean {
    if (!this.start) return false;
    this.reset();
    return true;
  }

  override reset(): void {
    this.start = null;
    this.draft.set(null);
  }
}
