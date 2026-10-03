import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ProjectApiService } from '../../../core/services/project-api.service';
import { UnderlayService } from '../../../core/services/underlay.service';
import { ProjectStore } from '../../../core/state/project-store.service';

@Component({
  selector: 'cp-project-step',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="space-y-4">
      <label class="flex flex-col">
        <span class="mb-1 block text-[10.5px] uppercase tracking-wide text-base-content/70">Project name</span>
        <input
          type="text"
          maxlength="200"
          class="input input-sm w-full"
          [ngModel]="store.projectName()"
          (ngModelChange)="store.projectName.set($event)"
        />
      </label>

      <div class="grid grid-cols-2 gap-2">
        <div class="rounded-box border border-base-content/10 bg-base-200 p-2.5">
          <div class="font-mono text-lg font-semibold text-secondary">{{ store.components().length }}</div>
          <div class="text-[9.5px] uppercase tracking-wide text-base-content/70">Components</div>
        </div>
        <div class="rounded-box border border-base-content/10 bg-base-200 p-2.5">
          <div class="font-mono text-lg font-semibold text-secondary">{{ store.circuitCount() }}</div>
          <div class="text-[9.5px] uppercase tracking-wide text-base-content/70">Circuits</div>
        </div>
        <div class="rounded-box border border-base-content/10 bg-base-200 p-2.5">
          <div class="font-mono text-lg font-semibold text-secondary">{{ store.wallLengthMeters() | number: '1.1-1' }}m</div>
          <div class="text-[9.5px] uppercase tracking-wide text-base-content/70">Wall length</div>
        </div>
        <div class="rounded-box border border-base-content/10 bg-base-200 p-2.5">
          <div class="font-mono text-lg font-semibold text-secondary">{{ store.wireLengthMeters() | number: '1.1-1' }}m</div>
          <div class="text-[9.5px] uppercase tracking-wide text-base-content/70">Est. wire run</div>
        </div>
      </div>

      <div class="space-y-2 rounded-box border border-base-content/10 bg-base-200 p-3">
        <span class="block text-[10.5px] uppercase tracking-wide text-base-content/70">Blueprint underlay</span>
        <label class="btn btn-sm w-full">
          Upload image
          <input type="file" class="hidden" [accept]="underlay.accept" (change)="underlay.handleInput($event)" />
        </label>
        <p class="text-[11px] leading-relaxed text-base-content/70">PNG, JPEG or WebP, up to 5 MB.</p>
        @if (underlay.error(); as err) {
          <p class="text-[11px] text-error" role="alert">{{ err }}</p>
        }
        @if (store.bgImage()) {
          <label class="flex flex-col">
            <span class="mb-1 block text-[10.5px] uppercase tracking-wide text-base-content/70">Underlay opacity</span>
            <input
              type="range" min="0" max="1" step="0.05" class="range range-xs range-secondary"
              aria-label="Underlay opacity"
              [ngModel]="store.bgOpacity()"
              (ngModelChange)="store.setBackgroundOpacity(+$event)"
            />
          </label>
          <button type="button" class="btn btn-sm btn-ghost w-full" (click)="store.clearBackground()">Remove underlay</button>
        }
      </div>

      <div class="space-y-2.5 rounded-box border border-base-content/10 bg-base-200 p-3">
        <span class="block text-[10.5px] uppercase tracking-wide text-base-content/70">Backend</span>
        <input
          type="text"
          class="input input-sm w-full font-mono text-xs"
          placeholder="http://localhost:8080/api"
          aria-label="Backend API address"
          [ngModel]="api.baseUrl()"
          (ngModelChange)="onUrlChange($event)"
        />
        <div class="flex items-center gap-2">
          @switch (api.status()) {
            @case ('online') { <span class="badge badge-success badge-sm gap-1">● Connected</span> }
            @case ('offline') { <span class="badge badge-ghost badge-sm">Offline — using local mode</span> }
            @default { <span class="badge badge-ghost badge-sm">Checking…</span> }
          }
        </div>
        <div class="flex gap-2">
          <button type="button" class="btn btn-sm flex-1" (click)="save()">Save to server</button>
          <button type="button" class="btn btn-sm flex-1" (click)="loadLatest()">Load latest</button>
        </div>
        @if (saveError()) { <p class="text-[11px] text-error" role="alert">{{ saveError() }}</p> }
        @if (loadError()) { <p class="text-[11px] text-error" role="alert">{{ loadError() }}</p> }
        <p class="text-[11px] leading-relaxed text-base-content/70">
          Points at the companion Spring Boot + PostgreSQL API. Falls back to the export options in the Review step when offline.
        </p>
      </div>
    </div>
  `,
})
export class ProjectStepComponent {
  readonly store = inject(ProjectStore);
  readonly api = inject(ProjectApiService);
  readonly underlay = inject(UnderlayService);

  readonly saveError = signal('');
  readonly loadError = signal('');

  constructor() {
    void this.api.ping();
  }

  async save(): Promise<void> {
    this.saveError.set('');
    try {
      const saved = await this.api.save(this.store.toProjectDto());
      this.store.serverId.set(saved.id);
    } catch {
      this.saveError.set('Save failed — is the backend running?');
    }
  }

  async loadLatest(): Promise<void> {
    this.loadError.set('');
    try {
      const dto = await this.api.loadLatest();
      if (dto) {
        this.store.applyProjectDto(dto);
      } else {
        this.loadError.set('No saved projects yet.');
      }
    } catch {
      this.loadError.set('Load failed — is the backend running?');
    }
  }

  onUrlChange(url: string): void {
    this.api.baseUrl.set(url || this.api.baseUrl());
    void this.api.ping();
  }
}
