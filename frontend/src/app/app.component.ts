import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, HostListener, computed, effect, inject, signal } from '@angular/core';
import { Title } from '@angular/platform-browser';
import { EditorStore } from './core/state/editor.store';
import { LayoutStore } from './core/state/layout.store';
import { ProjectStore } from './core/state/project-store.service';
import { ComplianceService } from './core/services/compliance.service';
import { ExportService } from './core/services/export.service';
import { UnderlayService } from './core/services/underlay.service';
import { TopbarComponent } from './features/topbar/topbar.component';
import { CanvasComponent } from './features/canvas/canvas.component';
import { Viewer3dComponent } from './features/viewer3d/viewer3d.component';
import { DrawerComponent } from './features/drawer/drawer.component';
import { ThemeSwitchComponent } from './features/theme-switch/theme-switch.component';

type MobileSheet = 'menu' | null;

@Component({
  selector: 'cp-root',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, TopbarComponent, CanvasComponent, Viewer3dComponent, DrawerComponent, ThemeSwitchComponent],
  templateUrl: './app.component.html',
})
export class AppComponent {
  readonly store = inject(ProjectStore);
  readonly layout = inject(LayoutStore);
  readonly editor = inject(EditorStore);
  readonly compliance = inject(ComplianceService);
  readonly exportSvc = inject(ExportService);
  readonly underlay = inject(UnderlayService);
  private readonly title = inject(Title);

  readonly sheet = signal<MobileSheet>(null);

  /** The drawer is pinned beside the editor on desktop and an overlay below it (daisyUI's `drawer-open` pattern). */
  readonly layoutClass = computed(() => (this.layout.pinned() ? 'drawer lg:drawer-open' : 'drawer'));

  constructor() {
    effect(() => {
      const name = this.store.projectName().trim();
      this.title.setTitle(name ? `${name} — Ichnos` : 'Ichnos — Electrical Blueprint Designer');
    });
  }

  @HostListener('window:keydown.escape')
  onEscape(): void {
    this.layout.closeOverlay();
  }

  openSheet(s: MobileSheet): void {
    this.sheet.set(s);
  }

  closeSheet(): void {
    this.sheet.set(null);
  }

  onOverlayToggle(event: Event): void {
    this.layout.setOverlayOpen((event.target as HTMLInputElement).checked);
  }

  sheetLabel(): string {
    const id = this.editor.activeSheet();
    return this.store.rooms().find((r) => r.id === id)?.label ?? 'Master plan';
  }

  toolLabel(): string {
    const labels: Record<string, string> = { select: 'Select', wall: 'Draw Wall', room: 'Quick Room', wire: 'Wire', component: 'Place Component' };
    return labels[this.editor.tool()] ?? this.editor.tool();
  }
}
