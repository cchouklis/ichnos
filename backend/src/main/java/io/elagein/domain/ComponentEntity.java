package io.elagein.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;

@Entity
@Table(name = "components")
public class ComponentEntity {

    @Id
    @Column(length = 36)
    private String id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "project_id", nullable = false)
    private ProjectEntity project;

    /** e.g. "outlet-duplex", "switch-dimmer", "panel" — matches the frontend's COMPONENT_TYPES catalog id. */
    @Column(nullable = false, length = 40)
    private String type;

    @Column(nullable = false)
    private double x;
    @Column(nullable = false)
    private double y;

    @Column(nullable = false)
    private double rotation;

    @Column(nullable = false)
    private int circuit = 1;

    @Column(nullable = false, length = 200)
    private String label;

    @Column(length = 2000)
    private String notes;

    /** Mount height override in meters; null means "use the type's default height". */
    @Column(name = "mount_height")
    private Double mountHeight;

    protected ComponentEntity() {
        // JPA
    }

    public ComponentEntity(String id, ProjectEntity project, String type, double x, double y,
                            double rotation, int circuit, String label, String notes, Double mountHeight) {
        this.id = id;
        this.project = project;
        this.type = type;
        this.x = x;
        this.y = y;
        this.rotation = rotation;
        this.circuit = circuit;
        this.label = label;
        this.notes = notes;
        this.mountHeight = mountHeight;
    }

    public String getId() { return id; }
    public ProjectEntity getProject() { return project; }
    public String getType() { return type; }
    public double getX() { return x; }
    public double getY() { return y; }
    public double getRotation() { return rotation; }
    public int getCircuit() { return circuit; }
    public String getLabel() { return label; }
    public String getNotes() { return notes; }
    public Double getMountHeight() { return mountHeight; }
}
