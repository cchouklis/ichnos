import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import type { Room } from '../../../core/models';
import { EditorStore } from '../../../core/state/editor.store';
import { LayoutStore } from '../../../core/state/layout.store';
import { ProjectStore } from '../../../core/state/project-store.service';
import { isRoomClosed, roomArea } from '../../../core/util/sheet.util';

interface RoomRow {
  room: Room;
  area: number;
  closed: boolean;
  wallCount: number;
  componentCount: number;
}

@Component({
  selector: 'cp-rooms-step',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="space-y-3">
      <p class="text-[11.5px] leading-relaxed text-base-content/70">
        Every room has its own sheet to work on it alone. The master plan shows the whole house.
      </p>

      <ul class="space-y-1.5" aria-label="Plan sheets">
        <li>
          <button
            type="button"
            class="flex w-full items-center gap-2 rounded-box border px-2.5 py-2 text-left text-sm transition-colors hover:border-secondary"
            [class.border-secondary]="editor.activeSheet() === null"
            [class.bg-base-200]="editor.activeSheet() === null"
            [class.border-base-content/10]="editor.activeSheet() !== null"
            [attr.aria-current]="editor.activeSheet() === null ? 'page' : null"
            (click)="openSheet(null)"
          >
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M3 10.5 12 3l9 7.5V21H3z"/></svg>
            <span class="flex-1 font-semibold">Master plan</span>
            <span class="text-[11px] text-base-content/70">{{ rows().length }} rooms</span>
          </button>
        </li>

        @for (row of rows(); track row.room.id) {
          <li class="flex items-center gap-1">
            @if (editingId() === row.room.id) {
              <input
                type="text"
                maxlength="120"
                class="input input-sm flex-1"
                [attr.aria-label]="'Name of ' + row.room.label"
                [value]="row.room.label"
                (change)="rename(row.room, $any($event.target).value)"
                (keydown.enter)="$any($event.target).blur()"
                (blur)="editingId.set(null)"
              />
            } @else {
              <button
                type="button"
                class="flex min-w-0 flex-1 items-center gap-2 rounded-box border px-2.5 py-2 text-left text-sm transition-colors hover:border-secondary"
                [class.border-secondary]="editor.activeSheet() === row.room.id"
                [class.bg-base-200]="editor.activeSheet() === row.room.id"
                [class.border-base-content/10]="editor.activeSheet() !== row.room.id"
                [attr.aria-current]="editor.activeSheet() === row.room.id ? 'page' : null"
                (click)="openSheet(row.room.id)"
              >
                <span class="min-w-0 flex-1">
                  <span class="block truncate font-semibold">{{ row.room.label }}</span>
                  <span class="block text-[11px] text-base-content/70">
                    {{ row.wallCount }} walls · {{ row.componentCount }} components
                    @if (row.closed) { · {{ row.area | number: '1.1-1' }} m² } @else { · open }
                  </span>
                </span>
                @if (!row.closed) {
                  <span class="badge badge-warning badge-sm" title="Draw the remaining walls to close the room">open</span>
                }
              </button>
            }
            <button
              type="button"
              class="btn btn-square btn-ghost btn-sm"
              [attr.aria-label]="'Rename ' + row.room.label"
              title="Rename"
              (click)="editingId.set(row.room.id)"
            >
              <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z"/></svg>
            </button>
            <button
              type="button"
              class="btn btn-square btn-ghost btn-sm hover:text-error"
              [attr.aria-label]="'Delete ' + row.room.label"
              title="Delete room"
              (click)="pendingDelete.set(row.room)"
            >
              <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m3 0-1 14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2L4 6"/></svg>
            </button>
          </li>
        }
      </ul>

      @if (pendingDelete(); as room) {
        <div class="alert alert-warning flex-col items-stretch gap-2 text-xs" role="alertdialog" [attr.aria-label]="'Delete ' + room.label">
          <span>Delete <strong>{{ room.label }}</strong>? Choose what happens to its walls and components.</span>
          <div class="flex flex-wrap gap-1.5">
            <button type="button" class="btn btn-xs" (click)="confirmDelete(true)">Keep them in the master plan</button>
            <button type="button" class="btn btn-xs btn-error" (click)="confirmDelete(false)">Delete them too</button>
            <button type="button" class="btn btn-xs btn-ghost" (click)="pendingDelete.set(null)">Cancel</button>
          </div>
        </div>
      }

      <button type="button" class="btn btn-sm btn-primary w-full" (click)="addRoom()">Add room</button>

      <div class="rounded-box border border-dashed border-base-content/20 bg-base-200 p-2.5 text-[11px] leading-relaxed text-base-content/70">
        Open a room, then draw its walls and place its components there. In the master plan, a closed wall loop or the Quick room tool creates a room automatically.
      </div>
      <button
        type="button"
        class="btn btn-sm w-full"
        [class.btn-primary]="editor.tool() === 'room'"
        (click)="editor.setTool('room')"
      >Quick room: drag a rectangle on the plan</button>
    </div>
  `,
})
export class RoomsStepComponent {
  readonly store = inject(ProjectStore);
  readonly editor = inject(EditorStore);
  private readonly layout = inject(LayoutStore);

  readonly editingId = signal<string | null>(null);
  readonly pendingDelete = signal<Room | null>(null);

  readonly rows = computed<RoomRow[]>(() => {
    const walls = this.store.walls();
    const components = this.store.components();
    return this.store.rooms().map((room) => ({
      room,
      area: roomArea(room, walls),
      closed: isRoomClosed(room, walls),
      wallCount: room.wallIds.length,
      componentCount: components.filter((c) => c.roomId === room.id).length,
    }));
  });

  openSheet(id: string | null): void {
    this.editor.setSheet(id);
    this.layout.closeOverlay();
  }

  addRoom(): void {
    const id = this.store.addRoom();
    this.editor.setSheet(id);
    this.editor.setTool('wall');
    this.editingId.set(id);
  }

  rename(room: Room, label: string): void {
    const clean = label.trim();
    if (clean) this.store.renameRoom(room.id, clean);
  }

  confirmDelete(keepContents: boolean): void {
    const room = this.pendingDelete();
    if (room) this.store.deleteRoom(room.id, keepContents);
    this.pendingDelete.set(null);
  }
}
