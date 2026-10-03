# Ichnos Backend

Persistence API for Ichnos, the electrical blueprint designer.
Java 21, Spring Boot 4.1 (Spring Framework 7, Jakarta EE 11), PostgreSQL, Flyway.

## Run locally with Docker Compose (recommended)

From the folder containing both `docker-compose.yml` and `backend/`:

```bash
docker compose up --build
```

This starts Postgres on `5432` and the API on `8080`. Flyway applies the schema
automatically on boot (`src/main/resources/db/migration/V1__init.sql`).

## Run without Docker

Requires a local PostgreSQL instance and an `ichnos` database/user (or override
via the `DB_HOST` / `DB_PORT` / `DB_NAME` / `DB_USER` / `DB_PASSWORD` env vars).

```bash
cd backend
mvn spring-boot:run
```

## Running the tests

```bash
mvn test
```

Two layers:
- **`ProjectServiceTest`** — fast unit tests (Mockito, no Spring context, no database)
  covering the graph-building logic: id remapping, and the defensive dropping of rooms
  that don't resolve to a closed loop or wires that reference an unknown component.
- **`ProjectControllerIntegrationTest`** — full-stack tests using a real embedded server
  and a real PostgreSQL instance via **Testcontainers** (`@ServiceConnection` wires the
  datasource automatically), exercised through Spring Framework 7's new **RestTestClient**.
  Requires Docker to be available wherever you run `mvn test`.

## API docs

With the app running, interactive docs are at `http://localhost:8080/swagger-ui.html`
(raw OpenAPI document at `/v3/api-docs`) — courtesy of springdoc-openapi 3.x, the
Spring Boot 4-compatible line.

## Connecting a frontend

There are two companion frontends in this repo, and both talk to this API the same way:
- **`ichnos-blueprint-designer.html`** — the original single-file mockup. Go to the
  **Project** tab (desktop) or **Menu → Rooms, stats & backend sync** (mobile).
- **`frontend/`** — the Angular + daisyUI rewrite. Go to the **Project** tab (desktop)
  or **Menu** (mobile).

Either way, confirm the Backend URL field reads `http://localhost:8080/api`. The status
chip pings `/api/health`; **Save to server** and **Load latest** call the endpoints below.

## API

| Method | Path                | Description                                  |
|--------|---------------------|-----------------------------------------------|
| GET    | `/api/health`       | Liveness check                                |
| GET    | `/api/projects`     | List saved projects (summary, newest first)   |
| GET    | `/api/projects/{id}`| Full project graph                            |
| POST   | `/api/projects`     | Create a project (full graph in body)         |
| PUT    | `/api/projects/{id}`| Replace a project's full graph                |
| DELETE | `/api/projects/{id}`| Delete a project                              |

The API treats each save as the frontend's complete current document — walls,
rooms, components and wires are replaced wholesale on `PUT` rather than diffed,
matching how the CAD-style editor already works (it always has the full state
in memory). Client-generated ids (e.g. `comp_12`) are accepted on the way in for
cross-referencing within the same payload, but the server always issues its own
ids on the way out — the frontend adopts those after the first successful save.

## Known simplifications (this is a mockup companion, not a production service)

- No authentication/authorization — anyone who can reach the API can read/write any project.
- CORS is wide open (`WebConfig`) since the frontends are static files/local dev servers
  with no fixed origin.
- No API versioning, rate limiting, or pagination on the project list.
- No optimistic-concurrency handling on the frontend side, though the entity carries
  a `@Version` column ready for it.

## Verification note

I don't have network access in the sandbox this was built in, so none of this has been
run through an actual `mvn test` or `mvn spring-boot:run` — no Maven Central access to
resolve dependencies. I did the same static review pass as the rest of this project
(import resolution, package/directory consistency, brace balance) and cross-checked the
Spring Boot 4 / Spring Framework 7 APIs used here (`RestTestClient`, `@ServiceConnection`,
the `LocalServerPort` package) against current official docs before writing them, since I
couldn't compile-check them myself. Treat it as carefully reviewed, not build-verified —
the same caveat as the rest of this project.
