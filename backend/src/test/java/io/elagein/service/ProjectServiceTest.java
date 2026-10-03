package io.elagein.service;

import io.elagein.domain.ProjectEntity;
import io.elagein.repository.ProjectRepository;
import io.elagein.web.dto.ComponentDto;
import io.elagein.web.dto.ProjectDto;
import io.elagein.web.dto.RoomDto;
import io.elagein.web.dto.WallDto;
import io.elagein.web.dto.WireDto;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;

/**
 * Exercises {@link ProjectService}'s graph-building and defensive-validation logic in
 * isolation from Spring and the database. See {@code ProjectControllerIntegrationTest}
 * for the full-stack, real-Postgres equivalent of these same scenarios.
 */
@ExtendWith(MockitoExtension.class)
class ProjectServiceTest {

    @Mock
    private ProjectRepository projectRepository;

    private ProjectService service;

    @BeforeEach
    void setUp() {
        service = new ProjectService(projectRepository);
        // the repository is a pure pass-through here: we're testing the service's own
        // mapping logic, not persistence, so just hand back whatever it was asked to save
        when(projectRepository.save(any(ProjectEntity.class))).thenAnswer(inv -> inv.getArgument(0));
    }

    @Test
    void create_buildsFullGraphAndRemapsClientSuppliedIdsToServerIds() {
        ProjectDto dto = new ProjectDto();
        dto.name = "Test Room";
        dto.scalePxPerMeter = 60;
        dto.walls = List.of(
                new WallDto("wall_1", 0, 0, 4, 0, 0.12, 2.7),
                new WallDto("wall_2", 4, 0, 4, 4, 0.12, 2.7),
                new WallDto("wall_3", 4, 4, 0, 4, 0.12, 2.7));
        dto.rooms = List.of(new RoomDto("room_1", "Bedroom", List.of("wall_1", "wall_2", "wall_3")));
        dto.components = List.of(
                new ComponentDto("comp_1", "outlet-duplex", 0, 1, 90, 1, "Outlet A", "", null),
                new ComponentDto("comp_2", "switch-single", 2, 0, 0, 1, "Switch B", "", null));
        dto.wires = List.of(new WireDto("wire_1", "comp_1", "comp_2", 1));

        ProjectDto result = service.create(dto);

        assertThat(result.id).isNotBlank();
        assertThat(result.walls).hasSize(3);
        assertThat(result.rooms).hasSize(1);
        assertThat(result.rooms.get(0).wallIds).hasSize(3);
        assertThat(result.components).hasSize(2);
        assertThat(result.wires).hasSize(1);
        // the server re-issues its own ids rather than trusting client-supplied ones
        assertThat(result.walls.get(0).id).isNotEqualTo("wall_1");
        assertThat(result.rooms.get(0).wallIds).doesNotContain("wall_1", "wall_2", "wall_3");
    }

    @Test
    void create_dropsRoomsThatResolveToFewerThanThreeWalls() {
        ProjectDto dto = new ProjectDto();
        dto.name = "Broken room";
        dto.walls = List.of(new WallDto("wall_1", 0, 0, 4, 0, 0.12, 2.7));
        // references a wall id that isn't in this payload at all, on top of the one that is —
        // still only one wall resolves, below the 3-wall minimum for a closed loop
        dto.rooms = List.of(new RoomDto("room_1", "Too few walls", List.of("wall_1", "wall_missing")));

        ProjectDto result = service.create(dto);

        assertThat(result.rooms).isEmpty();
    }

    @Test
    void create_dropsWiresReferencingAComponentNotInThePayload() {
        ProjectDto dto = new ProjectDto();
        dto.name = "Dangling wire";
        dto.components = List.of(new ComponentDto("comp_1", "outlet-duplex", 0, 1, 90, 1, "Outlet A", "", null));
        dto.wires = List.of(new WireDto("wire_1", "comp_1", "comp_missing", 1));

        ProjectDto result = service.create(dto);

        assertThat(result.wires).isEmpty();
        assertThat(result.components).hasSize(1);
    }

    @Test
    void get_throwsNotFound_whenProjectDoesNotExist() {
        when(projectRepository.findWithGraphById("missing")).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.get("missing")).isInstanceOf(ProjectNotFoundException.class);
    }

    @Test
    void delete_throwsNotFound_whenProjectDoesNotExist() {
        when(projectRepository.existsById("missing")).thenReturn(false);

        assertThatThrownBy(() -> service.delete("missing")).isInstanceOf(ProjectNotFoundException.class);
    }
}
