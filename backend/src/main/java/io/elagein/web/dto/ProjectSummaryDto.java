package io.elagein.web.dto;

import java.time.Instant;

public class ProjectSummaryDto {

    public String id;
    public String name;
    public int componentCount;
    public int wallCount;
    public Instant updatedAt;

    public ProjectSummaryDto() { }

    public ProjectSummaryDto(String id, String name, int componentCount, int wallCount, Instant updatedAt) {
        this.id = id;
        this.name = name;
        this.componentCount = componentCount;
        this.wallCount = wallCount;
        this.updatedAt = updatedAt;
    }
}
