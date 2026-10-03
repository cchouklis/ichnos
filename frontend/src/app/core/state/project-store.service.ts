import { Injectable, computed, inject, signal } from '@angular/core';
import type { ComponentInstance, ElementRef, Point, ProjectDto, Room, ViewMode, Wall, Wire } from '../models';
import { typeById } from '../data/component-types.data';
import { WALL_HEIGHT_MM, WALL_THICKNESS_MM } from '../units/units.util';
import { IdService } from '../services/id.service';
import { avoidOverlap, distance, findWallSnap, wireLengthMeters } from '../util/geometry.util';
import { removeElements } from '../util/selection.util';
import { EditorStore } from './editor.store';

const MAX_HISTORY = 60;

export interface PlaceOptions {
  circuit?: number | null;
  mountHeightMm?: number | null;
  rotDeg?: number;
}

export interface WallDims {
  thicknessMm: number;
  heightMm: number;
}

interface Snapshot {
  walls: Wall[];
  rooms: Room[];
  components: ComponentInstance[];
  wires: Wire[];
}

@Injectable({ providedIn: 'root' })
export class ProjectStore {
  private readonly ids = inject(IdService);
  private readonly editor = inject(EditorStore);

  // ---- document state -----------------------------------------------
  readonly walls = signal<Wall[]>([]);
  readonly rooms = signal<Room[]>([]);
  readonly components = signal<ComponentInstance[]>([]);
  readonly wires = signal<Wire[]>([]);
  readonly projectName = signal('Guest Bedroom — Unit 4B');
  readonly serverId = signal<string | null>(null);
  readonly scalePxPerMeter = 60;

  // ---- UI / editor state ----------------------------------------------
  readonly view = signal<ViewMode>('2d');
  readonly simulate = signal(false);
  readonly bgImage = signal<string | null>(null);
  readonly bgOpacity = signal(0.5);

  // ---- derived state ----------------------------------------------------
  readonly selectedComponent = computed(() => this.components().find((c) => c.id === this.editor.singleComponentId()) ?? null);
  readonly circuitCount = computed(() => new Set(this.wires().map((w) => w.circuit)).size);
  readonly wallLengthMeters = computed(() => this.walls().reduce((s, w) => s + distance({ x: w.x1, y: w.y1 }, { x: w.x2, y: w.y2 }), 0));
  readonly wireLengthMeters = computed(() => {
    const comps = this.components();
    return this.wires().reduce((sum, w) => {
      const a = comps.find((c) => c.id === w.a);
      const b = comps.find((c) => c.id === w.b);
      return a && b ? sum + wireLengthMeters(a, b) + 0.3 : sum; // +30cm slack for the vertical drop
    }, 0);
  });

  // ---- undo/redo ----------------------------------------------------------
  private undoStack: string[] = [];
  private redoStack: string[] = [];
  readonly canUndo = signal(false);
  readonly canRedo = signal(false);

  constructor() {
    this.loadDemoProject();
  }

  // ---------------------------------------------------------------------
  // History
  // ---------------------------------------------------------------------
  /** Serializes the current document (not UI state) for undo/redo. */
  captureSnapshot(): string {
    const snap: Snapshot = {
      walls: this.walls(),
      rooms: this.rooms(),
      components: this.components(),
      wires: this.wires(),
    };
    return JSON.stringify(snap);
  }

  private restoreSnapshot(json: string): void {
    const snap: Snapshot = JSON.parse(json);
    this.walls.set(snap.walls);
    this.rooms.set(snap.rooms);
    this.components.set(snap.components);
    this.wires.set(snap.wires);
  }

  /** Pushes a PRE-mutation snapshot (call before mutating, or pass one captured earlier — e.g. at drag-start). */
  pushHistory(snapshot?: string): void {
    this.undoStack.push(snapshot ?? this.captureSnapshot());
    if (this.undoStack.length > MAX_HISTORY) this.undoStack.shift();
    this.redoStack = [];
    this.syncHistoryFlags();
  }

  undo(): void {
    const prev = this.undoStack.pop();
    if (!prev) return;
    this.redoStack.push(this.captureSnapshot());
    this.restoreSnapshot(prev);
    this.syncHistoryFlags();
  }

  redo(): void {
    const next = this.redoStack.pop();
    if (!next) return;
    this.undoStack.push(this.captureSnapshot());
    this.restoreSnapshot(next);
    this.syncHistoryFlags();
  }

  private syncHistoryFlags(): void {
    this.canUndo.set(this.undoStack.length > 0);
    this.canRedo.set(this.redoStack.length > 0);
  }

  // ---------------------------------------------------------------------
  // View
  // ---------------------------------------------------------------------
  setView(view: ViewMode): void {
    this.view.set(view);
  }

  toggleSimulate(): void {
    this.simulate.update((v) => !v);
  }

  // ---------------------------------------------------------------------
  // Components
  // ---------------------------------------------------------------------
  addComponentAt(typeId: string, x: number, y: number, opts: PlaceOptions = {}): ComponentInstance {
    const type = typeById(typeId);
    const snap = findWallSnap({ x, y }, this.walls());
    const clear = avoidOverlap(snap ?? { x, y }, this.components());
    const circuits = new Set(this.wires().map((w) => w.circuit));
    const c: ComponentInstance = {
      id: this.ids.next('comp'),
      type: typeId,
      x: clear.x,
      y: clear.y,
      rot: snap?.rotDeg ?? opts.rotDeg ?? 0,
      circuit: opts.circuit ?? (circuits.size ? Math.max(...circuits) : 1),
      label: type.label,
      notes: '',
      ...(opts.mountHeightMm != null ? { mountHeightMm: opts.mountHeightMm } : {}),
    };
    this.pushHistory();
    this.components.update((list) => [...list, c]);
    this.editor.selectOne('component', c.id);
    return c;
  }

  /** Live move while dragging — no history entry (caller commits history separately). */
  moveComponentLive(id: string, x: number, y: number, rotDeg?: number): void {
    this.components.update((list) =>
      list.map((c) => (c.id === id ? { ...c, x, y, ...(rotDeg !== undefined ? { rot: rotDeg } : {}) } : c)),
    );
  }

  /** Live position of many components at once, e.g. a group drag. */
  setComponentPositionsLive(positions: ReadonlyMap<string, Point>): void {
    this.components.update((list) =>
      list.map((c) => {
        const p = positions.get(c.id);
        return p ? { ...c, x: p.x, y: p.y } : c;
      }),
    );
  }

  /** Snaps a single dragged component clear of overlaps and finalizes the move against a pre-drag snapshot. */
  commitComponentDrag(ids: readonly string[], preDragSnapshot: string): void {
    if (ids.length === 1) {
      const c = this.components().find((x) => x.id === ids[0]);
      if (c) {
        const clear = avoidOverlap(c, this.components(), c.id);
        this.components.update((list) => list.map((x) => (x.id === c.id ? { ...x, ...clear } : x)));
      }
    }
    this.pushHistory(preDragSnapshot);
  }

  /** Patches components as ONE undo step. */
  updateComponents(ids: readonly string[], patch: Partial<ComponentInstance>): void {
    if (!ids.length) return;
    const set = new Set(ids);
    this.pushHistory();
    this.components.update((list) => list.map((c) => (set.has(c.id) ? { ...c, ...patch } : c)));
  }

  updateComponent(id: string, patch: Partial<ComponentInstance>): void {
    this.updateComponents([id], patch);
  }

  /** Removes the referenced elements (and anything that depends on them) as ONE undo step. */
  deleteElements(refs: readonly ElementRef[]): void {
    if (!refs.length) return;
    this.pushHistory();
    const next = removeElements(
      { walls: this.walls(), rooms: this.rooms(), components: this.components(), wires: this.wires() },
      refs,
    );
    this.walls.set([...next.walls]);
    this.rooms.set([...next.rooms]);
    this.components.set([...next.components]);
    this.wires.set([...next.wires]);
    const gone = new Set(refs.map((r) => `${r.kind}:${r.id}`));
    this.editor.setSelection(this.editor.selection().filter((r) => !gone.has(`${r.kind}:${r.id}`)));
  }

  deleteSelection(): void {
    this.deleteElements(this.editor.selection());
  }

  // ---------------------------------------------------------------------
  // Walls / rooms
  // ---------------------------------------------------------------------
  /** Commits a drafted wall chain. If it closes back on its own start with 3+ segments, registers a room too. */
  commitWallChain(points: readonly Point[], dims: WallDims = this.defaultWallDims()): void {
    const pts = points.filter((p, i) => i === 0 || distance(p, points[i - 1]) > 1e-6);
    if (pts.length < 2) return;
    points = pts;
    this.pushHistory();
    const newWalls: Wall[] = [];
    for (let i = 0; i < points.length - 1; i++) {
      newWalls.push({
        id: this.ids.next('wall'),
        x1: points[i].x,
        y1: points[i].y,
        x2: points[i + 1].x,
        y2: points[i + 1].y,
        thicknessMm: dims.thicknessMm,
        heightMm: dims.heightMm,
      });
    }
    this.walls.update((list) => [...list, ...newWalls]);

    const first = points[0];
    const last = points[points.length - 1];
    if (newWalls.length >= 3 && distance(first, last) < 0.05) {
      this.rooms.update((list) => [
        ...list,
        { id: this.ids.next('room'), label: `Room ${list.length + 1}`, wallIds: newWalls.map((w) => w.id) },
      ]);
    }
  }

  /** Patches walls as ONE undo step. */
  updateWalls(ids: readonly string[], patch: Partial<Pick<Wall, 'thicknessMm' | 'heightMm'>>): void {
    if (!ids.length) return;
    const set = new Set(ids);
    this.pushHistory();
    this.walls.update((list) => list.map((w) => (set.has(w.id) ? { ...w, ...patch } : w)));
  }

  private defaultWallDims(): WallDims {
    return { thicknessMm: this.editor.wallThicknessMm(), heightMm: this.editor.wallHeightMm() };
  }

  addQuickRoom(x1: number, y1: number, x2: number, y2: number, dims: WallDims = this.defaultWallDims()): void {
    if (Math.abs(x2 - x1) < 0.3 || Math.abs(y2 - y1) < 0.3) return;
    const X1 = Math.min(x1, x2);
    const X2 = Math.max(x1, x2);
    const Y1 = Math.min(y1, y2);
    const Y2 = Math.max(y1, y2);
    const corners: Point[] = [
      { x: X1, y: Y1 },
      { x: X2, y: Y1 },
      { x: X2, y: Y2 },
      { x: X1, y: Y2 },
      { x: X1, y: Y1 },
    ];
    this.pushHistory();
    const newWalls: Wall[] = [];
    for (let i = 0; i < 4; i++) {
      newWalls.push({
        id: this.ids.next('wall'),
        x1: corners[i].x,
        y1: corners[i].y,
        x2: corners[i + 1].x,
        y2: corners[i + 1].y,
        thicknessMm: dims.thicknessMm,
        heightMm: dims.heightMm,
      });
    }
    this.walls.update((list) => [...list, ...newWalls]);
    this.rooms.update((list) => [
      ...list,
      { id: this.ids.next('room'), label: `Room ${list.length + 1}`, wallIds: newWalls.map((w) => w.id) },
    ]);
  }

  renameRoom(id: string, label: string): void {
    this.pushHistory();
    this.rooms.update((list) => list.map((r) => (r.id === id ? { ...r, label } : r)));
  }

  removeRoomFill(id: string): void {
    this.pushHistory();
    this.rooms.update((list) => list.filter((r) => r.id !== id));
  }

  // ---------------------------------------------------------------------
  // Wiring
  // ---------------------------------------------------------------------
  addWire(aId: string, bId: string, circuit?: number | null): void {
    if (aId === bId) return;
    const a = this.components().find((c) => c.id === aId);
    if (!a) return;
    this.pushHistory();
    this.wires.update((list) => [...list, { id: this.ids.next('wire'), a: aId, b: bId, circuit: circuit ?? a.circuit }]);
  }

  /** Patches wires as ONE undo step. */
  updateWires(ids: readonly string[], patch: Partial<Pick<Wire, 'circuit'>>): void {
    if (!ids.length) return;
    const set = new Set(ids);
    this.pushHistory();
    this.wires.update((list) => list.map((w) => (set.has(w.id) ? { ...w, ...patch } : w)));
  }

  // ---------------------------------------------------------------------
  // Background underlay
  // ---------------------------------------------------------------------
  setBackgroundImage(dataUrl: string): void {
    this.pushHistory();
    this.bgImage.set(dataUrl);
  }

  clearBackground(): void {
    this.pushHistory();
    this.bgImage.set(null);
  }

  setBackgroundOpacity(v: number): void {
    this.bgOpacity.set(v);
  }

  // ---------------------------------------------------------------------
  // Backend interop
  // ---------------------------------------------------------------------
  toProjectDto(): ProjectDto {
    return {
      id: this.serverId(),
      name: this.projectName(),
      scalePxPerMeter: this.scalePxPerMeter,
      walls: this.walls(),
      rooms: this.rooms(),
      components: this.components(),
      wires: this.wires(),
    };
  }

  applyProjectDto(dto: ProjectDto): void {
    this.pushHistory();
    this.serverId.set(dto.id);
    this.projectName.set(dto.name);
    this.walls.set(dto.walls);
    this.rooms.set(dto.rooms);
    this.components.set(dto.components);
    this.wires.set(dto.wires);
    this.editor.clearSelection();
  }

  // ---------------------------------------------------------------------
  // Demo seed data
  // ---------------------------------------------------------------------
  private loadDemoProject(): void {
    const wallDefs: Omit<Wall, 'id' | 'thicknessMm' | 'heightMm'>[] = [
      { x1: 0, y1: 0, x2: 4, y2: 0 }, // north
      { x1: 4, y1: 0, x2: 4, y2: 2.1 }, // east upper (window gap 2.1-3.1)
      { x1: 4, y1: 3.1, x2: 4, y2: 5 }, // east lower
      { x1: 4, y1: 5, x2: 1.6, y2: 5 }, // south right (door gap 0-1.6)
      { x1: 0, y1: 5, x2: 0, y2: 0 }, // west
    ];
    const walls: Wall[] = wallDefs.map((w) => ({ ...w, id: this.ids.next('wall'), thicknessMm: WALL_THICKNESS_MM.default, heightMm: WALL_HEIGHT_MM.default }));
    this.walls.set(walls);
    this.rooms.set([{ id: this.ids.next('room'), label: 'Bedroom', wallIds: walls.map((w) => w.id) }]);

    const comp = (type: string, x: number, y: number, rot: number, circuit: number, label: string): ComponentInstance => ({
      id: this.ids.next('comp'),
      type,
      x,
      y,
      rot,
      circuit,
      label,
      notes: '',
    });

    const panel = comp('panel', 0.08, 0.6, 90, 1, 'Main Panel');
    const sw1 = comp('switch-single', 1.6, 4.92, 180, 2, 'Entry Switch');
    const sw2 = comp('switch-dimmer', 3.85, 2.55, 0, 2, 'Bed Dimmer');
    const light = comp('light-ceiling', 2.0, 2.5, 0, 2, 'Ceiling Light');
    const o1 = comp('outlet-duplex', 0.08, 1.6, 90, 3, 'Outlet — West');
    const o2 = comp('outlet-duplex', 0.08, 3.6, 90, 3, 'Outlet — West 2');
    const o3 = comp('outlet-gfci', 3.92, 4.4, -90, 3, 'Outlet — Bedside');
    const o4 = comp('outlet-duplex', 2.8, 0.08, 0, 3, 'Outlet — North');
    const usb = comp('outlet-usb', 1.2, 0.08, 0, 3, 'USB Outlet');
    const jbox = comp('junction', 2.0, 0.08, 0, 2, 'Ceiling Junction');
    this.components.set([panel, sw1, sw2, light, o1, o2, o3, o4, usb, jbox]);

    const wire = (a: ComponentInstance, b: ComponentInstance, circuit: number): Wire => ({
      id: this.ids.next('wire'),
      a: a.id,
      b: b.id,
      circuit,
    });
    this.wires.set([
      wire(panel, sw1, 2),
      wire(sw1, jbox, 2),
      wire(jbox, sw2, 2),
      wire(jbox, light, 2),
      wire(panel, o1, 3),
      wire(o1, o2, 3),
      wire(o2, o4, 3),
      wire(o4, usb, 3),
      wire(o4, o3, 3),
    ]);
  }
}
