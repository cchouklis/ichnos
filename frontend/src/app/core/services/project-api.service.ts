import { HttpClient } from '@angular/common/http';
import { Injectable, inject, signal } from '@angular/core';
import { firstValueFrom, timeout } from 'rxjs';
import { ProjectWire, fromWire, toWire } from './project-api.adapter';
import { BackendStatus, ProjectDto, ProjectSummaryDto } from '../models';

@Injectable({ providedIn: 'root' })
export class ProjectApiService {
  private readonly http = inject(HttpClient);

  readonly baseUrl = signal('http://localhost:8080/api');
  readonly status = signal<BackendStatus>('checking');

  private url(path: string): string {
    return `${this.baseUrl().replace(/\/$/, '')}${path}`;
  }

  async ping(): Promise<void> {
    this.status.set('checking');
    try {
      await firstValueFrom(this.http.get(this.url('/health')).pipe(timeout(2500)));
      this.status.set('online');
    } catch {
      this.status.set('offline');
    }
  }

  async list(): Promise<ProjectSummaryDto[]> {
    return firstValueFrom(this.http.get<ProjectSummaryDto[]>(this.url('/projects')));
  }

  async get(id: string): Promise<ProjectDto> {
    return fromWire(await firstValueFrom(this.http.get<ProjectWire>(this.url(`/projects/${id}`))));
  }

  async create(dto: ProjectDto): Promise<ProjectDto> {
    return fromWire(await firstValueFrom(this.http.post<ProjectWire>(this.url('/projects'), toWire(dto))));
  }

  async update(id: string, dto: ProjectDto): Promise<ProjectDto> {
    return fromWire(await firstValueFrom(this.http.put<ProjectWire>(this.url(`/projects/${id}`), toWire(dto))));
  }

  /** Saves — creates on first save, updates thereafter, based on whether the dto already carries a server id. */
  async save(dto: ProjectDto): Promise<ProjectDto> {
    const saved = dto.id ? await this.update(dto.id, dto) : await this.create(dto);
    this.status.set('online');
    return saved;
  }

  async loadLatest(): Promise<ProjectDto | null> {
    const list = await this.list();
    if (!list.length) return null;
    this.status.set('online');
    return this.get(list[0].id);
  }
}
