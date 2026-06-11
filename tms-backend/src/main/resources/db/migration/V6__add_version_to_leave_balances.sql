-- Add optimistic-locking version column to leave_balances
-- Prevents concurrent approval race condition (two managers approving simultaneously)
ALTER TABLE leave_balances
    ADD COLUMN version BIGINT NOT NULL DEFAULT 0;
