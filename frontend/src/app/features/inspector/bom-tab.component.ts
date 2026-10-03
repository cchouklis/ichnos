import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { ProjectStore } from '../../core/state/project-store.service';
import { typeById } from '../../core/data/component-types.data';
import { ComponentType } from '../../core/models';
import { ThemeService } from '../../core/theme/theme.service';

interface BomRow {
  type: ComponentType;
  qty: number;
}

@Component({
  selector: 'cp-bom-tab',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule],
  template: `
    <table class="table table-sm">
      <thead>
        <tr class="text-[9.5px] uppercase tracking-wide text-base-content/70">
          <th>Component</th>
          <th>Qty</th>
          <th>Rating</th>
        </tr>
      </thead>
      <tbody>
        @for (row of rows(); track row.type.id) {
          <tr>
            <td>
              <span class="flex items-center gap-2">
                <span class="h-3 w-3 rounded" [style.background]="theme.tint(row.type.color)"></span>
                {{ row.type.label }}
              </span>
            </td>
            <td>{{ row.qty }}</td>
            <td class="text-base-content/70">{{ row.type.volts }}V / {{ row.type.amps }}A</td>
          </tr>
        } @empty {
          <tr>
            <td colspan="3" class="text-center text-base-content/70 py-6">No components placed yet</td>
          </tr>
        }
      </tbody>
    </table>

    <div class="mt-3 flex items-center justify-between rounded-box border border-base-content/10 bg-base-200 p-2.5 text-sm">
      <span>Total devices</span>
      <b class="font-mono text-secondary">{{ store.components().length }}</b>
    </div>
    <div class="mt-2 flex items-center justify-between rounded-box border border-base-content/10 bg-base-200 p-2.5 text-sm">
      <span>Circuits used</span>
      <b class="font-mono text-secondary">{{ store.circuitCount() }}</b>
    </div>
  `,
})
export class BomTabComponent {
  readonly store = inject(ProjectStore);
  readonly theme = inject(ThemeService);

  readonly rows = computed<BomRow[]>(() => {
    const counts = new Map<string, number>();
    for (const c of this.store.components()) {
      counts.set(c.type, (counts.get(c.type) ?? 0) + 1);
    }
    return Array.from(counts.entries()).map(([typeId, qty]) => ({ type: typeById(typeId), qty }));
  });
}
