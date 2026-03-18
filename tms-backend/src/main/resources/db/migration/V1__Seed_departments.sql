-- Seed initial departments
INSERT INTO departments (name, description, status, created_at, updated_at)
VALUES
  ('Engineering',         'Software development, architecture and DevOps',        'ACTIVE', NOW(), NOW()),
  ('Product Management',  'Product strategy, roadmaps and feature prioritisation', 'ACTIVE', NOW(), NOW()),
  ('Design',              'UX/UI design and brand assets',                         'ACTIVE', NOW(), NOW()),
  ('Quality Assurance',   'Testing, QA automation and release validation',         'ACTIVE', NOW(), NOW()),
  ('Human Resources',     'Recruitment, onboarding and employee relations',        'ACTIVE', NOW(), NOW()),
  ('Finance',             'Budgeting, payroll and financial reporting',            'ACTIVE', NOW(), NOW()),
  ('Sales',               'Business development and client acquisition',           'ACTIVE', NOW(), NOW()),
  ('Marketing',           'Brand, content and go-to-market activities',           'ACTIVE', NOW(), NOW()),
  ('Operations',          'Internal processes, facilities and administration',     'ACTIVE', NOW(), NOW()),
  ('Customer Support',    'Client onboarding, helpdesk and account management',   'ACTIVE', NOW(), NOW());
