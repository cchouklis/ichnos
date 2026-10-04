import { CommonModule } from '@angular/common';
import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  HostListener,
  OnDestroy,
  ViewChild,
  computed,
  effect,
  inject,
  signal,
  untracked,
} from '@angular/core';
import { SafeHtml } from '@angular/platform-browser';
import type { ComponentInstance, ElementKind, ElementRef as PlanElementRef, Point, Room, Tool, Wall, Wire } from '../../core/models';
import { typeById } from '../../core/data/component-types.data';
import { mmToMeters } from '../../core/units/units.util';
import { EditorStore } from '../../core/state/editor.store';
import { SimulationService } from '../../core/simulation/simulation.service';
import { LayoutStore } from '../../core/state/layout.store';
import { ProjectStore } from '../../core/state/project-store.service';
import { ThemeService } from '../../core/theme/theme.service';
import { circuitColor } from '../../core/theme/theme.util';
import { DragDropService } from '../../core/services/drag-drop.service';
import { IconRegistryService } from '../../core/services/icon-registry.service';
import { clamp, distance, pathFromWaypoints, wireWaypoints } from '../../core/util/geometry.util';
import { isRoomClosed, roomArea, roomPolygon, scopeToRoom, type WireStub } from '../../core/util/sheet.util';
import {
  ALL_KINDS,
  allElements,
  elementsInRect,
  includesRef,
  toggleRef,
  type Rect,
} from '../../core/util/selection.util';
import { ToolButtonComponent } from '../ui/tool-button.component';
import type { CanvasTool, PointerInfo } from './tools/canvas-tool';
import { ComponentTool } from './tools/component.tool';
import { RoomTool } from './tools/room.tool';
import { SelectTool } from './tools/select.tool';
import { WallTool } from './tools/wall.tool';
import { WireTool } from './tools/wire.tool';

/** How an element is drawn on the active sheet: editable, dimmed context, or not drawn. */
export type SheetState = 'edit' | 'dim' | 'hide';

/** What the pointer that is currently down is doing. */
type Gesture = 'none' | 'tool' | 'marquee' | 'pan' | 'multitouch';

const GLOW_BASE_RADIUS = 20;
const GLOW_LEVEL_RADIUS = 44;
const MARQUEE_MIN_PX = 3;
const HIT_WIDTH_PX = 18;
const HIT_WIDTH_TOUCH_PX = 30;
const COMP_HIT_HALF = 17;
const COMP_HIT_HALF_TOUCH = 24;
const KIND_SET: ReadonlySet<string> = new Set<ElementKind>(ALL_KINDS);

@Component({
  selector: 'cp-canvas',
  standalone: true,
  imports: [CommonModule, ToolButtonComponent],
  templateUrl: './canvas.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CanvasComponent implements AfterViewInit, OnDestroy {
  readonly store = inject(ProjectStore);
  readonly editor = inject(EditorStore);
  private readonly layout = inject(LayoutStore);
  private readonly sim = inject(SimulationService);
  private readonly dragDrop = inject(DragDropService);
  private readonly icons = inject(IconRegistryService);
  private readonly theme = inject(ThemeService);

  /** Exposed for the template — Angular templates can't reference global objects directly. */
  protected readonly Math = Math;

  @ViewChild('svgRef', { static: true }) private svgRef!: ElementRef<SVGSVGElement>;

  readonly PX = this.store.scalePxPerMeter;

  // ---- tool strategies --------------------------------------------------------------------
  private readonly env = { project: this.store, editor: this.editor };
  readonly selectTool = new SelectTool(this.env);
  readonly wallTool = new WallTool(this.env);
  readonly roomTool = new RoomTool(this.env);
  readonly wireTool = new WireTool(this.env);
  readonly componentTool = new ComponentTool(this.env);
  private readonly tools: Record<Tool, CanvasTool> = {
    select: this.selectTool,
    wall: this.wallTool,
    room: this.roomTool,
    wire: this.wireTool,
    component: this.componentTool,
  };

  private readonly activeTool = computed(() => this.tools[this.editor.tool()]);
  readonly hint = computed(() => this.activeTool().hint());

  // ---- transient interaction state --------------------------------------------------------
  /** Box selection in progress, in plan coordinates (metres). */
  readonly marquee = signal<Rect | null>(null);
  readonly spaceDown = signal(false);
  readonly panning = signal(false);

  private gesture: Gesture = 'none';
  private marqueeAdditive = false;
  private marqueeStartClient: Point | null = null;
  private panDrag: { startClientX: number; startClientY: number; startPan: Point } | null = null;
  private readonly activePointers = new Map<number, PointerEvent>();
  private pinch: { dist: number; zoom: number; anchorPlan: Point } | null = null;
  private readonly onWheelBound = (e: WheelEvent) => this.onWheel(e);

  readonly cursorClass = computed(() => {
    if (this.panning()) return 'cursor-grabbing';
    if (this.spaceDown()) return 'cursor-grab';
    return this.editor.tool() === 'select' ? '' : 'cursor-crosshair';
  });

  // ---- room sheets ----------------------------------------------------------------------
  /** What belongs to the open room sheet; null on the master plan, where everything is editable. */
  private readonly scope = computed(() => {
    const id = this.editor.activeSheet();
    return id ? scopeToRoom(this.documentSnapshot(), id) : null;
  });
  readonly sheetRoom = computed(() => this.store.rooms().find((r) => r.id === this.editor.activeSheet()) ?? null);
  readonly stubs = computed<WireStub[]>(() => [...(this.scope()?.stubs ?? [])]);

  readonly hitWidth = computed(() => (this.layout.coarsePointer() ? HIT_WIDTH_TOUCH_PX : HIT_WIDTH_PX) / this.editor.zoom());
  readonly compHitHalf = computed(() => (this.layout.coarsePointer() ? COMP_HIT_HALF_TOUCH : COMP_HIT_HALF));
  readonly armedLabel = computed(() => {
    const id = this.editor.armedType();
    return id ? typeById(id).label : null;
  });

  constructor() {
    // Restore (or fit) the view whenever the sheet changes.
    effect(() => {
      if (!this.editor.sheetSwitches()) return;
      untracked(() => requestAnimationFrame(() => this.applySheetView()));
    });
    // Drop in-progress drafts whenever the active tool changes, wherever the change came from.
    effect(() => {
      this.editor.tool();
      untracked(() => this.resetGestures());
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
  // Toolbar
  // ---------------------------------------------------------------------
  setTool(tool: Tool): void {
    this.editor.setTool(tool);
  }

  backToMaster(): void {
    this.editor.setSheet(null);
  }

  toggleContext(): void {
    this.editor.showContext.update((v) => !v);
  }

  /** Drawing state of an element on the open sheet. */
  sheetState(kind: ElementKind, id: string): SheetState {
    const scope = this.scope();
    if (!scope) return 'edit';
    const set = kind === 'wall' ? scope.wallIds : kind === 'component' ? scope.componentIds : scope.wireIds;
    if (set.has(id)) return 'edit';
    return this.editor.showContext() ? 'dim' : 'hide';
  }

  /** Wires that cross the sheet boundary are drawn as stubs instead of full paths. */
  isStubWire(id: string): boolean {
    return this.stubs().some((s) => s.wireId === id);
  }

  /** Short line leaving the inside component towards the wire's destination, plus a label saying where it goes. */
  stubGeometry(stub: WireStub): { x1: number; y1: number; x2: number; y2: number; lx: number; ly: number; label: string } | null {
    const comps = this.store.components();
    const inside = comps.find((c) => c.id === stub.insideId);
    const outside = comps.find((c) => c.id === stub.outsideId);
    if (!inside || !outside) return null;
    const d = distance(inside, outside) || 1;
    const len = Math.min(0.8, d);
    const x2 = inside.x + ((outside.x - inside.x) / d) * len;
    const y2 = inside.y + ((outside.y - inside.y) / d) * len;
    const room = this.store.rooms().find((r) => r.id === outside.roomId);
    return {
      x1: inside.x * this.PX, y1: inside.y * this.PX, x2: x2 * this.PX, y2: y2 * this.PX,
      lx: x2 * this.PX, ly: y2 * this.PX - 4,
      label: `→ ${room ? room.label + ': ' : ''}${outside.label}`,
    };
  }

  private applySheetView(): void {
    const saved = this.editor.savedView(this.editor.activeSheet());
    if (saved) {
      this.editor.setZoom(saved.zoom);
      this.editor.setPan(saved.pan);
    } else {
      this.fitToView();
    }
  }

  private resetGestures(): void {
    for (const t of Object.values(this.tools)) t.reset();
    this.marquee.set(null);
    this.panDrag = null;
    this.panning.set(false);
    this.gesture = 'none';
  }

  // ---------------------------------------------------------------------
  // Coordinate conversion
  // ---------------------------------------------------------------------
  private svgPointFromClient(clientX: number, clientY: number): Point {
    const svg = this.svgRef.nativeElement;
    const pt = svg.createSVGPoint();
    pt.x = clientX;
    pt.y = clientY;
    const ctm = svg.getScreenCTM();
    if (!ctm) return { x: 0, y: 0 };
    const p = pt.matrixTransform(ctm.inverse());
    return { x: p.x, y: p.y };
  }

  private viewToPlan(view: Point, zoom = this.editor.zoom(), pan = this.editor.pan()): Point {
    return { x: (view.x - pan.x) / zoom / this.PX, y: (view.y - pan.y) / zoom / this.PX };
  }

  private planToView(plan: Point): Point {
    const z = this.editor.zoom();
    const pan = this.editor.pan();
    return { x: plan.x * this.PX * z + pan.x, y: plan.y * this.PX * z + pan.y };
  }

  private planFromEvent(e: { clientX: number; clientY: number }): Point {
    return this.viewToPlan(this.svgPointFromClient(e.clientX, e.clientY));
  }

  private hitFromEvent(e: PointerEvent): PlanElementRef | null {
    const el = (e.target as Element | null)?.closest?.('[data-el-kind]');
    const kind = el?.getAttribute('data-el-kind');
    const id = el?.getAttribute('data-el-id');
    return kind && id && KIND_SET.has(kind) ? { kind: kind as ElementKind, id } : null;
  }

  private infoFromEvent(e: PointerEvent, withHit: boolean): PointerInfo {
    return { plan: this.planFromEvent(e), hit: withHit ? this.hitFromEvent(e) : null, shift: e.shiftKey };
  }

  // ---------------------------------------------------------------------
  // Pointer interaction
  //   left            → active tool          right (mouse)   → erase
  //   Ctrl/Cmd + drag → box select           middle / Space  → pan
  //   view only       → drag pans, switches toggle while simulating
  //   touch editing   → tool + Draw / Erase, two fingers pan + zoom
  // ---------------------------------------------------------------------
  onSvgPointerDown(e: PointerEvent): void {
    this.activePointers.set(e.pointerId, e);
    if (this.activePointers.size === 2) {
      this.beginMultiTouch();
      return;
    }
    if (this.activePointers.size > 2 || this.gesture === 'multitouch') return;

    if (!this.editor.canEdit()) {
      if (!this.toggleSwitchAt(this.infoFromEvent(e, true))) this.beginPan(e);
      return;
    }

    const isMouse = e.pointerType === 'mouse';
    const tool = this.activeTool();

    if (e.button === 1 || (e.button === 0 && this.spaceDown())) {
      e.preventDefault();
      this.beginPan(e);
      return;
    }
    if (isMouse && e.button === 2) {
      e.preventDefault();
      tool.secondaryDown(this.infoFromEvent(e, true));
      return;
    }
    if (e.button !== 0) return;

    const info = this.infoFromEvent(e, true);

    if (isMouse && (e.ctrlKey || e.metaKey)) {
      this.beginMarquee(e, info.plan);
      return;
    }

    if (!isMouse) {
      if (tool.id === 'select') {
        this.touchSelect(e, info, tool);
        return;
      }
      if (this.editor.mode() === 'erase') {
        tool.secondaryDown(info);
        return;
      }
    }

    if (this.toggleSwitchAt(info)) return;

    this.gesture = 'tool';
    tool.primaryDown(info);
    if (tool.id === 'select' && !info.hit) this.beginMarquee(e, info.plan);
  }

  private toggleSwitchAt(info: PointerInfo): boolean {
    const hit = info.hit;
    if (!this.sim.enabled() || hit?.kind !== 'component' || !this.sim.isControl(hit.id)) return false;
    this.sim.toggleSwitch(hit.id);
    return true;
  }

  /** Touch "select" mode: tap an element to toggle it, drag from empty space to box-select. */
  private touchSelect(e: PointerEvent, info: PointerInfo, tool: CanvasTool): void {
    if (info.hit && tool.kinds.includes(info.hit.kind)) {
      this.editor.setSelection(toggleRef(this.editor.selection(), info.hit));
      return;
    }
    this.beginMarquee(e, info.plan, true);
  }

  private beginMarquee(e: PointerEvent, plan: Point, additive = e.shiftKey): void {
    this.gesture = 'marquee';
    this.marqueeAdditive = additive;
    this.marqueeStartClient = { x: e.clientX, y: e.clientY };
    this.marquee.set({ x1: plan.x, y1: plan.y, x2: plan.x, y2: plan.y });
  }

  private beginPan(e: PointerEvent): void {
    this.gesture = 'pan';
    this.panning.set(true);
    this.panDrag = { startClientX: e.clientX, startClientY: e.clientY, startPan: this.editor.pan() };
  }

  @HostListener('window:pointermove', ['$event'])
  onWindowPointerMove(e: PointerEvent): void {
    if (this.activePointers.has(e.pointerId)) this.activePointers.set(e.pointerId, e);

    if (this.dragDrop.draggingTypeId()) this.dragDrop.move(e.clientX, e.clientY);

    switch (this.gesture) {
      case 'multitouch':
        this.updateMultiTouch();
        return;
      case 'pan':
        if (this.panDrag) {
          this.editor.setPan({
            x: this.panDrag.startPan.x + (e.clientX - this.panDrag.startClientX),
            y: this.panDrag.startPan.y + (e.clientY - this.panDrag.startClientY),
          });
        }
        return;
      case 'marquee': {
        const m = this.marquee();
        if (m) {
          const p = this.planFromEvent(e);
          this.marquee.set({ ...m, x2: p.x, y2: p.y });
        }
        return;
      }
      default:
        this.activeTool().move(this.infoFromEvent(e, false));
    }
  }

  @HostListener('window:pointerup', ['$event'])
  onWindowPointerUp(e: PointerEvent): void {
    this.activePointers.delete(e.pointerId);

    const draggingType = this.dragDrop.draggingTypeId();
    if (draggingType) {
      const rect = this.svgRef.nativeElement.getBoundingClientRect();
      if (e.clientX >= rect.left && e.clientX <= rect.right && e.clientY >= rect.top && e.clientY <= rect.bottom) {
        const m = this.planFromEvent(e);
        this.store.addComponentAt(draggingType, m.x, m.y, { circuit: this.editor.placeCircuit() });
      }
      this.dragDrop.end();
      return;
    }

    switch (this.gesture) {
      case 'multitouch':
        if (this.activePointers.size === 0) {
          this.pinch = null;
          this.gesture = 'none';
        }
        return;
      case 'pan':
        this.panDrag = null;
        this.panning.set(false);
        this.gesture = 'none';
        return;
      case 'marquee':
        this.finishMarquee(e);
        this.gesture = 'none';
        return;
      case 'tool':
        this.gesture = 'none';
        this.activeTool().primaryUp(this.infoFromEvent(e, false));
        return;
      default:
    }
  }

  @HostListener('window:pointercancel', ['$event'])
  onPointerCancel(e: PointerEvent): void {
    this.activePointers.delete(e.pointerId);
    if (this.activePointers.size === 0) this.resetGestures();
  }

  private finishMarquee(e: PointerEvent): void {
    const m = this.marquee();
    const start = this.marqueeStartClient;
    this.marquee.set(null);
    this.marqueeStartClient = null;
    if (!m || !start) return;

    const dragged = Math.hypot(e.clientX - start.x, e.clientY - start.y) >= MARQUEE_MIN_PX;
    if (!dragged) {
      // A plain click on empty space clears the selection.
      if (!this.marqueeAdditive) this.editor.clearSelection();
      return;
    }
    const doc = this.editableDocument();
    const found = elementsInRect(doc, m, this.activeTool().kinds);
    if (!this.marqueeAdditive) {
      this.editor.setSelection(found);
      return;
    }
    const merged = [...this.editor.selection()];
    for (const ref of found) if (!includesRef(merged, ref)) merged.push(ref);
    this.editor.setSelection(merged);
  }

  /** The whole document, regardless of sheet. */
  private documentSnapshot() {
    return {
      walls: this.store.walls(),
      rooms: this.store.rooms(),
      components: this.store.components(),
      wires: this.store.wires(),
    };
  }

  /** The part of the document the user may select on the open sheet (everything on the master plan). */
  private editableDocument() {
    const doc = this.documentSnapshot();
    const scope = this.scope();
    if (!scope) return doc;
    return {
      ...doc,
      walls: doc.walls.filter((w) => scope.wallIds.has(w.id)),
      components: doc.components.filter((c) => scope.componentIds.has(c.id)),
      wires: doc.wires.filter((w) => scope.wireIds.has(w.id)),
    };
  }

  /** Mouse users never see the browser menu on the plan: right-click is "erase". Touch long-press is ignored. */
  onContextMenu(e: Event): void {
    e.preventDefault();
  }

  onSvgDoubleClick(): void {
    this.activeTool().commit();
  }

  // ---------------------------------------------------------------------
  // Two-finger pan + pinch zoom (touch)
  // ---------------------------------------------------------------------
  private beginMultiTouch(): void {
    // Finish whatever the first finger was doing before the viewport starts moving.
    this.activeTool().interrupt();
    this.marquee.set(null);
    this.marqueeStartClient = null;
    this.gesture = 'multitouch';

    const [a, b] = Array.from(this.activePointers.values());
    const mid = this.midpoint(a, b);
    this.pinch = {
      dist: Math.max(1, Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY)),
      zoom: this.editor.zoom(),
      anchorPlan: this.planFromEvent(mid),
    };
  }

  private updateMultiTouch(): void {
    if (!this.pinch || this.activePointers.size < 2) return;
    const [a, b] = Array.from(this.activePointers.values());
    const dist = Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY);
    this.editor.setZoom(this.pinch.zoom * (dist / this.pinch.dist));
    // Keep the plan point that started under the fingers' midpoint under them as they move.
    const view = this.svgPointFromClient(this.midpoint(a, b).clientX, this.midpoint(a, b).clientY);
    const z = this.editor.zoom();
    this.editor.setPan({
      x: view.x - this.pinch.anchorPlan.x * this.PX * z,
      y: view.y - this.pinch.anchorPlan.y * this.PX * z,
    });
  }

  private midpoint(a: PointerEvent, b: PointerEvent): { clientX: number; clientY: number } {
    return { clientX: (a.clientX + b.clientX) / 2, clientY: (a.clientY + b.clientY) / 2 };
  }

  // ---------------------------------------------------------------------
  // Keyboard
  // ---------------------------------------------------------------------
  private isTypingTarget(target: EventTarget | null): boolean {
    const el = target as HTMLElement | null;
    if (!el) return false;
    return ['INPUT', 'TEXTAREA', 'SELECT'].includes(el.tagName) || el.isContentEditable;
  }

  @HostListener('window:keydown', ['$event'])
  onKeydown(e: KeyboardEvent): void {
    if (this.isTypingTarget(e.target) || !this.editor.canEdit()) return;

    if (e.code === 'Space') {
      // Leave Space alone on focused controls, where it activates the control.
      if ((e.target as HTMLElement | null)?.closest?.('button, a, summary, [role="button"]')) return;
      e.preventDefault();
      this.spaceDown.set(true);
      return;
    }

    const key = e.key.toLowerCase();
    if (e.ctrlKey || e.metaKey) {
      // Letter shortcuts must NOT fire while Ctrl/Cmd is held (Ctrl+C is copy, not the wire tool).
      if (key === 'z') {
        e.preventDefault();
        if (e.shiftKey) this.store.redo();
        else this.store.undo();
      } else if (key === 'y') {
        e.preventDefault();
        this.store.redo();
      } else if (key === 'a') {
        e.preventDefault();
        this.editor.setSelection(allElements(this.editableDocument(), this.activeTool().kinds));
      }
      return;
    }
    if (e.altKey) return;

    switch (e.key) {
      case 'Escape':
        if (!this.activeTool().cancel()) this.editor.clearSelection();
        return;
      case 'Enter':
        this.activeTool().commit();
        return;
      case 'Delete':
      case 'Backspace':
        if (this.editor.selection().length) {
          e.preventDefault();
          this.store.deleteSelection();
        }
        return;
      default:
    }
    switch (key) {
      case 'v': this.setTool('select'); break;
      case 'w': this.setTool('wall'); break;
      case 'r': this.setTool('room'); break;
      case 'c': this.setTool('wire'); break;
      case 'p': this.editor.chooseComponentTool(); break;
      default:
    }
  }

  @HostListener('window:keyup', ['$event'])
  onKeyup(e: KeyboardEvent): void {
    if (e.code === 'Space') this.spaceDown.set(false);
  }

  @HostListener('window:blur')
  onWindowBlur(): void {
    this.spaceDown.set(false);
  }

  // ---------------------------------------------------------------------
  // Wheel zoom (attached manually — Angular may mark template-bound wheel
  // listeners passive, which would silently break preventDefault here)
  // ---------------------------------------------------------------------
  private onWheel(e: WheelEvent): void {
    e.preventDefault();
    const view = this.svgPointFromClient(e.clientX, e.clientY);
    const before = this.viewToPlan(view);
    const factor = e.deltaY < 0 ? 1.1 : 0.9;
    this.editor.setZoom(this.editor.zoom() * factor);
    const after = this.planToView(before);
    const pan = this.editor.pan();
    this.editor.setPan({ x: pan.x + (view.x - after.x), y: pan.y + (view.y - after.y) });
  }

  zoomIn(): void {
    this.editor.setZoom(this.editor.zoom() * 1.2);
  }

  zoomOut(): void {
    this.editor.setZoom(this.editor.zoom() * 0.8);
  }

  fitToView(): void {
    const scope = this.scope();
    const sheetWalls = scope ? this.store.walls().filter((w) => scope.wallIds.has(w.id)) : [];
    const walls = sheetWalls.length ? sheetWalls : this.store.walls();
    const vb = this.svgRef.nativeElement.viewBox.baseVal;
    if (!walls.length) {
      this.editor.setZoom(1);
      this.editor.setPan({ x: 80, y: 80 });
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
    this.editor.setZoom(z);
    this.editor.setPan({
      x: vb.x + vb.width / 2 - ((minX + maxX) / 2) * this.PX * z,
      y: vb.y + vb.height / 2 - ((minY + maxY) / 2) * this.PX * z,
    });
  }

  // ---------------------------------------------------------------------
  // Template render helpers
  // ---------------------------------------------------------------------
  worldTransform(): string {
    const p = this.editor.pan();
    const z = this.editor.zoom();
    return `translate(${p.x},${p.y}) scale(${z})`;
  }

  private roomWalls(room: Room): Wall[] {
    const walls = this.store.walls();
    return room.wallIds.map((id) => walls.find((w) => w.id === id)).filter((w): w is Wall => !!w);
  }

  roomHasFill(room: Room): boolean {
    return isRoomClosed(room, this.store.walls());
  }

  roomPolygonPoints(room: Room): string {
    return roomPolygon(room, this.store.walls())
      .map((p) => `${p.x * this.PX},${p.y * this.PX}`)
      .join(' ');
  }

  roomLabelPos(room: Room): Point {
    const poly = roomPolygon(room, this.store.walls());
    if (!poly.length) return { x: 0, y: 0 };
    const cx = poly.reduce((s, p) => s + p.x, 0) / poly.length;
    const cy = poly.reduce((s, p) => s + p.y, 0) / poly.length;
    return { x: cx * this.PX, y: cy * this.PX };
  }

  roomAreaLabel(room: Room): string {
    return `${room.label} · ${roomArea(room, this.store.walls()).toFixed(1)}m²`;
  }

  /** Room fills outside the open sheet are context. */
  roomState(room: Room): SheetState {
    const sheet = this.editor.activeSheet();
    if (!sheet || sheet === room.id) return 'edit';
    return this.editor.showContext() ? 'dim' : 'hide';
  }

  strokeWidthForMm(mm: number): number {
    return Math.max(3, mmToMeters(mm) * this.PX);
  }

  wallStrokeWidth(w: Wall): number {
    return this.strokeWidthForMm(w.thicknessMm);
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

  isEnergized(wire: Wire): boolean {
    return this.sim.flowOf(wire.id) !== undefined;
  }

  isReversed(wire: Wire): boolean {
    return this.sim.flowOf(wire.id)?.from === wire.b;
  }

  isUnpowered(wire: Wire): boolean {
    return this.sim.enabled() && !this.isEnergized(wire);
  }

  glow(c: ComponentInstance): { radius: number; opacity: number } | null {
    const level = this.sim.levelOf(c.id);
    if (typeById(c.type).power !== 'load' || level <= 0) return null;
    return { radius: GLOW_BASE_RADIUS + GLOW_LEVEL_RADIUS * level, opacity: 0.3 + 0.7 * level };
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

  isSelected(kind: ElementKind, id: string): boolean {
    return this.editor.selection().some((r) => r.kind === kind && r.id === id);
  }

  wallDraftLines(): { p1: Point; p2: Point }[] {
    const pts = this.wallTool.draft();
    const lines: { p1: Point; p2: Point }[] = [];
    for (let i = 0; i < pts.length - 1; i++) lines.push({ p1: pts[i], p2: pts[i + 1] });
    const ghost = this.wallTool.ghost();
    if (ghost && pts.length) lines.push({ p1: pts[pts.length - 1], p2: ghost });
    return lines;
  }
}
