package io.elagein.config;

import io.swagger.v3.oas.models.OpenAPI;
import io.swagger.v3.oas.models.info.Contact;
import io.swagger.v3.oas.models.info.Info;
import io.swagger.v3.oas.models.info.License;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

/**
 * Swagger UI is served at /swagger-ui.html, the raw OpenAPI document at /v3/api-docs
 * (both provided automatically by springdoc — this class only supplies the metadata).
 */
@Configuration
public class OpenApiConfig {

  @Bean
  public OpenAPI ichnosOpenApi() {
    return new OpenAPI()
        .info(new Info()
            .title("Ichnos API")
            .description("Persistence API for Ichnos, the electrical blueprint designer. "
                + "Projects are saved and loaded as one complete document graph "
                + "(walls, rooms, components, wires) per request.")
            .version("v1")
            .contact(new Contact().name("Ichnos"))
            .license(new License().name("Unlicensed — internal project")));
  }
}
