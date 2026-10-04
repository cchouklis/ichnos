import { AfterViewInit, ChangeDetectionStrategy, Component, ElementRef, OnDestroy, ViewChild, effect, inject } from '@angular/core';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { typeById } from '../../core/data/component-types.data';
import type { ComponentCategory } from '../../core/models';
import {
  LAMP_CANDELA,
  LAMP_COLOR,
  ambientLevels,
  brightestLamps,
  lightingProfileFor,
  type LightingProfile,
} from '../../core/simulation/lighting-profile';
import { SimulationService } from '../../core/simulation/simulation.service';
import { ProjectStore } from '../../core/state/project-store.service';
import { SCENE_COLORS, circuitColor } from '../../core/theme/theme.util';
import { ThemeService } from '../../core/theme/theme.service';
import { mmToMeters } from '../../core/units/units.util';
import { wireWaypoints } from '../../core/util/geometry.util';

interface Lamp {
  readonly componentId: string;
  readonly mesh: THREE.Mesh<THREE.BufferGeometry, THREE.MeshStandardMaterial>;
  readonly glow: THREE.Sprite;
}

const CLICK_TOLERANCE_PX = 4;
const SWITCH_PICK_RADIUS = 0.2;
const WIRE_OPACITY = { idle: 0.85, energized: 1, dead: 0.3 };
const GLOW_BASE_SCALE = 0.5;
const GLOW_LEVEL_SCALE = 1.1;
const SHADOW_BIAS = -0.002;
const SHADOW_FAR_M = 12;

function disposeChildren(group: THREE.Object3D): void {
  group.traverse((object) => {
    const renderable = object as THREE.Mesh;
    renderable.geometry?.dispose();
    const materials = Array.isArray(renderable.material) ? renderable.material : [renderable.material];
    materials.forEach((material) => material?.dispose());
  });
  group.clear();
}

function createGlowTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 64;
  const ctx = canvas.getContext('2d') as CanvasRenderingContext2D;
  const gradient = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
  gradient.addColorStop(0, 'rgba(255,255,255,1)');
  gradient.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 64, 64);
  return new THREE.CanvasTexture(canvas);
}

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
  private readonly sim = inject(SimulationService);

  @ViewChild('container', { static: true }) private containerRef!: ElementRef<HTMLDivElement>;

  private renderer?: THREE.WebGLRenderer;
  private scene?: THREE.Scene;
  private camera?: THREE.PerspectiveCamera;
  private controls?: OrbitControls;
  private hemi?: THREE.HemisphereLight;
  private sun?: THREE.DirectionalLight;
  private floorMaterial?: THREE.MeshStandardMaterial;
  private grid?: THREE.GridHelper;
  private wallMaterial?: THREE.MeshStandardMaterial;
  private resizeObserver?: ResizeObserver;
  private frameId = 0;
  private profile: LightingProfile = lightingProfileFor(false);
  private lightPool: THREE.PointLight[] = [];
  private lamps: Lamp[] = [];
  private pointerDown?: { x: number; y: number };
  private readonly glowTexture = createGlowTexture();
  private readonly raycaster = new THREE.Raycaster();
  private readonly wallGroup = new THREE.Group();
  private readonly compGroup = new THREE.Group();
  private readonly wireGroup = new THREE.Group();

  constructor() {
    effect(() => {
      this.store.walls();
      this.store.rooms();
      this.store.components();
      this.store.wires();
      if (this.scene) this.rebuildScene();
    });

    effect(() => {
      this.theme.effective();
      if (this.scene) this.applyTheme();
    });

    effect(() => {
      this.sim.state();
      this.sim.enabled();
      this.sim.daylight();
      if (this.scene) this.applyPower();
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
    this.detachPointerHandlers();
    this.controls?.dispose();
    this.glowTexture.dispose();
    [this.wallGroup, this.compGroup, this.wireGroup].forEach(disposeChildren);
    this.renderer?.dispose();
  }

  private initScene(): void {
    const el = this.containerRef.nativeElement;
    this.profile = lightingProfileFor(window.matchMedia('(pointer: coarse)').matches);
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(50, el.clientWidth / Math.max(1, el.clientHeight), 0.1, 100);
    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(el.clientWidth, el.clientHeight);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    el.appendChild(this.renderer.domElement);

    const colors = SCENE_COLORS[this.theme.effective()];
    this.hemi = new THREE.HemisphereLight(colors.hemiSky, colors.hemiGround, 0.9);
    this.sun = new THREE.DirectionalLight(0xfff2d8, 0.9);
    this.sun.position.set(6, 10, 4);
    this.scene.add(this.hemi, this.sun, this.wallGroup, this.compGroup, this.wireGroup);
    this.createLightPool();

    this.floorMaterial = new THREE.MeshStandardMaterial({ color: colors.floor, roughness: 0.95 });
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(60, 60), this.floorMaterial);
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = -0.001;
    floor.receiveShadow = true;
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

    this.attachPointerHandlers();
  }

  private createLightPool(): void {
    const { poolSize, shadowCasters, shadowMapSize } = this.profile;
    this.lightPool = Array.from({ length: poolSize }, (_, index) => {
      const light = new THREE.PointLight(LAMP_COLOR, 0, 0, 2);
      light.castShadow = index < shadowCasters;
      light.shadow.mapSize.set(shadowMapSize, shadowMapSize);
      light.shadow.bias = SHADOW_BIAS;
      light.shadow.camera.near = 0.1;
      light.shadow.camera.far = SHADOW_FAR_M;
      this.scene?.add(light);
      return light;
    });
  }

  private rebuildScene(): void {
    [this.wallGroup, this.compGroup, this.wireGroup].forEach(disposeChildren);
    this.lamps = [];
    this.buildWalls();
    this.buildComponents();
    this.buildWires();
    this.frameTarget();
    this.applyPower();
  }

  private buildWalls(): void {
    this.wallMaterial = new THREE.MeshStandardMaterial({ color: SCENE_COLORS[this.theme.effective()].wall, roughness: 0.9 });
    for (const wall of this.store.walls()) {
      const length = Math.hypot(wall.x2 - wall.x1, wall.y2 - wall.y1);
      if (length < 0.01) continue;
      const height = mmToMeters(wall.heightMm);
      const mesh = new THREE.Mesh(new THREE.BoxGeometry(length, height, mmToMeters(wall.thicknessMm)), this.wallMaterial);
      mesh.position.set((wall.x1 + wall.x2) / 2, height / 2, (wall.y1 + wall.y2) / 2);
      mesh.rotation.y = -Math.atan2(wall.y2 - wall.y1, wall.x2 - wall.x1);
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      this.wallGroup.add(mesh);
    }
  }

  private buildComponents(): void {
    for (const component of this.store.components()) {
      const type = typeById(component.type);
      const mesh = this.buildComponentMesh(type.cat, type.color);
      mesh.position.set(component.x, this.mountHeight(component.id), component.y);
      mesh.rotation.y = -((component.rot || 0) * Math.PI) / 180;
      mesh.userData['componentId'] = component.id;
      if (type.power === 'load') this.lamps.push(this.attachGlow(component.id, mesh));
      if (type.power === 'switch' || type.power === 'dimmer') mesh.add(this.createPickProxy());
      this.compGroup.add(mesh);
    }
  }

  private attachGlow(componentId: string, mesh: THREE.Mesh<THREE.BufferGeometry, THREE.MeshStandardMaterial>): Lamp {
    const glow = new THREE.Sprite(
      new THREE.SpriteMaterial({
        map: this.glowTexture,
        color: LAMP_COLOR,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        transparent: true,
      }),
    );
    mesh.add(glow);
    return { componentId, mesh, glow };
  }

  private createPickProxy(): THREE.Mesh {
    const proxy = new THREE.Mesh(new THREE.SphereGeometry(SWITCH_PICK_RADIUS, 8, 6), new THREE.MeshBasicMaterial());
    proxy.visible = false;
    return proxy;
  }

  private buildWires(): void {
    const components = this.store.components();
    for (const wire of this.store.wires()) {
      const a = components.find((c) => c.id === wire.a);
      const b = components.find((c) => c.id === wire.b);
      if (!a || !b) continue;
      const heightA = this.mountHeight(a.id);
      const heightB = this.mountHeight(b.id);
      const riseY = Math.max(heightA, heightB) + 0.15;
      const points = [
        new THREE.Vector3(a.x, heightA, a.y),
        ...wireWaypoints(a, b).slice(1, -1).map((p) => new THREE.Vector3(p.x, riseY, p.y)),
        new THREE.Vector3(b.x, heightB, b.y),
      ];
      const line = new THREE.Line(
        new THREE.BufferGeometry().setFromPoints(points),
        new THREE.LineBasicMaterial({
          color: new THREE.Color(circuitColor(this.theme.effective(), wire.circuit)),
          transparent: true,
          opacity: WIRE_OPACITY.idle,
        }),
      );
      line.userData['circuit'] = wire.circuit;
      line.userData['wireId'] = wire.id;
      this.wireGroup.add(line);
    }
  }

  private mountHeight(componentId: string): number {
    const component = this.store.components().find((c) => c.id === componentId);
    if (!component) return 0;
    return mmToMeters(component.mountHeightMm ?? typeById(component.type).mountHeightMm);
  }

  private frameTarget(): void {
    const walls = this.store.walls();
    if (!walls.length || !this.controls) return;
    const xs = walls.flatMap((w) => [w.x1, w.x2]);
    const ys = walls.flatMap((w) => [w.y1, w.y2]);
    this.controls.target.set((Math.min(...xs) + Math.max(...xs)) / 2, 0.9, (Math.min(...ys) + Math.max(...ys)) / 2);
    this.controls.update();
  }

  private applyPower(): void {
    const ambient = ambientLevels(this.sim.enabled(), this.sim.daylight());
    if (this.hemi) this.hemi.intensity = ambient.sky;
    if (this.sun) this.sun.intensity = ambient.sun;

    const ranked = this.lamps.map((lamp) => ({ lamp, level: this.sim.levelOf(lamp.componentId) }));
    for (const { lamp, level } of ranked) this.showLamp(lamp, level);
    this.assignPool(brightestLamps(ranked, this.lightPool.length));
    this.applyWireState();
  }

  private showLamp(lamp: Lamp, level: number): void {
    lamp.mesh.material.emissive.setHex(LAMP_COLOR);
    lamp.mesh.material.emissiveIntensity = level;
    lamp.glow.visible = level > 0;
    lamp.glow.material.opacity = level;
    lamp.glow.scale.setScalar(GLOW_BASE_SCALE + GLOW_LEVEL_SCALE * level);
  }

  private assignPool(lit: readonly { lamp: Lamp; level: number }[]): void {
    this.lightPool.forEach((light, index) => {
      const entry = lit[index];
      light.intensity = entry ? entry.level * LAMP_CANDELA : 0;
      if (entry) light.position.copy(entry.lamp.mesh.position);
    });
  }

  private applyWireState(): void {
    const { flows } = this.sim.state();
    const simulating = this.sim.enabled();
    for (const line of this.wireGroup.children as THREE.Line<THREE.BufferGeometry, THREE.LineBasicMaterial>[]) {
      const energized = flows.has(String(line.userData['wireId']));
      line.material.opacity = !simulating ? WIRE_OPACITY.idle : energized ? WIRE_OPACITY.energized : WIRE_OPACITY.dead;
    }
  }

  private applyTheme(): void {
    const colors = SCENE_COLORS[this.theme.effective()];
    this.hemi?.color.setHex(colors.hemiSky);
    this.hemi?.groundColor.setHex(colors.hemiGround);
    this.floorMaterial?.color.setHex(colors.floor);
    this.wallMaterial?.color.setHex(colors.wall);
    this.replaceGrid(colors.gridMajor, colors.gridMinor);
    for (const line of this.wireGroup.children as THREE.Line<THREE.BufferGeometry, THREE.LineBasicMaterial>[]) {
      line.material.color.set(circuitColor(this.theme.effective(), Number(line.userData['circuit'])));
    }
  }

  private replaceGrid(major: number, minor: number): void {
    if (!this.grid || !this.scene) return;
    this.scene.remove(this.grid);
    this.grid.geometry.dispose();
    (this.grid.material as THREE.Material).dispose();
    this.grid = new THREE.GridHelper(60, 60, major, minor);
    this.scene.add(this.grid);
  }

  private buildComponentMesh(category: ComponentCategory, color: string): THREE.Mesh<THREE.BufferGeometry, THREE.MeshStandardMaterial> {
    const geometry = this.geometryFor(category);
    const material = new THREE.MeshStandardMaterial({ color: new THREE.Color(color), roughness: 0.5, metalness: 0.1 });
    return new THREE.Mesh(geometry, material);
  }

  private geometryFor(category: ComponentCategory): THREE.BufferGeometry {
    switch (category) {
      case 'lighting':
        return new THREE.SphereGeometry(0.11, 12, 10);
      case 'distribution':
        return new THREE.BoxGeometry(0.5, 0.7, 0.15);
      case 'switches':
        return new THREE.BoxGeometry(0.09, 0.14, 0.05);
      case 'boxes':
        return new THREE.CylinderGeometry(0.06, 0.06, 0.08, 8);
      default:
        return new THREE.BoxGeometry(0.11, 0.08, 0.05);
    }
  }

  private readonly onPointerDown = (event: PointerEvent): void => {
    this.pointerDown = { x: event.clientX, y: event.clientY };
  };

  private readonly onPointerUp = (event: PointerEvent): void => {
    const start = this.pointerDown;
    this.pointerDown = undefined;
    if (!start || !this.sim.enabled()) return;
    if (Math.hypot(event.clientX - start.x, event.clientY - start.y) > CLICK_TOLERANCE_PX) return;
    const componentId = this.controlAt(event);
    if (componentId) this.sim.toggleSwitch(componentId);
  };

  private attachPointerHandlers(): void {
    const canvas = this.renderer?.domElement;
    canvas?.addEventListener('pointerdown', this.onPointerDown);
    canvas?.addEventListener('pointerup', this.onPointerUp);
  }

  private detachPointerHandlers(): void {
    const canvas = this.renderer?.domElement;
    canvas?.removeEventListener('pointerdown', this.onPointerDown);
    canvas?.removeEventListener('pointerup', this.onPointerUp);
  }

  private controlAt(event: PointerEvent): string | null {
    if (!this.renderer || !this.camera) return null;
    const rect = this.renderer.domElement.getBoundingClientRect();
    const ndc = new THREE.Vector2(((event.clientX - rect.left) / rect.width) * 2 - 1, -((event.clientY - rect.top) / rect.height) * 2 + 1);
    this.raycaster.setFromCamera(ndc, this.camera);
    for (const hit of this.raycaster.intersectObjects(this.compGroup.children, true)) {
      let object: THREE.Object3D | null = hit.object;
      while (object && object.userData['componentId'] === undefined) object = object.parent;
      const id = object?.userData['componentId'] as string | undefined;
      if (id && this.sim.isControl(id)) return id;
    }
    return null;
  }

  private handleResize(): void {
    if (!this.renderer || !this.camera) return;
    const el = this.containerRef.nativeElement;
    if (el.clientWidth < 10 || el.clientHeight < 10) return;
    this.renderer.setSize(el.clientWidth, el.clientHeight);
    this.camera.aspect = el.clientWidth / el.clientHeight;
    this.camera.updateProjectionMatrix();
  }

  private readonly animate = (): void => {
    this.frameId = requestAnimationFrame(this.animate);
    this.controls?.update();
    if (this.renderer && this.scene && this.camera) this.renderer.render(this.scene, this.camera);
  };
}
