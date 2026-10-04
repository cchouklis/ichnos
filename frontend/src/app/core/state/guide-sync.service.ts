import { Injectable, effect, inject, untracked } from '@angular/core';
import type { Tool } from '../models';
import { STEP_FOR_TOOL } from '../data/step-tools.data';
import { EditorStore } from './editor.store';
import { LayoutStore } from './layout.store';

/**
 * Keeps the guide in step with the editing tool on touch layouts: on a tablet the docked panel follows the
 * tool, on a phone the sheet gets out of the way so the plan can be touched.
 */
@Injectable({ providedIn: 'root' })
export class GuideSyncService {
  private readonly editor = inject(EditorStore);
  private readonly layout = inject(LayoutStore);
  private started = false;

  constructor() {
    effect(() => {
      const tool = this.editor.tool();
      this.editor.armedType();
      untracked(() => this.follow(tool));
    });
  }

  private follow(tool: Tool): void {
    if (!this.started) {
      this.started = true;
      return;
    }
    const viewport = this.layout.viewport();
    if (viewport === 'phone') this.layout.closeGuide();
    else if (viewport === 'tablet' && this.layout.guideOpen()) {
      const step = STEP_FOR_TOOL[tool];
      if (step) this.layout.setStep(step);
    }
  }
}
