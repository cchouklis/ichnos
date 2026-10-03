package io.elagein.web.dto;

import java.util.ArrayList;
import java.util.List;

public class RoomDto {

    public String id;
    public String label;

    /** Wall ids forming the closed loop, in order. On the way in these are the client's wall ids. */
    public List<String> wallIds = new ArrayList<>();

    public RoomDto() { }

    public RoomDto(String id, String label, List<String> wallIds) {
        this.id = id;
        this.label = label;
        this.wallIds = wallIds;
    }
}
