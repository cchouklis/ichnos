package io.elagein.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;

@Entity
@Table(name = "wires")
public class WireEntity {

    @Id
    @Column(length = 36)
    private String id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "project_id", nullable = false)
    private ProjectEntity project;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "component_a_id", nullable = false)
    private ComponentEntity componentA;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "component_b_id", nullable = false)
    private ComponentEntity componentB;

    @Column(nullable = false)
    private int circuit = 1;

    protected WireEntity() {
        // JPA
    }

    public WireEntity(String id, ProjectEntity project, ComponentEntity componentA, ComponentEntity componentB, int circuit) {
        this.id = id;
        this.project = project;
        this.componentA = componentA;
        this.componentB = componentB;
        this.circuit = circuit;
    }

    public String getId() { return id; }
    public ProjectEntity getProject() { return project; }
    public ComponentEntity getComponentA() { return componentA; }
    public ComponentEntity getComponentB() { return componentB; }
    public int getCircuit() { return circuit; }
}
