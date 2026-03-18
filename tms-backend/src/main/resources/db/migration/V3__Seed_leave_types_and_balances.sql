-- V3: Seed standard leave types and initialise current-year leave balances
--     for all ACTIVE users.  MySQL-compatible.

-- 1. Seed leave types
--    INSERT IGNORE silently skips rows that violate the UNIQUE(name) constraint.
INSERT IGNORE INTO leave_types
    (name, description, default_annual_allocation, requires_approval, created_at, updated_at)
VALUES
    ('Annual Leave',    'Standard paid annual leave entitlement',        20, TRUE,  NOW(), NOW()),
    ('Sick Leave',      'Paid leave for illness or medical appointments', 10, FALSE, NOW(), NOW()),
    ('Casual Leave',    'Short-notice personal or family leave',          8, TRUE,  NOW(), NOW()),
    ('Maternity Leave', 'Paid leave for expectant and new mothers',       90, TRUE,  NOW(), NOW()),
    ('Paternity Leave', 'Paid leave for new fathers and co-parents',      10, TRUE,  NOW(), NOW()),
    ('Unpaid Leave',    'Leave beyond standard entitlement without pay',  30, TRUE,  NOW(), NOW());

-- 2. Initialise leave balances for every ACTIVE user x every leave type
--    for the current calendar year.
--    INSERT IGNORE skips rows that violate the UNIQUE(user_id, leave_type_id, year) constraint.
INSERT IGNORE INTO leave_balances
    (user_id, leave_type_id, year, total_allocated, used_leaves, remaining_leaves, created_at, updated_at)
SELECT
    u.id,
    lt.id,
    YEAR(NOW()),
    lt.default_annual_allocation,
    0,
    lt.default_annual_allocation,
    NOW(),
    NOW()
FROM users u
CROSS JOIN leave_types lt
WHERE u.status = 'ACTIVE';
