-- V2: Seed all application roles.
-- INSERT IGNORE silently skips rows that violate the UNIQUE(name) constraint,
-- making this migration safe to re-run against an existing database.

INSERT IGNORE INTO roles (name)
VALUES
    ('ADMIN'),
    ('HR'),
    ('HR_MANAGER'),
    ('MANAGER'),
    ('DIRECTOR'),
    ('EMPLOYEE');
