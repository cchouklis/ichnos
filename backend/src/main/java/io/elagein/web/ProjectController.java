package io.elagein.web;

import io.elagein.service.ProjectService;
import io.elagein.web.dto.ProjectDto;
import io.elagein.web.dto.ProjectSummaryDto;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api")
@Tag(name = "Projects", description = "Save, load and manage blueprint projects")
public class ProjectController {

    private final ProjectService projectService;

    public ProjectController(ProjectService projectService) {
        this.projectService = projectService;
    }

    @GetMapping("/health")
    @Operation(summary = "Liveness check used by the frontend's connection-status indicator")
    public Map<String, String> health() {
        return Map.of("status", "UP");
    }

    @GetMapping("/projects")
    @Operation(summary = "List saved projects, most recently updated first")
    public List<ProjectSummaryDto> list() {
        return projectService.list();
    }

    @GetMapping("/projects/{id}")
    @Operation(summary = "Fetch one project's full document graph")
    public ProjectDto get(@PathVariable String id) {
        return projectService.get(id);
    }

    @PostMapping("/projects")
    @Operation(summary = "Create a new project from a complete document graph")
    public ResponseEntity<ProjectDto> create(@Valid @RequestBody ProjectDto dto) {
        ProjectDto created = projectService.create(dto);
        return ResponseEntity.status(HttpStatus.CREATED).body(created);
    }

    @PutMapping("/projects/{id}")
    @Operation(summary = "Replace a project's entire document graph (full-document save, not a patch)")
    public ProjectDto update(@PathVariable String id, @Valid @RequestBody ProjectDto dto) {
        return projectService.update(id, dto);
    }

    @DeleteMapping("/projects/{id}")
    @Operation(summary = "Delete a project and everything in it")
    public ResponseEntity<Void> delete(@PathVariable String id) {
        projectService.delete(id);
        return ResponseEntity.noContent().build();
    }
}
