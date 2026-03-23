-- Performance indexes to avoid full-table scans on common query patterns.

-- timesheets: most frequent access by user_id
CREATE INDEX idx_timesheets_user_id      ON timesheets(user_id);

-- time_entries: lookups by parent timesheet and by project
CREATE INDEX idx_time_entries_timesheet  ON time_entries(timesheet_id);
CREATE INDEX idx_time_entries_project    ON time_entries(project_id);
CREATE INDEX idx_time_entries_user       ON time_entries(user_id);

-- leave_requests: filtering by user and status
CREATE INDEX idx_leave_requests_user     ON leave_requests(user_id);
CREATE INDEX idx_leave_requests_status   ON leave_requests(status);

-- users: frequent lookups by manager and department
CREATE INDEX idx_users_manager_id        ON users(manager_id);
CREATE INDEX idx_users_department_id     ON users(department_id);
