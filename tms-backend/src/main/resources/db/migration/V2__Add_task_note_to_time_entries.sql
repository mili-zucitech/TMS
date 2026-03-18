-- Add task_note column to time_entries for free-text task descriptions
-- when an employee chooses not to link an entry to a formal task
ALTER TABLE time_entries
    ADD COLUMN task_note VARCHAR(255) NULL AFTER task_id;
