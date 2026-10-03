package io.elagein.web;

import io.elagein.web.dto.ComponentDto;
import io.elagein.web.dto.ProjectDto;
import io.elagein.web.dto.RoomDto;
import io.elagein.web.dto.WallDto;
import io.elagein.web.dto.WireDto;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.server.LocalServerPort;
import org.springframework.boot.testcontainers.service.connection.ServiceConnection;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.client.RestTestClient;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Exercises the full stack — real embedded Tomcat, real PostgreSQL (via Testcontainers),
 * Flyway-migrated schema — the same path a real save/load from the Angular frontend takes.
 * Unit-level coverage of the graph-building edge cases lives in {@code ProjectServiceTest};
 * this class is deliberately smaller and focused on the wire-level round trip.
 */
@Testcontainers
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
class ProjectControllerIntegrationTest {

    @Container
    @ServiceConnection
    static final PostgreSQLContainer<?> POSTGRES = new PostgreSQLContainer<>("postgres:17-alpine");

    @LocalServerPort
    private int port;

    private RestTestClient client;

    @BeforeEach
    void setUp() {
        client = RestTestClient.bindToServer()
                .baseUrl("http://localhost:" + port + "/api")
                .build();
    }

    @Test
    void healthEndpoint_reportsUp() {
        client.get().uri("/health")
                .exchange()
                .expectStatus().isOk()
                .expectBody()
                .jsonPath("$.status").isEqualTo("UP");
    }

    @Test
    void createThenFetch_roundTripsTheFullDocumentGraph() {
        ProjectDto request = new ProjectDto();
        request.name = "Integration Test Room";
        request.scalePxPerMeter = 60;
        request.walls = List.of(
                new WallDto("wall_1", 0, 0, 4, 0, 0.12, 2.7),
                new WallDto("wall_2", 4, 0, 4, 4, 0.12, 2.7),
                new WallDto("wall_3", 4, 4, 0, 4, 0.12, 2.7));
        request.rooms = List.of(new RoomDto("room_1", "Bedroom", List.of("wall_1", "wall_2", "wall_3")));
        request.components = List.of(
                new ComponentDto("comp_1", "outlet-duplex", 0, 1, 90, 1, "Outlet A", "", null),
                new ComponentDto("comp_2", "switch-single", 2, 0, 0, 1, "Switch B", "", null));
        request.wires = List.of(new WireDto("wire_1", "comp_1", "comp_2", 1));

        ProjectDto created = client.post().uri("/projects")
                .contentType(MediaType.APPLICATION_JSON)
                .body(request)
                .exchange()
                .expectStatus().isCreated()
                .expectBody(ProjectDto.class)
                .returnResult()
                .getResponseBody();

        assertThat(created).isNotNull();
        assertThat(created.id).isNotBlank();
        assertThat(created.walls).hasSize(3);
        assertThat(created.components).hasSize(2);
        assertThat(created.wires).hasSize(1);

        ProjectDto fetched = client.get().uri("/projects/" + created.id)
                .exchange()
                .expectStatus().isOk()
                .expectBody(ProjectDto.class)
                .returnResult()
                .getResponseBody();

        assertThat(fetched).isNotNull();
        assertThat(fetched.name).isEqualTo("Integration Test Room");
        assertThat(fetched.walls).hasSize(3);
        assertThat(fetched.rooms).hasSize(1);
        assertThat(fetched.rooms.get(0).wallIds).hasSize(3);
        assertThat(fetched.wires).hasSize(1);
        // wire endpoints are server-assigned ids — just assert they resolve to real components
        assertThat(fetched.components.stream().map(c -> c.id))
                .contains(fetched.wires.get(0).a, fetched.wires.get(0).b);
    }

    @Test
    void get_returns404_forUnknownId() {
        client.get().uri("/projects/does-not-exist")
                .exchange()
                .expectStatus().isNotFound();
    }

    @Test
    void create_returns400_whenRequiredFieldsAreMissing() {
        ProjectDto invalid = new ProjectDto(); // name is @NotBlank and left null

        client.post().uri("/projects")
                .contentType(MediaType.APPLICATION_JSON)
                .body(invalid)
                .exchange()
                .expectStatus().isBadRequest();
    }

    @Test
    void listProjects_includesACreatedProject() {
        ProjectDto request = new ProjectDto();
        request.name = "Listable Room";

        client.post().uri("/projects")
                .contentType(MediaType.APPLICATION_JSON)
                .body(request)
                .exchange()
                .expectStatus().isCreated();

        client.get().uri("/projects")
                .exchange()
                .expectStatus().isOk()
                .expectBody()
                .jsonPath("$[?(@.name == 'Listable Room')]").exists();
    }
}
