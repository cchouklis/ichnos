-- CircuitPlan initial schema

CREATE TABLE projects (
    id                  VARCHAR(36)  PRIMARY KEY,
    name                VARCHAR(200) NOT NULL,
    scale_px_per_meter  INTEGER      NOT NULL DEFAULT 60,
    version             BIGINT       NOT NULL DEFAULT 0,
    created_at          TIMESTAMPTZ  NOT NULL DEFAULT now(),
    updated_at          TIMESTAMPTZ  NOT NULL DEFAULT now()
);

CREATE TABLE walls (
    id          VARCHAR(36) PRIMARY KEY,
    project_id  VARCHAR(36) NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    x1          DOUBLE PRECISION NOT NULL,
    y1          DOUBLE PRECISION NOT NULL,
    x2          DOUBLE PRECISION NOT NULL,
    y2          DOUBLE PRECISION NOT NULL,
    thickness   DOUBLE PRECISION NOT NULL DEFAULT 0.12,
    height      DOUBLE PRECISION NOT NULL DEFAULT 2.7
);
CREATE INDEX idx_walls_project ON walls(project_id);

CREATE TABLE rooms (
    id          VARCHAR(36)  PRIMARY KEY,
    project_id  VARCHAR(36)  NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    label       VARCHAR(120) NOT NULL
);
CREATE INDEX idx_rooms_project ON rooms(project_id);

CREATE TABLE room_wall_ids (
    room_id   VARCHAR(36) NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
    position  INTEGER     NOT NULL,
    wall_id   VARCHAR(36) NOT NULL,
    PRIMARY KEY (room_id, position)
);

CREATE TABLE components (
    id            VARCHAR(36)  PRIMARY KEY,
    project_id    VARCHAR(36)  NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    type          VARCHAR(40)  NOT NULL,
    x             DOUBLE PRECISION NOT NULL,
    y             DOUBLE PRECISION NOT NULL,
    rotation      DOUBLE PRECISION NOT NULL DEFAULT 0,
    circuit       INTEGER      NOT NULL DEFAULT 1,
    label         VARCHAR(200) NOT NULL,
    notes         VARCHAR(2000),
    mount_height  DOUBLE PRECISION
);
CREATE INDEX idx_components_project ON components(project_id);
CREATE INDEX idx_components_circuit ON components(project_id, circuit);

CREATE TABLE wires (
    id               VARCHAR(36) PRIMARY KEY,
    project_id       VARCHAR(36) NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    component_a_id   VARCHAR(36) NOT NULL REFERENCES components(id) ON DELETE CASCADE,
    component_b_id   VARCHAR(36) NOT NULL REFERENCES components(id) ON DELETE CASCADE,
    circuit          INTEGER     NOT NULL DEFAULT 1
);
CREATE INDEX idx_wires_project ON wires(project_id);
