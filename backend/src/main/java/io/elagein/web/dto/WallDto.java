package io.elagein.web.dto;

import jakarta.validation.constraints.NotNull;

public class WallDto {

    /** Client-supplied id on the way in; always server-assigned on the way out. */
    public String id;

    @NotNull public Double x1;
    @NotNull public Double y1;
    @NotNull public Double x2;
    @NotNull public Double y2;

    public double thickness = 0.12;
    public double height = 2.7;

    public WallDto() { }

    public WallDto(String id, double x1, double y1, double x2, double y2, double thickness, double height) {
        this.id = id;
        this.x1 = x1;
        this.y1 = y1;
        this.x2 = x2;
        this.y2 = y2;
        this.thickness = thickness;
        this.height = height;
    }
}
