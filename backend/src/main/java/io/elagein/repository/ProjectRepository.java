package io.elagein.repository;

import io.elagein.domain.ProjectEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.EntityGraph;

import java.util.List;
import java.util.Optional;

public interface ProjectRepository extends JpaRepository<ProjectEntity, String> {

    /** Full aggregate fetch — avoids N+1 lazy-loading of children when loading one project for editing. */
    @EntityGraph(attributePaths = {"walls", "rooms", "components", "wires", "wires.componentA", "wires.componentB"})
    Optional<ProjectEntity> findWithGraphById(String id);

    List<ProjectEntity> findAllByOrderByUpdatedAtDesc();
}
