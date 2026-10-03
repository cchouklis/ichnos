package io.elagein.web.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;

public class ProjectDto {

    /** Null on create; set by the server and echoed back for the frontend to remember. */
    public String id;

    @NotBlank public String name;

    public int scalePxPerMeter = 60;

    @Valid public List<WallDto> walls = new ArrayList<>();
    @Valid public List<RoomDto> rooms = new ArrayList<>();
    @Valid public List<ComponentDto> components = new ArrayList<>();
    @Valid public List<WireDto> wires = new ArrayList<>();

    public Instant createdAt;
    public Instant updatedAt;

    public ProjectDto() { }
}
