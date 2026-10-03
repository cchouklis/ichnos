package io.elagein.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;

@Entity
@Table(name = "walls")
public class WallEntity {

    @Id
    @Column(length = 36)
    private String id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "project_id", nullable = false)
    private ProjectEntity project;

    @Column(nullable = false)
    private double x1;
    @Column(nullable = false)
    private double y1;
    @Column(nullable = false)
    private double x2;
    @Column(nullable = false)
    private double y2;

    @Column(nullable = false)
    private double thickness = 0.12;

    @Column(nullable = false)
    private double height = 2.7;

    protected WallEntity() {
        // JPA
    }

    public WallEntity(String id, ProjectEntity project, double x1, double y1, double x2, double y2,
                       double thickness, double height) {
        this.id = id;
        this.project = project;
        this.x1 = x1;
        this.y1 = y1;
        this.x2 = x2;
        this.y2 = y2;
        this.thickness = thickness;
        this.height = height;
    }

    public String getId() { return id; }
    public ProjectEntity getProject() { return project; }
    public double getX1() { return x1; }
    public double getY1() { return y1; }
    public double getX2() { return x2; }
    public double getY2() { return y2; }
    public double getThickness() { return thickness; }
    public double getHeight() { return height; }
}
