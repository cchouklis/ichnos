import { CommonModule } from '@angular/common';
import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  HostListener,
  OnDestroy,
  ViewChild,
  effect,
  inject,
  signal,
} from '@angular/core';
import { SafeHtml } from '@angular/platform-browser';
import { ComponentInstance, Point, Room, Tool, Wall, Wire } from '../../core/models';
import { typeById } from '../../core/data/component-types.data';
import { ProjectStore } from '../../core/state/project-store.service';
import { ThemeService } from '../../core/theme/theme.service';
import { circuitColor } from '../../core/theme/theme.util';
import { DragDropService } from '../../core/services/drag-drop.service';
import { IconRegistryService } from '../../core/services/icon-registry.service';
import {
  clamp,
  findWallSnap,
  pathFromWaypoints,
  shoelaceArea,
  snapDraftPoint,
  wireWaypoints,
} from '../../core/util/geometry.util';

@Component({
  selector: 'cp-canvas',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './canvas.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CanvasComponent implements AfterViewInit, OnDestroy {
  readonly store = inject(ProjectStore);
  private readonly dragDrop = inject(DragDropService);
  private readonly icons = inject(IconRegistryService);
  private readonly theme = inject(ThemeService);

  /** Exposed for the template — Angular templates can't reference global objects directly. */
  protected readonly Math = Math;

  @ViewChild('svgRef', { static: true }) private svgRef!: ElementRef<SVGSVGElement>;

  readonly PX = this.store.scalePxPerMeter;

  // ---- draft/interaction state (ephemeral, not part of the undoable document) ----
  readonly wallDraftPreview = signal<Point[] | null>(null);
  readonly wallGhostPoint = signal<Point | null>(null);
  readonly roomDraftPreview = signal<{ x1: number; y1: number; x2: number; y2: number } | null>(null);
  readonly wireDraftPreview = signal<{ from: Point; to: Point } | null>(null);

  private roomDraftStart: Point | null = null;
  private wireDraftFrom: string | null = null;
  private dragComp: { id: string; preSnapshot: string; moved: boolean } | null = null;
  private panDrag: { startClientX: number; startClientY: number; startPan: Point } | null = null;
  private readonly activePointers = new Map<number, PointerEvent>();
  private pinchStartDist = 0;
  private pinchStartZoom = 1;
  private readonly onWheelBound = (e: WheelEvent) => this.onWheel(e);

  constructor() {
    // Clears in-progress drafts whenever the active tool changes, regardless of
    // where the change originated (this component's own dock, or the mobile nav).
    effect(() => {
      this.store.tool();
      this.cancelDrafts();
    });
  }

  ngAfterViewInit(): void {
    this.svgRef.nativeElement.addEventListener('wheel', this.onWheelBound, { passive: false });
    requestAnimationFrame(() => this.fitToView());
  }

  ngOnDestroy(): void {
    this.svgRef.nativeElement.removeEventListener('wheel', this.onWheelBound);
  }

  // ---------------------------------------------------------------------
  // Tool selection
  // ---------------------------------------------------------------------
  setTool(tool: Tool): void {
    this.store.setTool(tool);
  }

  private cancelDrafts(): void {
    this.wallDraftPreview.set(null);
    this.wallGhostPoint.set(null);
    this.roomDraftStart = null;
    this.roomDraftPreview.set(null);
    this.wireDraftFrom = null;
    this.wireDraftPreview.set(null);
  }

  private commitWall(): void {
    const pts = this.wallDraftPreview();
    if (pts && pts.length >= 2) this.store.commitWallChain(pts);
    this.wallDraftPreview.set(null);
    this.wallGhostPoint.set(null);
  }

  // ---------------------------------------------------------------------
  // Coordinate conversion
  // ---------------------------------------------------------------------
  private svgPointFromEvent(e: PointerEvent | WheelEvent): Point {
    const svg = this.svgRef.nativeElement;
    const pt = svg.createSVGPoint();
    pt.x = e.clientX;
    pt.y = e.clientY;
    const ctm = svg.getScreenCTM();
    if (!ctm) return { x: 0, y: 0 };
    const p = pt.matrixTransform(ctm.inverse());
    return { x: p.x, y: p.y };
  }

  private toMeters(viewBoxPoint: Point): Point {
    const z = this.store.zoom();
    const pan = this.store.pan();
    return { x: (viewBoxPoint.x - pan.x) / z / this.PX, y: (viewBoxPoint.y - pan.y) / z / this.PX };
  }

  private metersToView(m: Point): Point {
    const z = this.store.zoom();
    const pan = this.store.pan();
    return { x: m.x * this.PX * z + pan.x, y: m.y * this.PX * z + pan.y };
  }

  private eventToMeters(e: PointerEvent | WheelEvent): Point {
    return this.toMeters(this.svgPointFromEvent(e));
  }

  // ---------------------------------------------------------------------
  // Pointer interaction
  // ---------------------------------------------------------------------
  onSvgPointerDown(e: PointerEvent): void {
    this.activePointers.set(e.pointerId, e);
    if (this.activePointers.size === 2) {
      this.startPinch();
      return;
    }

    const m = this.eventToMeters(e);
    const tool = this.store.tool();

    if (tool === 'pan' || e.button === 1) {
      this.panDrag = { startClientX: e.clientX, startClientY: e.clientY, startPan: this.store.pan() };
      return;
    }

    if (tool === 'wall') {
      const draft = this.wallDraftPreview() ?? [];
      const snapped = snapDraftPoint(m, this.store.walls(), draft[0]);
      this.wallDraftPreview.set([...draft, snapped]);
      return;
    }

    if (tool === 'room') {
      this.roomDraftStart = m;
      this.roomDraftPreview.set({ x1: m.x, y1: m.y, x2: m.x, y2: m.y });
      return;
    }

    const targetId = this.componentIdFromEvent(e);

    if (tool === 'wire') {
      if (targetId) {
        if (!this.wireDraftFrom) {
          this.wireDraftFrom = targetId;
        } else if (this.wireDraftFrom !== targetId) {
          this.store.addWire(this.wireDraftFrom, targetId);
          this.wireDraftFrom = null;
          this.wireDraftPreview.set(null);
        }
      }
      return;
    }

    // select tool
    if (targetId) {
      this.store.selectComponent(targetId);
      this.dragComp = { id: targetId, preSnapshot: this.store.captureSnapshot(), moved: false };
      return;
    }
    this.store.selectComponent(null);
  }

  private componentIdFromEvent(e: PointerEvent): string | null {
    const el = (e.target as Element).closest('[data-comp-id]');
    return el ? el.getAttribute('data-comp-id') : null;
  }

  @HostListener('window:pointermove', ['$event'])
  onWindowPointerMove(e: PointerEvent): void {
    if (this.activePointers.has(e.pointerId)) this.activePointers.set(e.pointerId, e);
    if (this.activePointers.size === 2) {
      this.updatePinch();
      return;
    }

    if (this.dragDrop.draggingTypeId()) {
      this.dragDrop.move(e.clientX, e.clientY);
    }

    if (this.panDrag) {
      this.store.setPan({
        x: this.panDrag.startPan.x + (e.clientX - this.panDrag.startClientX),
        y: this.panDrag.startPan.y + (e.clientY - this.panDrag.startClientY),
      });
      return;
    }
    if (this.dragComp) {
      const m = this.eventToMeters(e);
      this.dragComp.moved = true;
      const snap = findWallSnap(m, this.store.walls());
      this.store.moveComponentLive(this.dragComp.id, snap?.x ?? m.x, snap?.y ?? m.y, snap?.rotDeg);
      return;
    }
    const tool = this.store.tool();
    if (tool === 'wall' && this.wallDraftPreview()) {
      const pts = this.wallDraftPreview()!;
      this.wallGhostPoint.set(snapDraftPoint(this.eventToMeters(e), this.store.walls(), pts[0]));
    }
    if (tool === 'room' && this.roomDraftStart) {
      const m = this.eventToMeters(e);
      this.roomDraftPreview.set({ x1: this.roomDraftStart.x, y1: this.roomDraftStart.y, x2: m.x, y2: m.y });
    }
    if (tool === 'wire' && this.wireDraftFrom) {
      const a = this.store.components().find((c) => c.id === this.wireDraftFrom);
      if (a) this.wireDraftPreview.set({ from: { x: a.x, y: a.y }, to: this.eventToMeters(e) });
    }
  }

  @HostListener('window:pointerup', ['$event'])
  onWindowPointerUp(e: PointerEvent): void {
    this.activePointers.delete(e.pointerId);
    if (this.activePointers.size < 2) this.pinchStartDist = 0;

    const draggingType = this.dragDrop.draggingTypeId();
    if (draggingType) {
      const rect = this.svgRef.nativeElement.getBoundingClientRect();
      if (e.clientX >= rect.left && e.clientX <= rect.right && e.clientY >= rect.top && e.clientY <= rect.bottom) {
        const m = this.eventToMeters(e);
        this.store.addComponentAt(draggingType, m.x, m.y);
      }
      this.dragDrop.end();
      return;
    }

    if (this.panDrag) {
      this.panDrag = null;
      return;
    }
    if (this.dragComp) {
      if (this.dragComp.moved) {
        this.store.commitComponentDrag(this.dragComp.id, this.dragComp.preSnapshot);
      }
      this.dragComp = null;
      return;
    }
    if (this.store.tool() === 'room' && this.roomDraftStart) {
      const m = this.eventToMeters(e);
      this.store.addQuickRoom(this.roomDraftStart.x, this.roomDraftStart.y, m.x, m.y);
      this.roomDraftStart = null;
      this.roomDraftPreview.set(null);
    }
  }

  onSvgDoubleClick(): void {
    if (this.store.tool() === 'wall') this.commitWall();
  }

  @HostListener('window:keydown', ['$event'])
  onKeydown(e: KeyboardEvent): void {
    const tag = (document.activeElement as HTMLElement | null)?.tagName;
    if (tag === 'INPUT' || tag === 'TEXTAREA') return;

    if (e.key === 'Escape') this.cancelDrafts();
    if (e.key === 'Enter' && this.store.tool() === 'wall') this.commitWall();
    if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
      e.preventDefault();
      e.shiftKey ? this.store.redo() : this.store.undo();
    }
    if ((e.ctrlKey || e.metaKey) && e.key === 'y') {
      e.preventDefault();
      this.store.redo();
    }
    if ((e.key === 'Delete' || e.key === 'Backspace') && this.store.selectedId()) {
      this.store.deleteSelected();
    }
    if (e.key === 'v') this.setTool('select');
    if (e.key === 'w') this.setTool('wall');
    if (e.key === 'r') this.setTool('room');
    if (e.key === 'c') this.setTool('wire');
  }

  // ---------------------------------------------------------------------
  // Pinch-to-zoom (touch)
  // ---------------------------------------------------------------------
  private dist(a: PointerEvent, b: PointerEvent): number {
    return Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY);
  }

  private startPinch(): void {
    const pts = Array.from(this.activePointers.values());
    this.pinchStartDist = this.dist(pts[0], pts[1]);
    this.pinchStartZoom = this.store.zoom();
  }

  private updatePinch(): void {
    if (!this.pinchStartDist) return;
    const pts = Array.from(this.activePointers.values());
    const ratio = this.dist(pts[0], pts[1]) / this.pinchStartDist;
    this.store.setZoom(this.pinchStartZoom * ratio);
  }

  // ---------------------------------------------------------------------
  // Wheel zoom (attached manually — Angular may mark template-bound wheel
  // listeners passive, which would silently break preventDefault here)
  // ---------------------------------------------------------------------
  private onWheel(e: WheelEvent): void {
    e.preventDefault();
    const svg = this.svgRef.nativeElement;
    const rect = svg.getBoundingClientRect();
    const vb = svg.viewBox.baseVal;
    const vbx = vb.x + ((e.clientX - rect.left) / rect.width) * vb.width;
    const vby = vb.y + ((e.clientY - rect.top) / rect.height) * vb.height;
    const before = this.toMeters({ x: vbx, y: vby });
    const factor = e.deltaY < 0 ? 1.1 : 0.9;
    this.store.setZoom(this.store.zoom() * factor);
    const after = this.metersToView(before);
    const pan = this.store.pan();
    this.store.setPan({ x: pan.x + (vbx - after.x), y: pan.y + (vby - after.y) });
  }

  // ---------------------------------------------------------------------
  // Zoom controls
  // ---------------------------------------------------------------------
  zoomIn(): void {
    this.store.setZoom(this.store.zoom() * 1.2);
  }
  zoomOut(): void {
    this.store.setZoom(this.store.zoom() * 0.8);
  }
  fitToView(): void {
    const walls = this.store.walls();
    const svg = this.svgRef.nativeElement;
    const vb = svg.viewBox.baseVal;
    if (!walls.length) {
      this.store.setZoom(1);
      this.store.setPan({ x: 80, y: 80 });
      return;
    }
    const xs = walls.flatMap((w) => [w.x1, w.x2]);
    const ys = walls.flatMap((w) => [w.y1, w.y2]);
    const minX = Math.min(...xs);
    const maxX = Math.max(...xs);
    const minY = Math.min(...ys);
    const maxY = Math.max(...ys);
    const wPx = (maxX - minX) * this.PX;
    const hPx = (maxY - minY) * this.PX;
    const z = clamp(Math.min(vb.width / (wPx + 160), vb.height / (hPx + 160)), 0.25, 3);
    this.store.setZoom(z);
    this.store.setPan({
      x: vb.x + vb.width / 2 - ((minX + maxX) / 2) * this.PX * z,
      y: vb.y + vb.height / 2 - ((minY + maxY) / 2) * this.PX * z,
    });
  }

  // ---------------------------------------------------------------------
  // Template render helpers
  // ---------------------------------------------------------------------
  worldTransform(): string {
    const p = this.store.pan();
    const z = this.store.zoom();
    return `translate(${p.x},${p.y}) scale(${z})`;
  }

  private roomWalls(room: Room): Wall[] {
    const walls = this.store.walls();
    return room.wallIds.map((id) => walls.find((w) => w.id === id)).filter((w): w is Wall => !!w);
  }

  roomHasFill(room: Room): boolean {
    return this.roomWalls(room).length >= 3;
  }

  roomPolygonPoints(room: Room): string {
    return this.roomWalls(room)
      .map((w) => `${w.x1 * this.PX},${w.y1 * this.PX}`)
      .join(' ');
  }

  roomLabelPos(room: Room): Point {
    const walls = this.roomWalls(room);
    if (!walls.length) return { x: 0, y: 0 };
    const cx = walls.reduce((s, w) => s + w.x1, 0) / walls.length;
    const cy = walls.reduce((s, w) => s + w.y1, 0) / walls.length;
    return { x: cx * this.PX, y: cy * this.PX };
  }

  roomAreaLabel(room: Room): string {
    const walls = this.roomWalls(room);
    const area = walls.length >= 3 ? shoelaceArea(walls.map((w) => ({ x: w.x1, y: w.y1 }))) : 0;
    return `${room.label} · ${area.toFixed(1)}m²`;
  }

  wallStrokeWidth(w: Wall): number {
    return Math.max(3, w.thickness * this.PX);
  }

  wireD(wire: Wire): string {
    const comps = this.store.components();
    const a = comps.find((c) => c.id === wire.a);
    const b = comps.find((c) => c.id === wire.b);
    if (!a || !b) return '';
    return pathFromWaypoints(wireWaypoints(a, b), this.PX);
  }

  wireColor(circuit: number): string {
    return circuitColor(this.theme.effective(), circuit);
  }

  compTransform(c: ComponentInstance): string {
    return `translate(${c.x * this.PX},${c.y * this.PX}) rotate(${c.rot || 0})`;
  }

  compColor(c: ComponentInstance): string {
    return this.theme.tint(typeById(c.type).color);
  }

  compIconHtml(c: ComponentInstance): SafeHtml {
    return this.icons.html(typeById(c.type).icon);
  }

  isSelected(id: string): boolean {
    return this.store.selectedId() === id;
  }

  wallDraftLines(): { p1: Point; p2: Point }[] {
    const pts = this.wallDraftPreview();
    if (!pts) return [];
    const lines: { p1: Point; p2: Point }[] = [];
    for (let i = 0; i < pts.length - 1; i++) lines.push({ p1: pts[i], p2: pts[i + 1] });
    const ghost = this.wallGhostPoint();
    if (ghost && pts.length) lines.push({ p1: pts[pts.length - 1], p2: ghost });
    return lines;
  }
}
