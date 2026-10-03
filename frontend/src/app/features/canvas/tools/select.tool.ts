import type { Point } from '../../../core/models';
import { findWallSnap } from '../../../core/util/geometry.util';
import { ALL_KINDS, includesRef, toggleRef } from '../../../core/util/selection.util';
import { BaseTool, type PointerInfo } from './canvas-tool';

interface ComponentDrag {
  ids: string[];
  origins: Map<string, Point>;
  start: Point;
  preSnapshot: string;
  moved: boolean;
}

/** Click selects (Shift adds), drag moves selected components, empty drag box-selects (handled by the canvas). */
export class SelectTool extends BaseTool {
  readonly id = 'select' as const;
  readonly kinds = ALL_KINDS;

  private drag: ComponentDrag | null = null;

  hint(): string {
    return 'Click: select · Shift+click: add · Drag a component: move · Drag empty space or Ctrl+drag: box-select · Right-click: delete · Del: delete selection';
  }

  primaryDown(p: PointerInfo): void {
    const { editor, project } = this.env;
    const hit = p.hit;
    if (!hit) return;
    if (p.shift) {
      editor.setSelection(toggleRef(editor.selection(), hit));
      return;
    }
    if (!includesRef(editor.selection(), hit)) editor.setSelection([hit]);
    if (hit.kind === 'component') {
      const ids = editor.selectedComponentIds();
      const origins = new Map<string, Point>();
      for (const c of project.components()) {
        if (ids.includes(c.id)) origins.set(c.id, { x: c.x, y: c.y });
      }
      this.drag = { ids, origins, start: p.plan, preSnapshot: project.captureSnapshot(), moved: false };
    }
  }

  override move(p: PointerInfo): void {
    const drag = this.drag;
    if (!drag) return;
    const { project } = this.env;
    drag.moved = true;
    if (drag.ids.length === 1) {
      const snap = findWallSnap(p.plan, project.walls());
      project.moveComponentLive(drag.ids[0], snap?.x ?? p.plan.x, snap?.y ?? p.plan.y, snap?.rotDeg);
      return;
    }
    const dx = p.plan.x - drag.start.x;
    const dy = p.plan.y - drag.start.y;
    const next = new Map<string, Point>();
    for (const [id, o] of drag.origins) next.set(id, { x: o.x + dx, y: o.y + dy });
    project.setComponentPositionsLive(next);
  }

  override primaryUp(_p: PointerInfo): void {
    this.finishDrag();
  }

  override interrupt(): void {
    this.finishDrag();
  }

  override reset(): void {
    this.finishDrag();
  }

  private finishDrag(): void {
    const drag = this.drag;
    this.drag = null;
    if (drag?.moved) this.env.project.commitComponentDrag(drag.ids, drag.preSnapshot);
  }
}
