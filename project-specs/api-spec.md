# API Specification
Base URL

/api/v1

Authentication: JWT Bearer Token

---

# AUTH APIs

POST /auth/login
POST /auth/logout
POST /auth/refresh
POST /auth/forgot-password
POST /auth/reset-password

---

# USER APIs

GET /users
GET /users/{id}
POST /users
PUT /users/{id}
DELETE /users/{id}

---

# PROJECT APIs

GET /projects
POST /projects
PUT /projects/{id}
DELETE /projects/{id}

---

# TASK APIs

GET /tasks
POST /tasks
PUT /tasks/{id}
DELETE /tasks/{id}

---

# TIMESHEET APIs

GET /timesheets
POST /timesheets
PUT /timesheets/{id}
POST /timesheets/{id}/submit

---

# TIMESHEET ENTRY APIs

POST /timesheet-entries
PUT /timesheet-entries/{id}
DELETE /timesheet-entries/{id}

---

# LEAVE APIs

POST /leave
GET /leave
PUT /leave/{id}/approve
PUT /leave/{id}/reject

---

# HOLIDAY APIs

GET /holidays
POST /holidays
PUT /holidays/{id}
DELETE /holidays/{id}

---

# NOTIFICATION APIs

GET /notifications
PUT /notifications/{id}/read

---

# REPORT APIs

GET /reports/employee-hours
GET /reports/project-utilization
GET /reports/billable-hours