package io.elagein.web.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

public class ComponentDto {

    public String id;

    @NotBlank public String type;

    @NotNull public Double x;
    @NotNull public Double y;

    public double rot = 0;
    public int circuit = 1;

    @NotBlank public String label;
    public String notes = "";

    /** Optional mount-height override in meters; null = use the type's default. */
    public Double mountHeight;

    public ComponentDto() { }

    public ComponentDto(String id, String type, double x, double y, double rot, int circuit,
                         String label, String notes, Double mountHeight) {
        this.id = id;
        this.type = type;
        this.x = x;
        this.y = y;
        this.rot = rot;
        this.circuit = circuit;
        this.label = label;
        this.notes = notes;
        this.mountHeight = mountHeight;
    }
}
