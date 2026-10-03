import { Injectable, Signal, computed, inject } from '@angular/core';
import { ComplianceIssue } from '../models';
import { typeById } from '../data/component-types.data';
import { ProjectStore } from '../state/project-store.service';
import { distance } from '../util/geometry.util';

const MAX_OUTLET_GAP_M = 3.6; // approximates the "no point along a wall more than 6ft from an outlet" guideline
const DEFAULT_BREAKER_A = 20;
const LOAD_WARNING_RATIO = 0.8; // NEC-style 80% continuous-load guidance

/**
 * Simplified heuristics for a quick sanity check — NOT a substitute for a local code review.
 * Derived entirely as a computed signal, so it recalculates automatically whenever the
 * document changes and never needs to be manually invalidated.
 */
@Injectable({ providedIn: 'root' })
export class ComplianceService {
  private readonly store = inject(ProjectStore);

  readonly issues: Signal<ComplianceIssue[]> = computed(() => {
    const issues: ComplianceIssue[] = [];
    const walls = this.store.walls();
    const rooms = this.store.rooms();
    const components = this.store.components();
    const wires = this.store.wires();

    // (a) outlet spacing per room wall
    for (const room of rooms) {
      const roomWalls = room.wallIds.map((id) => walls.find((w) => w.id === id)).filter((w): w is NonNullable<typeof w> => !!w);
      for (const w of roomWalls) {
        const len = distance({x: w.x1, y:w.y1}, { x: w.x2, y: w.y2 });
        if (len < 0.4) continue;
        const ux = (w.x2 - w.x1) / len;
        const uy = (w.y2 - w.y1) / len;
        const positions = components
          .filter((c) => c.type.startsWith('outlet') && distance(c, { x: w.x2, y: w.y2 }) + distance(c, { x: w.x2, y: w.y2 }) <= len + 0.3)
          .map((c) => (c.x - w.x1) * ux + (c.y - w.y1) * uy)
          .sort((a, b) => a - b);
        const marks = [0, ...positions, len];
        for (let i = 0; i < marks.length - 1; i++) {
          const gap = marks[i + 1] - marks[i];
          if (gap > MAX_OUTLET_GAP_M) {
            issues.push({
              severity: 'warn',
              message: `${room.label}: ${gap.toFixed(1)}m gap along a wall exceeds the ${MAX_OUTLET_GAP_M}m outlet-spacing guideline`,
              focus: { type: 'wall', id: w.id },
            });
          }
        }
      }
    }

    // (b) circuit load vs. an assumed breaker rating
    const circuitAmps = new Map<number, number>();
    for (const c of components) {
      const t = typeById(c.type);
      circuitAmps.set(c.circuit, (circuitAmps.get(c.circuit) ?? 0) + t.amps);
    }
    for (const [circuit, load] of circuitAmps) {
      const breaker = DEFAULT_BREAKER_A;
      if (load > breaker * LOAD_WARNING_RATIO) {
        issues.push({
          severity: load > breaker ? 'error' : 'warn',
          message: `Circuit ${circuit}: connected load ${load}A ${load > breaker ? 'exceeds' : 'is within 80% of'} the assumed ${breaker}A breaker`,
          focus: { type: 'circuit', id: circuit },
        });
      }
    }

    // (c) devices with no wiring at all — likely forgotten during rough-in
    for (const c of components) {
      if (c.type === 'panel') continue;
      const wired = wires.some((w) => w.a === c.id || w.b === c.id);
      if (!wired) {
        issues.push({ severity: 'warn', message: `${c.label} has no wiring connected`, focus: { type: 'component', id: c.id } });
      }
    }

    return issues;
  });
}
