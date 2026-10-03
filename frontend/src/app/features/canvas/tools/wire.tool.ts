import { computed, signal } from '@angular/core';
import type { Point } from '../../../core/models';
import { BaseTool, type PointerInfo } from './canvas-tool';

/** Click a component, then another one, to connect them. Right-click erases wires. */
export class WireTool extends BaseTool {
  readonly id = 'wire' as const;
  readonly kinds = ['wire'] as const;

  readonly fromId = signal<string | null>(null);
  private readonly cursor = signal<Point | null>(null);

  /** Rubber-band line from the first component to the cursor. */
  readonly draftLine = computed<{ from: Point; to: Point } | null>(() => {
    const id = this.fromId();
    const to = this.cursor();
    if (!id || !to) return null;
    const a = this.env.project.components().find((c) => c.id === id);
    return a ? { from: { x: a.x, y: a.y }, to } : null;
  });

  hint(): string {
    return this.fromId()
      ? 'Click a second component to connect · Right-click or Esc: cancel'
      : 'Click a component to start a wire · Right-click a wire: delete · Ctrl+drag: box-select wires';
  }

  primaryDown(p: PointerInfo): void {
    const hit = p.hit;
    if (hit?.kind !== 'component') return;
    const from = this.fromId();
    if (!from) {
      this.fromId.set(hit.id);
      return;
    }
    if (from !== hit.id) {
      this.env.project.addWire(from, hit.id, this.env.editor.wireCircuit());
      this.reset();
    }
  }

  override move(p: PointerInfo): void {
    if (this.fromId()) this.cursor.set(p.plan);
  }

  override secondaryDown(p: PointerInfo): void {
    if (this.fromId()) {
      this.reset();
      return;
    }
    this.erase(p.hit);
  }

  override cancel(): boolean {
    if (!this.fromId()) return false;
    this.reset();
    return true;
  }

  override interrupt(): void {}

  override reset(): void {
    this.fromId.set(null);
    this.cursor.set(null);
  }
}
