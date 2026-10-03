import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { CATEGORY_META, COMPONENT_TYPES } from '../../core/data/component-types.data';
import { ComponentCategory, ComponentType } from '../../core/models';
import { DragDropService } from '../../core/services/drag-drop.service';
import { IconRegistryService } from '../../core/services/icon-registry.service';
import { LayoutStore } from '../../core/state/layout.store';
import { ProjectStore } from '../../core/state/project-store.service';
import { ThemeService } from '../../core/theme/theme.service';

interface CategoryGroup {
  cat: ComponentCategory;
  label: string;
  color: string;
  items: ComponentType[];
}

function buildGroups(): CategoryGroup[] {
  const byCat = COMPONENT_TYPES.reduce<Record<string, ComponentType[]>>((acc, t) => {
    (acc[t.cat] ??= []).push(t);
    return acc;
  }, {});
  return Object.entries(byCat).map(([cat, items]) => ({
    cat: cat as ComponentCategory,
    label: CATEGORY_META[cat as ComponentCategory].label,
    color: CATEGORY_META[cat as ComponentCategory].color,
    items,
  }));
}

@Component({
  selector: 'cp-palette',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './palette.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PaletteComponent {
  private readonly dragDrop = inject(DragDropService);
  readonly icons = inject(IconRegistryService);
  readonly theme = inject(ThemeService);
  private readonly store = inject(ProjectStore);
  private readonly layout = inject(LayoutStore);

  readonly groups: CategoryGroup[] = buildGroups();
  readonly openCategory = signal<ComponentCategory | null>(this.groups[0]?.cat ?? null);

  toggleCategory(cat: ComponentCategory): void {
    this.openCategory.update((open) => (open === cat ? null : cat));
  }

  startDrag(e: PointerEvent, typeId: string): void {
    e.preventDefault();
    this.dragDrop.start(typeId, e.clientX, e.clientY);
  }

  /** Tap or Enter places the component at the centre of the visible plan; dragging still places it exactly where you drop it. */
  place(typeId: string): void {
    const c = this.store.viewCenter();
    this.store.addComponentAt(typeId, c.x, c.y);
    this.layout.closeOverlay();
  }

  draggingTypeId(): string | null {
    return this.dragDrop.draggingTypeId();
  }

  ghostPosition(): { x: number; y: number } {
    return this.dragDrop.pointerPosition();
  }

  ghostColor(): string {
    const id = this.dragDrop.draggingTypeId();
    const base = id ? (COMPONENT_TYPES.find((t) => t.id === id)?.color ?? '#ffb020') : '#ffb020';
    return this.theme.tint(base);
  }

  ghostIcon(): string {
    const id = this.dragDrop.draggingTypeId();
    return id ? (COMPONENT_TYPES.find((t) => t.id === id)?.icon ?? '') : '';
  }
}
