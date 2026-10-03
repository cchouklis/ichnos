import { AfterViewInit, ChangeDetectionStrategy, Component, ElementRef, OnDestroy, ViewChild, effect, inject } from '@angular/core';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { mmToMeters } from '../../core/units/units.util';
import { ProjectStore } from '../../core/state/project-store.service';
import { typeById } from '../../core/data/component-types.data';
import { wireWaypoints } from '../../core/util/geometry.util';
import { ThemeService } from '../../core/theme/theme.service';
import { SCENE_COLORS, circuitColor } from '../../core/theme/theme.util';

@Component({
  selector: 'cp-viewer3d',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="relative h-full w-full bg-base-300">
      <div #container class="h-full w-full"></div>
      <div class="pointer-events-none absolute bottom-3 left-3 rounded-md border border-base-content/10 bg-base-100/70 px-2.5 py-1.5 font-mono text-[10px] text-base-content/70">
        Drag to orbit · scroll / pinch to zoom
      </div>
    </div>
  `,
})
export class Viewer3dComponent implements AfterViewInit, OnDestroy {
  private readonly store = inject(ProjectStore);
  private readonly theme = inject(ThemeService);

  @ViewChild('container', { static: true }) private containerRef!: ElementRef<HTMLDivElement>;

  private renderer?: THREE.WebGLRenderer;
  private scene?: THREE.Scene;
  private camera?: THREE.PerspectiveCamera;
  private controls?: OrbitControls;
  private hemi?: THREE.HemisphereLight;
  private floorMaterial?: THREE.MeshStandardMaterial;
  private grid?: THREE.GridHelper;
  private wallMaterial?: THREE.MeshStandardMaterial;
  private readonly wallGroup = new THREE.Group();
  private readonly compGroup = new THREE.Group();
  private readonly wireGroup = new THREE.Group();
  private resizeObserver?: ResizeObserver;
  private frameId = 0;
  private clock = 0;

  constructor() {
    // Sync the 3D scene to document state — the canonical use of effect() for
    // bridging signals into a non-Angular rendering library.
    effect(() => {
      this.store.walls();
      this.store.rooms();
      this.store.components();
      this.store.wires();
      if (this.scene) this.rebuildScene();
    });

    // Recolour the scene when the theme changes, without rebuilding geometry.
    effect(() => {
      this.theme.effective();
      if (this.scene) this.applyTheme();
    });
  }

  ngAfterViewInit(): void {
    this.initScene();
    this.rebuildScene();
    this.animate();
    this.resizeObserver = new ResizeObserver(() => this.handleResize());
    this.resizeObserver.observe(this.containerRef.nativeElement);
  }

  ngOnDestroy(): void {
    cancelAnimationFrame(this.frameId);
    this.resizeObserver?.disconnect();
    this.controls?.dispose();
    this.renderer?.dispose();
  }

  private initScene(): void {
    const el = this.containerRef.nativeElement;
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(50, el.clientWidth / Math.max(1, el.clientHeight), 0.1, 100);
    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(el.clientWidth, el.clientHeight);
    el.appendChild(this.renderer.domElement);

    const colors = SCENE_COLORS[this.theme.effective()];
    this.hemi = new THREE.HemisphereLight(colors.hemiSky, colors.hemiGround, 0.9);
    this.scene.add(this.hemi);
    const dir = new THREE.DirectionalLight(0xfff2d8, 0.9);
    dir.position.set(6, 10, 4);
    this.scene.add(dir);
    this.scene.add(this.wallGroup, this.compGroup, this.wireGroup);

    this.floorMaterial = new THREE.MeshStandardMaterial({ color: colors.floor, roughness: 0.95 });
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(60, 60), this.floorMaterial);
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = -0.001;
    this.scene.add(floor);
    this.grid = new THREE.GridHelper(60, 60, colors.gridMajor, colors.gridMinor);
    this.scene.add(this.grid);

    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.target.set(2, 0.9, 2.5);
    this.camera.position.set(6, 6, 9);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.08;
    this.controls.maxPolarAngle = Math.PI / 2 - 0.02;
    this.controls.minDistance = 2.5;
    this.controls.maxDistance = 26;
    this.controls.update();
  }

  private rebuildScene(): void {
    for (const group of [this.wallGroup, this.compGroup, this.wireGroup]) {
      while (group.children.length) {
        const child = group.children[0] as THREE.Mesh | THREE.Line;
        group.remove(child);
        child.geometry?.dispose();
        const material = child.material;
        if (Array.isArray(material)) material.forEach((m) => m.dispose());
        else material?.dispose();
      }
    }

    const wallMat = new THREE.MeshStandardMaterial({ color: SCENE_COLORS[this.theme.effective()].wall, roughness: 0.9 });
    this.wallMaterial = wallMat;
    for (const w of this.store.walls()) {
      const len = Math.hypot(w.x2 - w.x1, w.y2 - w.y1);
      if (len < 0.01) continue;
      const mesh = new THREE.Mesh(new THREE.BoxGeometry(len, mmToMeters(w.heightMm), mmToMeters(w.thicknessMm)), wallMat);
      mesh.position.set((w.x1 + w.x2) / 2, mmToMeters(w.heightMm) / 2, (w.y1 + w.y2) / 2);
      mesh.rotation.y = -Math.atan2(w.y2 - w.y1, w.x2 - w.x1);
      this.wallGroup.add(mesh);
    }

    for (const c of this.store.components()) {
      const t = typeById(c.type);
      const mesh = this.buildComponentMesh(t.cat, t.color);
      mesh.position.set(c.x, mmToMeters(c.mountHeightMm ?? t.mountHeightMm), c.y);
      mesh.rotation.y = -((c.rot || 0) * Math.PI) / 180;
      mesh.userData['baseColor'] = t.color;
      this.compGroup.add(mesh);
    }

    const comps = this.store.components();
    for (const w of this.store.wires()) {
      const a = comps.find((c) => c.id === w.a);
      const b = comps.find((c) => c.id === w.b);
      if (!a || !b) continue;
      const ha = mmToMeters(a.mountHeightMm ?? typeById(a.type).mountHeightMm);
      const hb = mmToMeters(b.mountHeightMm ?? typeById(b.type).mountHeightMm);
      const waypoints = wireWaypoints(a, b);
      const riseY = Math.max(ha, hb) + 0.15;
      const pts = [
        new THREE.Vector3(a.x, ha, a.y),
        ...waypoints.slice(1, -1).map((p) => new THREE.Vector3(p.x, riseY, p.y)),
        new THREE.Vector3(b.x, hb, b.y),
      ];
      const line = new THREE.Line(
        new THREE.BufferGeometry().setFromPoints(pts),
        new THREE.LineBasicMaterial({
          color: new THREE.Color(circuitColor(this.theme.effective(), w.circuit)),
          transparent: true,
          opacity: 0.85,
        }),
      );
      line.userData['circuit'] = w.circuit;
      this.wireGroup.add(line);
    }

    const walls = this.store.walls();
    if (walls.length && this.controls) {
      const xs = walls.flatMap((w) => [w.x1, w.x2]);
      const ys = walls.flatMap((w) => [w.y1, w.y2]);
      this.controls.target.set((Math.min(...xs) + Math.max(...xs)) / 2, 0.9, (Math.min(...ys) + Math.max(...ys)) / 2);
      this.controls.update();
    }
  }

  /** Applies the current theme's colours to the existing scene objects. */
  private applyTheme(): void {
    const colors = SCENE_COLORS[this.theme.effective()];
    this.hemi?.color.setHex(colors.hemiSky);
    this.hemi?.groundColor.setHex(colors.hemiGround);
    this.floorMaterial?.color.setHex(colors.floor);
    this.wallMaterial?.color.setHex(colors.wall);
    if (this.grid && this.scene) {
      this.scene.remove(this.grid);
      this.grid.geometry.dispose();
      (this.grid.material as THREE.Material).dispose();
      this.grid = new THREE.GridHelper(60, 60, colors.gridMajor, colors.gridMinor);
      this.scene.add(this.grid);
    }
    // Wire colours depend on the theme as well; recolour them in place so the camera is left alone.
    for (const line of this.wireGroup.children) {
      const material = (line as THREE.Line).material as THREE.LineBasicMaterial;
      material.color.set(circuitColor(this.theme.effective(), Number(line.userData['circuit'])));
    }
  }

  private buildComponentMesh(cat: string, color: string): THREE.Mesh {
    let geo: THREE.BufferGeometry;
    if (cat === 'lighting') geo = new THREE.SphereGeometry(0.11, 12, 10);
    else if (cat === 'distribution') geo = new THREE.BoxGeometry(0.5, 0.7, 0.15);
    else if (cat === 'switches') geo = new THREE.BoxGeometry(0.09, 0.14, 0.05);
    else if (cat === 'boxes') geo = new THREE.CylinderGeometry(0.06, 0.06, 0.08, 8);
    else geo = new THREE.BoxGeometry(0.11, 0.08, 0.05); // outlets
    const mat = new THREE.MeshStandardMaterial({ color: new THREE.Color(color), roughness: 0.5, metalness: 0.1 });
    return new THREE.Mesh(geo, mat);
  }

  private handleResize(): void {
    if (!this.renderer || !this.camera) return;
    const el = this.containerRef.nativeElement;
    const w = el.clientWidth;
    const h = el.clientHeight;
    if (w < 10 || h < 10) return;
    this.renderer.setSize(w, h);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
  }

  private readonly animate = (): void => {
    this.frameId = requestAnimationFrame(this.animate);
    this.clock += 0.045;

    if (this.store.simulate()) {
      const pulse = (Math.sin(this.clock * 2.2) + 1) / 2;
      for (const m of this.compGroup.children) {
        const mat = (m as THREE.Mesh).material as THREE.MeshStandardMaterial;
        mat.emissive = new THREE.Color(m.userData['baseColor'] as string).multiplyScalar(0.15 + pulse * 0.5);
      }
      for (const l of this.wireGroup.children) {
        ((l as THREE.Line).material as THREE.LineBasicMaterial).opacity = 0.5 + pulse * 0.5;
      }
    } else {
      for (const m of this.compGroup.children) {
        ((m as THREE.Mesh).material as THREE.MeshStandardMaterial).emissive.set(0x000000);
      }
      for (const l of this.wireGroup.children) {
        ((l as THREE.Line).material as THREE.LineBasicMaterial).opacity = 0.85;
      }
    }

    this.controls?.update();
    if (this.renderer && this.scene && this.camera) {
      this.renderer.render(this.scene, this.camera);
    }
  };
}
