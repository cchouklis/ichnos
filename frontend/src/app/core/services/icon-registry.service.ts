import { Injectable, inject } from '@angular/core';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { COMPONENT_TYPES, svgIcon } from '../data/component-types.data';

@Injectable({ providedIn: 'root' })
export class IconRegistryService {
  private readonly sanitizer = inject(DomSanitizer);
  private readonly cache = new Map<string, SafeHtml>();

  constructor() {
    // The icon set is a fixed, trusted, build-time constant (never user input),
    // so bypassing sanitization here is safe and done exactly once per icon.
    for (const t of COMPONENT_TYPES) {
      if (!this.cache.has(t.icon)) {
        this.cache.set(t.icon, this.sanitizer.bypassSecurityTrustHtml(svgIcon(t.icon)));
      }
    }
  }

  html(iconKey: string): SafeHtml {
    return this.cache.get(iconKey) ?? '';
  }
}
