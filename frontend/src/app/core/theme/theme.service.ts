import { DOCUMENT } from '@angular/common';
import { DestroyRef, Injectable, computed, effect, inject, signal } from '@angular/core';
import {
  EffectiveTheme,
  THEME_STORAGE_KEY,
  ThemeMode,
  parseThemeMode,
  resolveTheme,
  themedColor,
} from './theme.util';

const DARK_QUERY = '(prefers-color-scheme: dark)';

/**
 * Owns the colour theme: the user's choice (light, dark or follow the device), the theme
 * actually in effect, and the `data-theme` attribute daisyUI reads. The pre-bootstrap script
 * in `assets/theme-init.js` applies the same choice before first paint, so there is no flash.
 */
@Injectable({ providedIn: 'root' })
export class ThemeService {
  private readonly doc = inject(DOCUMENT);

  readonly mode = signal<ThemeMode>(this.readStoredMode());
  private readonly prefersDark = signal(false);

  readonly effective = computed<EffectiveTheme>(() => resolveTheme(this.mode(), this.prefersDark()));
  readonly isDark = computed(() => this.effective() === 'ichnos-dark');

  constructor() {
    const query = this.doc.defaultView?.matchMedia?.(DARK_QUERY);
    if (query) {
      this.prefersDark.set(query.matches);
      const onChange = (e: MediaQueryListEvent): void => this.prefersDark.set(e.matches);
      query.addEventListener('change', onChange);
      inject(DestroyRef).onDestroy(() => query.removeEventListener('change', onChange));
    }

    effect(() => {
      this.doc.documentElement.setAttribute('data-theme', this.effective());
    });
  }

  setMode(mode: ThemeMode): void {
    this.mode.set(mode);
    try {
      this.doc.defaultView?.localStorage.setItem(THEME_STORAGE_KEY, mode);
    } catch {
      // Storage can be blocked (private windows, site settings); the choice then lasts for this session only.
    }
  }

  /** Maps a catalogue colour to the variant that reads well on the current theme's canvas. */
  tint(hex: string): string {
    return themedColor(hex, this.effective());
  }

  private readStoredMode(): ThemeMode {
    try {
      return parseThemeMode(this.doc.defaultView?.localStorage.getItem(THEME_STORAGE_KEY));
    } catch {
      return 'system';
    }
  }
}
