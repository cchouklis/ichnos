package io.elagein.service;

import io.elagein.domain.ComponentEntity;
import io.elagein.domain.ProjectEntity;
import io.elagein.domain.RoomEntity;
import io.elagein.domain.WallEntity;
import io.elagein.domain.WireEntity;
import io.elagein.repository.ProjectRepository;
import io.elagein.web.dto.ComponentDto;
import io.elagein.web.dto.ProjectDto;
import io.elagein.web.dto.ProjectSummaryDto;
import io.elagein.web.dto.RoomDto;
import io.elagein.web.dto.WallDto;
import io.elagein.web.dto.WireDto;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Service
@Transactional
public class ProjectService {

    private final ProjectRepository projectRepository;

    public ProjectService(ProjectRepository projectRepository) {
        this.projectRepository = projectRepository;
    }

    @Transactional(readOnly = true)
    public List<ProjectSummaryDto> list() {
        return projectRepository.findAllByOrderByUpdatedAtDesc().stream()
                .map(p -> new ProjectSummaryDto(p.getId(), p.getName(), p.getComponents().size(),
                        p.getWalls().size(), p.getUpdatedAt()))
                .toList();
    }

    @Transactional(readOnly = true)
    public ProjectDto get(String id) {
        ProjectEntity project = projectRepository.findWithGraphById(id)
                .orElseThrow(() -> new ProjectNotFoundException(id));
        return toDto(project);
    }

    public ProjectDto create(ProjectDto dto) {
        ProjectEntity project = new ProjectEntity(UUID.randomUUID().toString(), dto.name, dto.scalePxPerMeter);
        applyGraph(project, dto);
        return toDto(projectRepository.save(project));
    }

    public ProjectDto update(String id, ProjectDto dto) {
        ProjectEntity project = projectRepository.findWithGraphById(id)
                .orElseThrow(() -> new ProjectNotFoundException(id));
        project.setName(dto.name);
        project.setScalePxPerMeter(dto.scalePxPerMeter);
        // full-document replace: the frontend always sends the complete current state,
        // so we clear and rebuild the child collections rather than diffing them.
        project.getWires().clear();
        project.getRooms().clear();
        project.getComponents().clear();
        project.getWalls().clear();
        applyGraph(project, dto);
        return toDto(projectRepository.save(project));
    }

    public void delete(String id) {
        if (!projectRepository.existsById(id)) {
            throw new ProjectNotFoundException(id);
        }
        projectRepository.deleteById(id);
    }

    /**
     * Rebuilds the walls/rooms/components/wires collections on {@code project} from {@code dto},
     * issuing fresh server-side ids and remapping every client-supplied reference (room -> wall,
     * wire -> component) onto them so the graph stays internally consistent.
     */
    private void applyGraph(ProjectEntity project, ProjectDto dto) {
        Map<String, WallEntity> wallByClientId = new HashMap<>();
        for (WallDto w : dto.walls) {
            WallEntity wall = new WallEntity(UUID.randomUUID().toString(), project,
                    w.x1, w.y1, w.x2, w.y2, w.thickness, w.height);
            project.getWalls().add(wall);
            if (w.id != null) {
                wallByClientId.put(w.id, wall);
            }
        }

        Map<String, ComponentEntity> componentByClientId = new HashMap<>();
        for (ComponentDto c : dto.components) {
            ComponentEntity component = new ComponentEntity(UUID.randomUUID().toString(), project,
                    c.type, c.x, c.y, c.rot, c.circuit, c.label, c.notes, c.mountHeight);
            project.getComponents().add(component);
            if (c.id != null) {
                componentByClientId.put(c.id, component);
            }
        }

        for (RoomDto r : dto.rooms) {
            List<String> resolvedWallIds = new ArrayList<>();
            for (String clientWallId : r.wallIds) {
                WallEntity wall = wallByClientId.get(clientWallId);
                if (wall != null) {
                    resolvedWallIds.add(wall.getId());
                }
            }
            if (resolvedWallIds.size() >= 3) {
                project.getRooms().add(new RoomEntity(UUID.randomUUID().toString(), project, r.label, resolvedWallIds));
            }
            // rooms whose walls didn't resolve (e.g. stale ids) are silently dropped rather than
            // persisted with a broken loop — the frontend recreates them by drawing a new one.
        }

        for (WireDto w : dto.wires) {
            ComponentEntity a = componentByClientId.get(w.a);
            ComponentEntity b = componentByClientId.get(w.b);
            if (a != null && b != null) {
                project.getWires().add(new WireEntity(UUID.randomUUID().toString(), project, a, b, w.circuit));
            }
            // wires referencing a component that wasn't in this payload are dropped defensively.
        }
    }

    private ProjectDto toDto(ProjectEntity project) {
        ProjectDto dto = new ProjectDto();
        dto.id = project.getId();
        dto.name = project.getName();
        dto.scalePxPerMeter = project.getScalePxPerMeter();
        dto.createdAt = project.getCreatedAt();
        dto.updatedAt = project.getUpdatedAt();

        for (WallEntity w : project.getWalls()) {
            dto.walls.add(new WallDto(w.getId(), w.getX1(), w.getY1(), w.getX2(), w.getY2(), w.getThickness(), w.getHeight()));
        }
        for (RoomEntity r : project.getRooms()) {
            dto.rooms.add(new RoomDto(r.getId(), r.getLabel(), new ArrayList<>(r.getWallIds())));
        }
        for (ComponentEntity c : project.getComponents()) {
            dto.components.add(new ComponentDto(c.getId(), c.getType(), c.getX(), c.getY(), c.getRotation(),
                    c.getCircuit(), c.getLabel(), c.getNotes(), c.getMountHeight()));
        }
        for (WireEntity w : project.getWires()) {
            dto.wires.add(new WireDto(w.getId(), w.getComponentA().getId(), w.getComponentB().getId(), w.getCircuit()));
        }
        return dto;
    }
}
