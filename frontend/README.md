# Ichnos Frontend

Angular 22 (standalone components, signals) + Tailwind CSS 4 + daisyUI 5, wired to the
companion Spring Boot backend in `../backend`.

## Setup

```bash
npm install
npm start          # dev server on http://localhost:4200
npm run build      # production build to dist/
npm run typecheck  # strict ahead-of-time compile of code and templates, no output
npm test           # unit tests for the pure logic (Node's built-in test runner)
```

The app talks to the backend at `http://localhost:8080/api` by default. Change it in the
**Project** step of the drawer, or run `docker compose up` from the repo root. Everything
works locally without a backend; Save/Load will report the API as offline and you can still
use the export options in the **Review** step.

## Architecture

- **`core/models`**: types that mirror the backend's DTOs field for field, so the two ends
  never drift silently.
- **`core/state`**: `ProjectStore` holds the document (walls, rooms, components, wires) as
  signals, with snapshot-based undo and redo. Every undoable mutation calls `pushHistory()`
  immediately *before* changing state. `LayoutStore` holds UI layout state (drawer, active
  step), which never enters undo history or saves.
- **`core/theme`**: `ThemeService` (light, dark or follow the device) and the pure helpers it
  uses. `assets/theme-init.js` applies the saved theme before first paint.
- **`core/services`**: one focused injectable per concern (compliance checks, backend HTTP,
  export, icons, drag coordination, underlay upload).
- **`core/util`**: pure functions only, with no Angular imports, so they are unit tested
  directly. Tests sit next to the code as `*.test.ts`.
- **`features/*`**: one folder per UI area. `drawer` is the guided six-step project panel
  (Project, Rooms, Structure, Components, Wiring & power, Review); `canvas` is the 2D SVG
  editor; `viewer3d` is the Three.js view.

## Design decisions worth knowing about

- **Standalone components only, `OnPush` everywhere.** All state is signals, so `OnPush`
  is safe. Any state that a template reads must be a signal.
- **Two themes, `ichnos-light` and `ichnos-dark`**, defined in `src/styles.css`. Blue is the
  primary colour and magenta the accent. The test `core/theme/theme.contrast.test.ts` reads
  the stylesheet and fails if a text/background pair drops below WCAG AA. SVG and WebGL
  colours that cannot use CSS variables live in `core/theme/theme.util.ts`.
- **The drawer uses daisyUI's drawer pattern**: pinned beside the editor from 1024 px, an
  overlay below that. The selected component's properties are pinned at the top of the
  drawer in every step.
- **Underlay uploads** accept PNG, JPEG and WebP up to 5 MB, identified by file signature
  rather than by name or declared type. SVG is rejected.
- **Three.js via the npm package**, with `OrbitControls` from `three/examples/jsm`.

## Verification status

Checked in the development environment: the strict ahead-of-time compile passes with no
errors, and the unit tests pass. Not checked there, because the bundler and package registry
were unavailable: a full `ng build`, the compiled Tailwind/daisyUI CSS, and the running app.
Run `npm start` and look at both themes, the drawer at phone, tablet and desktop widths, and
the 3D view before relying on a phase.
