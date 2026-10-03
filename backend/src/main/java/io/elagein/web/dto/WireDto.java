package io.elagein.web.dto;

import jakarta.validation.constraints.NotBlank;

public class WireDto {

    public String id;

    /** Component ids this wire connects. On the way in these are the client's component ids. */
    @NotBlank public String a;
    @NotBlank public String b;

    public int circuit = 1;

    public WireDto() { }

    public WireDto(String id, String a, String b, int circuit) {
        this.id = id;
        this.a = a;
        this.b = b;
        this.circuit = circuit;
    }
}
