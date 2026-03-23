-- V0: Create all application tables (MySQL-compatible).
-- Uses CREATE TABLE IF NOT EXISTS so re-runs are safe.
-- MUST execute before any seed migrations (V1, V2, V3 ...).
--
-- NOTE: If you are bringing an *existing* database under Flyway for the first
-- time, set flyway.baseline-version=0 so this migration is not skipped.
-- For a brand-new production database the default behaviour is correct.

-- ── Independent tables (no FK dependencies) ───────────────────────────────

CREATE TABLE IF NOT EXISTS departments (
    id          BIGINT       NOT NULL AUTO_INCREMENT,
    name        VARCHAR(255) NOT NULL,
    description VARCHAR(255),
    head_id     CHAR(36),
    status      VARCHAR(50)  NOT NULL DEFAULT 'ACTIVE',
    created_at  DATETIME,
    updated_at  DATETIME,
    PRIMARY KEY (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS roles (
    id   BIGINT      NOT NULL AUTO_INCREMENT,
    name VARCHAR(20) NOT NULL,
    PRIMARY KEY (id),
    UNIQUE KEY uk_roles_name (name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS leave_types (
    id                        BIGINT       NOT NULL AUTO_INCREMENT,
    name                      VARCHAR(100) NOT NULL,
    description               VARCHAR(500),
    default_annual_allocation INT          NOT NULL,
    requires_approval         TINYINT(1)   NOT NULL DEFAULT 1,
    created_at                DATETIME     NOT NULL,
    updated_at                DATETIME,
    PRIMARY KEY (id),
    UNIQUE KEY uk_leave_types_name (name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS holidays (
    id           BIGINT       NOT NULL AUTO_INCREMENT,
    name         VARCHAR(150) NOT NULL,
    description  VARCHAR(500),
    holiday_date DATE         NOT NULL,
    type         VARCHAR(50)  NOT NULL DEFAULT 'NATIONAL',
    is_optional  TINYINT(1)   NOT NULL DEFAULT 0,
    created_at   DATETIME     NOT NULL,
    updated_at   DATETIME,
    PRIMARY KEY (id),
    UNIQUE KEY uk_holidays_date (holiday_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS email_notifications (
    id              BIGINT       NOT NULL AUTO_INCREMENT,
    recipient_email VARCHAR(255) NOT NULL,
    subject         VARCHAR(300) NOT NULL,
    body            TEXT         NOT NULL,
    status          VARCHAR(20)  NOT NULL DEFAULT 'PENDING',
    sent_at         DATETIME,
    created_at      DATETIME     NOT NULL,
    PRIMARY KEY (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS audit_logs (
    id          BIGINT       NOT NULL AUTO_INCREMENT,
    user_id     CHAR(36),
    action      VARCHAR(50)  NOT NULL,
    entity_type VARCHAR(100),
    entity_id   VARCHAR(255),
    description VARCHAR(500),
    old_value   TEXT,
    new_value   TEXT,
    ip_address  VARCHAR(50),
    created_at  DATETIME     NOT NULL,
    PRIMARY KEY (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ── Tables with FK → departments / roles ──────────────────────────────────

CREATE TABLE IF NOT EXISTS users (
    id              CHAR(36)     NOT NULL,
    employee_id     VARCHAR(255) NOT NULL,
    name            VARCHAR(255) NOT NULL,
    email           VARCHAR(255) NOT NULL,
    password_hash   VARCHAR(255) NOT NULL,
    phone           VARCHAR(255),
    department_id   BIGINT,
    manager_id      CHAR(36),
    role_id         BIGINT       NOT NULL,
    designation     VARCHAR(255),
    employment_type VARCHAR(50),
    joining_date    DATE,
    status          VARCHAR(50)  NOT NULL DEFAULT 'ACTIVE',
    created_at      DATETIME,
    updated_at      DATETIME,
    PRIMARY KEY (id),
    UNIQUE KEY uk_users_employee_id (employee_id),
    UNIQUE KEY uk_users_email (email),
    CONSTRAINT fk_users_role       FOREIGN KEY (role_id)       REFERENCES roles(id),
    CONSTRAINT fk_users_department FOREIGN KEY (department_id) REFERENCES departments(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ── Tables with FK → users ────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS leave_balances (
    id               BIGINT   NOT NULL AUTO_INCREMENT,
    user_id          CHAR(36) NOT NULL,
    leave_type_id    BIGINT   NOT NULL,
    year             INT      NOT NULL,
    total_allocated  INT      NOT NULL,
    used_leaves      INT      NOT NULL DEFAULT 0,
    remaining_leaves INT      NOT NULL,
    created_at       DATETIME NOT NULL,
    updated_at       DATETIME,
    PRIMARY KEY (id),
    UNIQUE KEY uk_leave_balances_user_type_year (user_id, leave_type_id, year),
    CONSTRAINT fk_leave_balances_user       FOREIGN KEY (user_id)       REFERENCES users(id),
    CONSTRAINT fk_leave_balances_leave_type FOREIGN KEY (leave_type_id) REFERENCES leave_types(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS leave_requests (
    id               BIGINT        NOT NULL AUTO_INCREMENT,
    user_id          CHAR(36)      NOT NULL,
    leave_type_id    BIGINT        NOT NULL,
    start_date       DATE          NOT NULL,
    end_date         DATE          NOT NULL,
    total_days       INT           NOT NULL,
    reason           VARCHAR(1000),
    status           VARCHAR(50)   NOT NULL DEFAULT 'PENDING',
    applied_at       DATETIME      NOT NULL,
    approved_at      DATETIME,
    approved_by      CHAR(36),
    rejection_reason VARCHAR(500),
    PRIMARY KEY (id),
    CONSTRAINT fk_leave_requests_user       FOREIGN KEY (user_id)       REFERENCES users(id),
    CONSTRAINT fk_leave_requests_leave_type FOREIGN KEY (leave_type_id) REFERENCES leave_types(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS notifications (
    id             BIGINT        NOT NULL AUTO_INCREMENT,
    user_id        CHAR(36)      NOT NULL,
    title          VARCHAR(200)  NOT NULL,
    message        VARCHAR(1000) NOT NULL,
    type           VARCHAR(50)   NOT NULL,
    is_read        TINYINT(1)    NOT NULL DEFAULT 0,
    reference_id   VARCHAR(255),
    reference_type VARCHAR(100),
    created_at     DATETIME      NOT NULL,
    PRIMARY KEY (id),
    CONSTRAINT fk_notifications_user FOREIGN KEY (user_id) REFERENCES users(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ── Tables with FK → departments (projects) ───────────────────────────────

CREATE TABLE IF NOT EXISTS projects (
    id                 BIGINT        NOT NULL AUTO_INCREMENT,
    project_code       VARCHAR(30)   NOT NULL,
    name               VARCHAR(150)  NOT NULL,
    description        VARCHAR(1000),
    client_name        VARCHAR(150),
    department_id      BIGINT,
    project_manager_id CHAR(36),
    start_date         DATE,
    end_date           DATE,
    status             VARCHAR(50)   NOT NULL DEFAULT 'PLANNED',
    created_at         DATETIME,
    updated_at         DATETIME,
    PRIMARY KEY (id),
    UNIQUE KEY uk_projects_project_code (project_code),
    CONSTRAINT fk_projects_department FOREIGN KEY (department_id) REFERENCES departments(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ── Tables with FK → projects / users ────────────────────────────────────

CREATE TABLE IF NOT EXISTS project_assignments (
    id                    BIGINT       NOT NULL AUTO_INCREMENT,
    project_id            BIGINT       NOT NULL,
    user_id               CHAR(36)     NOT NULL,
    role                  VARCHAR(50),
    allocation_percentage DECIMAL(5,2),
    start_date            DATE,
    end_date              DATE,
    created_at            DATETIME,
    PRIMARY KEY (id),
    UNIQUE KEY uk_project_assignment_user_project (project_id, user_id),
    CONSTRAINT fk_project_assignments_project FOREIGN KEY (project_id) REFERENCES projects(id),
    CONSTRAINT fk_project_assignments_user    FOREIGN KEY (user_id)    REFERENCES users(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS tasks (
    id                 BIGINT        NOT NULL AUTO_INCREMENT,
    task_code          VARCHAR(30)   NOT NULL,
    title              VARCHAR(200)  NOT NULL,
    description        VARCHAR(2000),
    project_id         BIGINT        NOT NULL,
    assigned_user_id   CHAR(36),
    created_by_user_id CHAR(36),
    priority           VARCHAR(50)   NOT NULL DEFAULT 'MEDIUM',
    status             VARCHAR(50)   NOT NULL DEFAULT 'TODO',
    estimated_hours    DECIMAL(6,2),
    start_date         DATE,
    due_date           DATE,
    created_at         DATETIME,
    updated_at         DATETIME,
    PRIMARY KEY (id),
    UNIQUE KEY uk_tasks_task_code (task_code),
    CONSTRAINT fk_tasks_project FOREIGN KEY (project_id) REFERENCES projects(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS timesheets (
    id               BIGINT       NOT NULL AUTO_INCREMENT,
    user_id          CHAR(36)     NOT NULL,
    week_start_date  DATE         NOT NULL,
    week_end_date    DATE         NOT NULL,
    status           VARCHAR(50)  NOT NULL DEFAULT 'DRAFT',
    submitted_at     DATETIME,
    approved_at      DATETIME,
    approved_by      CHAR(36),
    rejection_reason VARCHAR(1000),
    created_at       DATETIME     NOT NULL,
    updated_at       DATETIME,
    PRIMARY KEY (id),
    UNIQUE KEY uk_timesheets_user_week (user_id, week_start_date),
    CONSTRAINT fk_timesheets_user FOREIGN KEY (user_id) REFERENCES users(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ── Tables with FK → tasks / timesheets / projects ────────────────────────

CREATE TABLE IF NOT EXISTS task_comments (
    id         BIGINT        NOT NULL AUTO_INCREMENT,
    task_id    BIGINT        NOT NULL,
    user_id    CHAR(36)      NOT NULL,
    comment    VARCHAR(2000) NOT NULL,
    created_at DATETIME,
    PRIMARY KEY (id),
    CONSTRAINT fk_task_comments_task FOREIGN KEY (task_id) REFERENCES tasks(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS time_entries (
    id               BIGINT        NOT NULL AUTO_INCREMENT,
    timesheet_id     BIGINT        NOT NULL,
    project_id       BIGINT        NOT NULL,
    task_id          BIGINT,
    task_note        VARCHAR(255),
    user_id          CHAR(36)      NOT NULL,
    work_date        DATE          NOT NULL,
    start_time       TIME          NOT NULL,
    end_time         TIME          NOT NULL,
    duration_minutes INT           NOT NULL,
    description      VARCHAR(1000),
    created_at       DATETIME      NOT NULL,
    updated_at       DATETIME,
    PRIMARY KEY (id),
    CONSTRAINT fk_time_entries_timesheet FOREIGN KEY (timesheet_id) REFERENCES timesheets(id),
    CONSTRAINT fk_time_entries_project   FOREIGN KEY (project_id)   REFERENCES projects(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
