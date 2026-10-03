package io.elagein.service;

public class ProjectNotFoundException extends RuntimeException {

    public ProjectNotFoundException(String id) {
        super("No project found with id " + id);
    }
}
