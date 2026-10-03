import { Injectable, signal } from '@angular/core';
import { Point } from '../models';

@Injectable({ providedIn: 'root' })
export class DragDropService {
  readonly draggingTypeId = signal<string | null>(null);
  readonly pointerPosition = signal<Point>({ x: 0, y: 0 });

  start(typeId: string, x: number, y: number): void {
    this.draggingTypeId.set(typeId);
    this.pointerPosition.set({ x, y });
  }

  move(x: number, y: number): void {
    if (this.draggingTypeId()) {
      this.pointerPosition.set({ x, y });
    }
  }

  end(): void {
    this.draggingTypeId.set(null);
  }
}
