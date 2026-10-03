import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Room } from '../../../core/models';
import { ProjectStore } from '../../../core/state/project-store.service';
import { shoelaceArea } from '../../../core/util/geometry.util';

@Component({
  selector: 'cp-rooms-step',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="space-y-3">
      <span class="block text-[10.5px] uppercase tracking-wide text-base-content/70">
        Rooms ({{ store.rooms().length }})
      </span>
      @if (store.rooms().length) {
        <div class="space-y-1.5">
          @for (room of store.rooms(); track room.id) {
            <div class="flex items-center gap-1.5">
              <input
                type="text"
                maxlength="120"
                class="input input-sm flex-1"
                [attr.aria-label]="'Name of ' + room.label"
                [ngModel]="room.label"
                (ngModelChange)="renameRoom(room, $event)"
              />
              <span class="badge badge-ghost font-mono">{{ roomArea(room) | number: '1.1-1' }}m²</span>
              <button
                type="button"
                class="btn btn-square btn-ghost btn-sm text-base-content/70 hover:text-error"
                title="Remove room fill (keeps walls)"
                [attr.aria-label]="'Remove fill of ' + room.label + ' (keeps walls)'"
                (click)="store.removeRoomFill(room.id)"
              >
                <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M18 6 6 18M6 6l12 12"/></svg>
              </button>
            </div>
          }
        </div>
      } @else {
        <div class="rounded-box border border-dashed border-base-content/20 bg-base-200 p-2.5 text-[11px] text-base-content/70">
          No closed rooms yet. Draw a wall loop back to its start, or use the Quick Room tool.
        </div>
      }
      <button
        type="button"
        class="btn btn-sm w-full"
        [class.btn-primary]="store.tool() === 'room'"
        (click)="store.setTool('room')"
      >Quick room: drag a rectangle on the plan</button>
    </div>
  `,
})
export class RoomsStepComponent {
  readonly store = inject(ProjectStore);

  roomArea(room: Room): number {
    const walls = room.wallIds
      .map((id) => this.store.walls().find((w) => w.id === id))
      .filter((w): w is NonNullable<typeof w> => !!w);
    return walls.length >= 3 ? shoelaceArea(walls.map((w) => ({ x: w.x1, y: w.y1 }))) : 0;
  }

  renameRoom(room: Room, label: string): void {
    this.store.renameRoom(room.id, label || room.label);
  }
}
