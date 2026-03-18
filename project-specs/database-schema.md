# Database Schema
Enterprise Timesheet Management System

Database: MySQL / PlanetScale
ORM: Spring Data JPA

---

# Tables Overview

users
roles
departments
teams
projects
project_assignments
tasks
timesheets
timesheet_entries
leave_requests
holidays
notifications
audit_logs
attachments

---

# users

id (UUID) PK
employee_id VARCHAR UNIQUE
name VARCHAR
email VARCHAR UNIQUE
password_hash
phone
department_id FK
team_id FK
manager_id FK
role_id FK
designation
employment_type
joining_date
status
created_at
updated_at

---

# roles

id
name

Values

ADMIN
HR
MANAGER
EMPLOYEE

---

# departments

id
name
created_at

---

# teams

id
name
department_id

---

# projects

id
name
client_name
description
status
start_date
end_date
created_by
created_at

---

# project_assignments

id
project_id
user_id
allocation_percentage
role
start_date
end_date

---

# tasks

id
project_id
name
description
assigned_user_id
estimated_hours
priority
status

---

# timesheets

id
user_id
week_start_date
week_end_date
status
submitted_at
approved_at
approved_by

---

# timesheet_entries

id
timesheet_id
date
project_id
task_id
check_in
check_out
break_minutes
description
billable
location
total_hours

---

# leave_requests

id
user_id
leave_type
start_date
end_date
status
reason
approved_by

---

# holidays

id
name
date
type
region

---

# notifications

id
user_id
title
message
type
is_read
created_at

---

# audit_logs

id
user_id
action
entity
entity_id
metadata
timestamp

---

# attachments

id
file_name
file_url
entity_type
entity_id
uploaded_by
uploaded_at