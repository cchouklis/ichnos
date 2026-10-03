import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ProjectStore } from '../../core/state/project-store.service';
import { ProjectApiService } from '../../core/services/project-api.service';
import { shoelaceArea } from '../../core/util/geometry.util';
import { Room } from '../../core/models';

@Component({
  selector: 'cp-project-tab',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './project-tab.component.html',
})
export class ProjectTabComponent {
  readonly store = inject(ProjectStore);
  readonly api = inject(ProjectApiService);

  saveError = '';
  loadError = '';

  constructor() {
    void this.api.ping();
  }

  roomArea(room: Room): number {
    const walls = room.wallIds.map((id) => this.store.walls().find((w) => w.id === id)).filter((w): w is NonNullable<typeof w> => !!w);
    return walls.length >= 3 ? shoelaceArea(walls.map((w) => ({ x: w.x1, y: w.y1 }))) : 0;
  }

  renameRoom(room: Room, label: string): void {
    this.store.renameRoom(room.id, label || room.label);
  }

  async save(): Promise<void> {
    this.saveError = '';
    try {
      const saved = await this.api.save(this.store.toProjectDto());
      this.store.serverId.set(saved.id);
    } catch {
      this.saveError = 'Save failed — is the backend running?';
    }
  }

  async loadLatest(): Promise<void> {
    this.loadError = '';
    try {
      const dto = await this.api.loadLatest();
      if (dto) {
        this.store.applyProjectDto(dto);
      } else {
        this.loadError = 'No saved projects yet.';
      }
    } catch {
      this.loadError = 'Load failed — is the backend running?';
    }
  }

  onUrlChange(url: string): void {
    this.api.baseUrl.set(url || this.api.baseUrl());
    void this.api.ping();
  }
}
