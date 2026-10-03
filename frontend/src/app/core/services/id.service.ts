import { Injectable } from '@angular/core';

/**
 * Generates short, human-readable client-side ids (e.g. "comp_12").
 * The backend re-issues its own ids on save, so collision risk here is a
 * non-issue — these only need to be unique within one editing session.
 */
@Injectable({ providedIn: 'root' })
export class IdService {
  private counter = 0;

  next(prefix: string): string {
    this.counter += 1;
    return `${prefix}_${this.counter}`;
  }
}
