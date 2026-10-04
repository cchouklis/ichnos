import { ChangeDetectionStrategy, Component, effect, inject } from '@angular/core';
import { Title } from '@angular/platform-browser';
import { EditorStore } from './core/state/editor.store';
import { SimulationService } from './core/simulation/simulation.service';
import { GuideSyncService } from './core/state/guide-sync.service';
import { LayoutStore } from './core/state/layout.store';
import { ProjectStore } from './core/state/project-store.service';
import { TopbarComponent } from './features/topbar/topbar.component';
import { CanvasComponent } from './features/canvas/canvas.component';
import { Viewer3dComponent } from './features/viewer3d/viewer3d.component';
import { DrawerComponent } from './features/drawer/drawer.component';
import { DrawerRailComponent } from './features/drawer/drawer-rail.component';
import { GuidePanelComponent } from './features/drawer/guide-panel.component';
import { EditToolbarComponent } from './features/editing/edit-toolbar.component';
import { BottomNavComponent } from './features/navigation/bottom-nav.component';
import { MenuActionsComponent } from './features/navigation/menu-actions.component';
import { SimulationPanelComponent } from './features/simulation/simulation-panel.component';
import { ToolPanelComponent } from './features/tool-panel/tool-panel.component';
import { BottomSheetComponent } from './features/ui/bottom-sheet.component';

const TOOL_LABELS: Record<string, string> = { select: 'Select', wall: 'Draw Wall', room: 'Quick Room', wire: 'Wire', component: 'Place Component' };

@Component({
  selector: 'cp-root',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    TopbarComponent,
    CanvasComponent,
    Viewer3dComponent,
    DrawerComponent,
    DrawerRailComponent,
    GuidePanelComponent,
    EditToolbarComponent,
    BottomNavComponent,
    MenuActionsComponent,
    BottomSheetComponent,
    SimulationPanelComponent,
    ToolPanelComponent,
  ],
  host: { class: 'block h-dvh w-full overflow-hidden' },
  templateUrl: './app.component.html',
})
export class AppComponent {
  readonly store = inject(ProjectStore);
  readonly layout = inject(LayoutStore);
  readonly editor = inject(EditorStore);
  readonly sim = inject(SimulationService);
  private readonly title = inject(Title);

  constructor() {
    inject(GuideSyncService);
    effect(() => {
      const name = this.store.projectName().trim();
      this.title.setTitle(name ? `${name} — Ichnos` : 'Ichnos — Electrical Blueprint Designer');
    });
  }

  sheetLabel(): string {
    const id = this.editor.activeSheet();
    return this.store.rooms().find((r) => r.id === id)?.label ?? 'Master plan';
  }

  toolLabel(): string {
    return TOOL_LABELS[this.editor.tool()] ?? this.editor.tool();
  }
}
