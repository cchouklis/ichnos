package io.elagein.domain;

import jakarta.persistence.CollectionTable;
import jakarta.persistence.Column;
import jakarta.persistence.ElementCollection;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.OrderColumn;
import jakarta.persistence.Table;

import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "rooms")
public class RoomEntity {

    @Id
    @Column(length = 36)
    private String id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "project_id", nullable = false)
    private ProjectEntity project;

    @Column(nullable = false, length = 120)
    private String label;

    /** Ordered wall ids forming the closed loop for this room, preserved via OrderColumn. */
    @ElementCollection
    @CollectionTable(name = "room_wall_ids", joinColumns = @JoinColumn(name = "room_id"))
    @Column(name = "wall_id", length = 36)
    @OrderColumn(name = "position")
    private List<String> wallIds = new ArrayList<>();

    protected RoomEntity() {
        // JPA
    }

    public RoomEntity(String id, ProjectEntity project, String label, List<String> wallIds) {
        this.id = id;
        this.project = project;
        this.label = label;
        this.wallIds = wallIds;
    }

    public String getId() { return id; }
    public ProjectEntity getProject() { return project; }
    public String getLabel() { return label; }
    public List<String> getWallIds() { return wallIds; }
}
