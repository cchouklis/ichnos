import { signal } from '@angular/core';
import { typeById } from '../../../core/data/component-types.data';
import type { Point } from '../../../core/models';
import { findWallSnap } from '../../../core/util/geometry.util';
import { BaseTool, type PointerInfo } from './canvas-tool';

/** Places the armed component type on every click (sticky). Right-click erases components. Esc disarms. */
export class ComponentTool extends BaseTool {
  readonly id = 'component' as const;
  readonly kinds = ['component'] as const;

  /** Where the next component would land (wall-snapped), shown as a ghost. */
  readonly ghost = signal<Point | null>(null);

  hint(): string {
    const armed = this.env.editor.armedType();
    return armed
      ? `Click: place ${typeById(armed).label} (snaps to walls) · Right-click a component: delete · Esc: stop placing`
      : 'Pick a component in the project guide (step 4), then click the plan to place it';
  }

  primaryDown(p: PointerInfo): void {
    const armed = this.env.editor.armedType();
    if (!armed) return;
    const { editor, project } = this.env;
    project.addComponentAt(armed, p.plan.x, p.plan.y, {
      circuit: editor.placeCircuit(),
      mountHeightMm: editor.placeMountHeightMm(),
      rotDeg: editor.placeRotDeg(),
    });
  }

  override move(p: PointerInfo): void {
    if (!this.env.editor.armedType()) return;
    const snap = findWallSnap(p.plan, this.env.project.walls());
    this.ghost.set(snap ? { x: snap.x, y: snap.y } : p.plan);
  }

  override cancel(): boolean {
    if (!this.env.editor.armedType()) return false;
    this.env.editor.setTool('select');
    return true;
  }

  override reset(): void {
    this.ghost.set(null);
  }
}
