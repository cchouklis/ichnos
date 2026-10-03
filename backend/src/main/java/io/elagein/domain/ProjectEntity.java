package io.elagein.domain;

import jakarta.persistence.CascadeType;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EntityListeners;
import jakarta.persistence.Id;
import jakarta.persistence.OneToMany;
import jakarta.persistence.Table;
import jakarta.persistence.Version;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.LastModifiedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;

/**
 * Aggregate root for a single blueprint project. Walls, rooms, components and wires
 * are all owned by (and only ever saved through) their parent project — the frontend
 * saves the whole document at once, so we model persistence the same way rather than
 * exposing granular CRUD on the children.
 */
@Entity
@Table(name = "projects")
@EntityListeners(AuditingEntityListener.class)
public class ProjectEntity {

    @Id
    @Column(length = 36)
    private String id;

    @Column(nullable = false, length = 200)
    private String name;

    @Column(name = "scale_px_per_meter", nullable = false)
    private int scalePxPerMeter = 60;

    @Version
    private long version;

    @CreatedDate
    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @LastModifiedDate
    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    @OneToMany(mappedBy = "project", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<WallEntity> walls = new ArrayList<>();

    @OneToMany(mappedBy = "project", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<RoomEntity> rooms = new ArrayList<>();

    @OneToMany(mappedBy = "project", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<ComponentEntity> components = new ArrayList<>();

    @OneToMany(mappedBy = "project", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<WireEntity> wires = new ArrayList<>();

    protected ProjectEntity() {
        // JPA
    }

    public ProjectEntity(String id, String name, int scalePxPerMeter) {
        this.id = id;
        this.name = name;
        this.scalePxPerMeter = scalePxPerMeter;
    }

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }

    public String getName() { return name; }
    public void setName(String name) { this.name = name; }

    public int getScalePxPerMeter() { return scalePxPerMeter; }
    public void setScalePxPerMeter(int scalePxPerMeter) { this.scalePxPerMeter = scalePxPerMeter; }

    public long getVersion() { return version; }

    public Instant getCreatedAt() { return createdAt; }
    public Instant getUpdatedAt() { return updatedAt; }

    public List<WallEntity> getWalls() { return walls; }
    public List<RoomEntity> getRooms() { return rooms; }
    public List<ComponentEntity> getComponents() { return components; }
    public List<WireEntity> getWires() { return wires; }
}
