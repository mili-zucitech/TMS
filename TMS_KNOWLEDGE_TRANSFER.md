# TMS — Complete Project Knowledge-Transfer Manual

> **Audience:** A new developer with zero prior exposure to this system.  
> **Purpose:** Understand every architectural decision, every line of code reasoning, and every trade-off made in the TMS project.  
> **Stack:** React 18 + TypeScript (frontend) · Spring Boot 3.2 + Java 21 (backend) · MySQL (database)

---

## Table of Contents

1. [System Overview](#1-system-overview)
2. [Backend — Full Explanation](#2-backend-spring-boot--full-explanation)
   - 2.1 [Architecture & Layered Design](#21-architecture--layered-design)
   - 2.2 [Core Annotations Explained](#22-core-annotations-explained)
   - 2.3 [Authentication & Security](#23-authentication--security)
   - 2.4 [Database Schema (Detailed)](#24-database-schema-detailed)
   - 2.5 [API Design](#25-api-design)
   - 2.6 [Business Logic Deep Dive](#26-business-logic-deep-dive)
   - 2.7 [Design Patterns Used](#27-design-patterns-used)
   - 2.8 [Performance Considerations](#28-performance-considerations)
   - 2.9 [Future Improvements](#29-future-improvements)
3. [Frontend — Full Explanation](#3-frontend-react--full-explanation)
   - 3.1 [Architecture & Folder Structure](#31-architecture--folder-structure)
   - 3.2 [State Management](#32-state-management)
   - 3.3 [API Integration](#33-api-integration)
   - 3.4 [Routing & Navigation](#34-routing--navigation)
   - 3.5 [UI/UX Design Decisions](#35-uiux-design-decisions)
   - 3.6 [Optimizations](#36-optimizations)
   - 3.7 [Future Improvements](#37-future-improvements)
4. [End-to-End Flows](#4-end-to-end-flows)
   - 4.1 [Login Flow](#41-login-flow)
   - 4.2 [Timesheet Flow](#42-timesheet-flow)
   - 4.3 [Leave Flow](#43-leave-flow)
   - 4.4 [Report Flow](#44-report-flow)
5. [Trade-Off Analysis](#5-trade-off-analysis)
6. [Scalability & Future Improvements](#6-scalability--future-improvements)
7. [Interview Preparation](#7-interview-preparation)

---

## 1. System Overview

### 1.1 What Is TMS?

TMS is an **Enterprise Timesheet Management System (TMS)**. It solves the following real-world business problems:

| Problem | How TMS Solves It |
|---|---|
| Employees manually track hours in spreadsheets | Structured weekly timesheets with project/task entries |
| Managers have no visibility into team capacity | Manager dashboard showing all reports' timesheets |
| HR has no system to manage leave | Leave application → approval workflow with balance tracking |
| No audit trail for approvals | AOP-based automatic audit log for every mutating action |
| Payroll depends on accurate hours | APPROVED timesheets with immutable time entries |

### 1.2 High-Level Architecture

```
┌───────────────────────────────────────────────────────────┐
│                    BROWSER (User)                          │
│                                                           │
│   ┌──────────────────────────────────────────────────┐    │
│   │           React 18 SPA (Vite + TypeScript)        │    │
│   │                                                   │    │
│   │  Redux Toolkit (RTK Query)  ←→  React Components  │    │
│   │  axios client (+interceptors)                     │    │
│   └──────────────────┬───────────────────────────────┘    │
└──────────────────────┼────────────────────────────────────┘
                       │  HTTPS + JSON
                       │  Authorization: Bearer <JWT>
                       │
┌──────────────────────▼────────────────────────────────────┐
│              Spring Boot 3.2 Backend (Java 21)             │
│                                                           │
│  SecurityFilterChain  →  Controller  →  Service           │
│                                    →  Repository  →  DB   │
│                                                           │
│  JWT Filter · AOP Audit · Async Events · Email            │
└──────────────────────┬────────────────────────────────────┘
                       │  JDBC (HikariCP)
                       ▼
               ┌───────────────┐
               │  MySQL 8.x    │
               │  (InnoDB)     │
               └───────────────┘
```

### 1.3 Why This Architecture Was Chosen

**Monolith over Microservices** — The project is a single deployable unit. This was a deliberate decision:

- **Team size is small.** Microservices require independent deployments, separate CI/CD pipelines, distributed tracing, and a service mesh. For a small team, this overhead drowns the actual business work.
- **Domain coupling is tight.** A leave approval affects leave balances and sends notifications. A timesheet submission notifies the manager. These workflows span multiple "services" and would require distributed transactions (Saga pattern) in a microservices world — far more complex than a simple `@Transactional` method call in a monolith.
- **The system can be extracted later.** The monolith is already package-structured by domain (`leave`, `timesheet`, `notification`). Each package has its own controller, service, repository, and entity. This vertical slice design means extracting a domain into a microservice later is a matter of moving packages and adding an API gateway — not a full rewrite.

**REST + JSON over GraphQL** — A REST API is simpler to reason about for CRUD operations, easier to cache at HTTP level, and better understood by all developers. GraphQL would help for the reporting module where clients want flexible field selection, but the added schema maintenance overhead was not justified.

### 1.4 Request–Response Lifecycle

Every single HTTP call from the browser goes through this exact sequence:

```
Browser
  │
  ├─[1] React component calls RTK Query hook or axios service method
  │
  ├─[2] Request interceptor attaches Authorization: Bearer <token>
  │       (or redirects to /login if token is expired)
  │
  ├─[3] HTTP request sent to Spring Boot backend
  │
  ├─[4] JwtAuthenticationFilter runs BEFORE every protected controller
  │       - Extracts token from Authorization header
  │       - Validates signature + expiry
  │       - Loads UserDetails from DB
  │       - Sets SecurityContext
  │
  ├─[5] Spring Security checks @PreAuthorize on controller method
  │
  ├─[6] Controller method runs
  │       - Validates request body (@Valid)
  │       - Calls service method
  │
  ├─[7] Service method runs
  │       - Business validation
  │       - Calls repository
  │       - Publishes domain events (async notifications)
  │
  ├─[8] Repository queries MySQL via JPA/Hibernate
  │
  ├─[9] Response wrapped in ApiResponse<T> and returned
  │
  └─[10] React component receives data, updates UI
```

---

## 2. Backend (Spring Boot) — Full Explanation

### 2.1 Architecture & Layered Design

The backend follows a classic **4-layer architecture**:

```
                  HTTP Request
                       │
             ┌─────────▼──────────┐
             │    CONTROLLER       │  ← Handles HTTP, validates input, delegates
             └─────────┬──────────┘
                       │
             ┌─────────▼──────────┐
             │      SERVICE        │  ← Business logic, transactions, events
             └─────────┬──────────┘
                       │
             ┌─────────▼──────────┐
             │     REPOSITORY      │  ← Data access (Spring Data JPA)
             └─────────┬──────────┘
                       │
             ┌─────────▼──────────┐
             │      ENTITY         │  ← JPA mapping to database table
             └────────────────────┘
```

**Why this layering?**

| Layer | Single Responsibility | Benefit |
|---|---|---|
| Controller | HTTP concern only | Easy to test in isolation; swap HTTP for gRPC later |
| Service | Business rules only | Business logic is not tied to HTTP or database |
| Repository | Data access only | Swap MySQL for PostgreSQL without touching service |
| Entity | Database mapping only | Schema changes don't propagate upward |

**Practical example — creating a timesheet:**

1. `POST /api/v1/timesheets` hits `TimesheetController.createTimesheet()`
2. Controller validates the `@RequestBody` with `@Valid`, then calls `timesheetService.createWeeklyTimesheet(request)`
3. Service asks `TimesheetValidator` to check for duplicate week, then saves via `timesheetRepository.save(entity)`
4. Repository translates the `Timesheet` entity into an `INSERT` SQL via Hibernate
5. Saved entity is mapped to `TimesheetResponse` DTO and wrapped in `ApiResponse.success()`

### 2.2 Core Annotations Explained

Every annotation in the codebase is explained here from first principles.

#### Spring Boot Infrastructure

```java
@SpringBootApplication
```
This is actually **three annotations rolled into one**:
- `@Configuration` — marks the class as a source of `@Bean` definitions
- `@ComponentScan` — tells Spring to scan the current package (and sub-packages) for components
- `@EnableAutoConfiguration` — activates Spring Boot's "convention over configuration" magic (auto-detects datasource, security, JPA, etc.)

```java
@EnableAsync
```
Activates Spring's async task execution framework. Without this, methods annotated with `@Async` run synchronously. With it, they execute on a separate thread pool (`AsyncConfig` defines the `tms-async-*` pool). This is used extensively in the notification system so that sending emails does not block the main transaction thread.

```java
@ConfigurationPropertiesScan
```
Tells Spring Boot to find all classes annotated with `@ConfigurationProperties` and bind them to application properties. For example, `CorsProperties` maps to the `cors.allowed-origins` block in `application.yml`.

#### Stereotype Annotations

```java
@RestController
```
Combines `@Controller` (marks the class as a Spring MVC controller) and `@ResponseBody` (meaning every method's return value is serialized to JSON and written directly to the HTTP response body — not to a view/template).

```java
@Service
```
Marks a class as a business-logic component. Functionally equivalent to `@Component`, but the semantic intent matters: it tells developers "business logic lives here." Spring also recognizes `@Service` for certain AOP proxying decisions.

```java
@Repository
```
Marks a class as a data-access component. Spring adds exception translation: any low-level `PersistenceException` is automatically translated into a `DataAccessException` hierarchy. In this codebase, all repositories extend `JpaRepository`, so Spring Data handles the implementation automatically.

```java
@Component
```
The most generic stereotype. Used for anything that doesn't fit `@Controller`, `@Service`, or `@Repository` — validators, aspects, filters, event listeners.

#### Dependency Injection

```java
@Autowired
```
Instructs Spring to inject a dependency. In modern Spring (5+) and throughout this codebase, **constructor injection via `@RequiredArgsConstructor`** (Lombok) is preferred over field injection. Constructor injection:
- Makes dependencies explicit and visible
- Makes unit testing easier (no Spring context needed — just pass mocks to the constructor)
- Prevents circular dependency issues (Spring detects them at startup rather than at runtime)

```java
@RequiredArgsConstructor  // Lombok
```
Generates a constructor for all `final` fields. When Spring sees only one constructor on a `@Component`, it uses it for injection automatically — no `@Autowired` needed. This is why every service class in the codebase looks like:

```java
@Service
@RequiredArgsConstructor
public class TimesheetService {
    private final TimesheetRepository timesheetRepository; // injected via constructor
    private final TimesheetMapper timesheetMapper;
    // ...
}
```

#### Transaction Management

```java
@Transactional(readOnly = true)
```
Applied at the **class level** on every service. This means:
- Every method in the class participates in a database transaction by default
- `readOnly = true` tells Hibernate to skip dirty checking (it doesn't need to track entity state changes at the end of the transaction). This is a **performance optimization** — Hibernate can skip its "flush" phase for pure reads.
- Methods that write data override this with `@Transactional` (without `readOnly`) at the method level.

```java
@Transactional  // method-level override
public TimesheetResponse createWeeklyTimesheet(TimesheetCreateRequest request) { ... }
```

**Why this pattern?** Declaring the class-level default as `readOnly = true` means you explicitly opt-in to write transactions. This is a safety net — a developer cannot accidentally write to the database in a read method.

#### JPA Entity Annotations

```java
@Entity
```
Marks the class as a JPA entity — Hibernate will manage it and map it to a database table.

```java
@Table(name = "timesheets")
```
Specifies the table name. Without this, Hibernate would use the class name. Explicit names avoid surprises.

```java
@Id
```
Marks the primary key field.

```java
@GeneratedValue(strategy = GenerationType.IDENTITY)
```
Delegates PK generation to the database. For `Long` IDs (auto-increment), this uses MySQL's `AUTO_INCREMENT`. For `UUID` IDs (User entity), `GenerationType.UUID` is used instead, generating a RFC 4122 UUID in Java before insert.

```java
@JdbcTypeCode(SqlTypes.CHAR)
@Column(name = "user_id", columnDefinition = "CHAR(36)")
private UUID userId;
```
This is an important pattern used throughout the codebase. **MySQL does not have a native UUID type.** Instead, UUIDs are stored as `CHAR(36)` strings (e.g., `"550e8400-e29b-41d4-a716-446655440000"`). The `@JdbcTypeCode(SqlTypes.CHAR)` annotation tells Hibernate to treat the UUID as a character type instead of a binary type, ensuring consistent string representation.

```java
@Enumerated(EnumType.STRING)
@Column(name = "status")
private TimesheetStatus status;
```
Stores the enum value as its string name (e.g., `"DRAFT"`, `"SUBMITTED"`) rather than its ordinal integer. String storage is far safer: adding a new enum value doesn't break existing records. Ordinal storage would shift all integers if you insert a value in the middle.

```java
@PrePersist / @PreUpdate
```
JPA lifecycle callbacks. `@PrePersist` runs just before `INSERT`, `@PreUpdate` runs just before `UPDATE`. Used to set `createdAt` and `updatedAt` timestamps automatically without requiring the service layer to set them.

#### Validation

```java
@Valid
```
On a `@RequestBody` parameter, this triggers Bean Validation (Jakarta Validation API) on the incoming request object. If any constraint fails, Spring automatically returns `400 Bad Request` before the controller method body even runs. The `GlobalExceptionHandler` catches `MethodArgumentNotValidException` and formats it as a proper error response.

```java
@NotNull, @NotBlank, @Size, @Email
```
Bean Validation constraints declared on DTO fields. Example from `LoginRequest`:

```java
public record LoginRequest(
    @NotBlank(message = "Email is required") String email,
    @NotBlank(message = "Password is required") String password
) {}
```

#### Method-Level Security

```java
@PreAuthorize("hasAnyRole('ADMIN', 'MANAGER')")
```
Evaluated **before** the method runs. Uses Spring Security's SpEL (Spring Expression Language). If the expression evaluates to false, Spring throws `AccessDeniedException`, which the `GlobalExceptionHandler` maps to `403 Forbidden`.

```java
@PreAuthorize("hasAnyRole('ADMIN', 'HR') or @timesheetService.isOwnerOfTimesheet(authentication.name, #id)")
```
This is a more complex expression: the user must either have ADMIN/HR role, **or** be the owner of the specific timesheet being accessed. `@timesheetService` is a Spring bean reference, `authentication.name` is the email from the JWT, and `#id` is the method parameter.

---

### 2.3 Authentication & Security

#### Why JWT (JSON Web Tokens)?

JWT was chosen over sessions for one primary reason: **statelessness**. A stateless architecture means:

- No session state stored on the server
- The backend can scale horizontally (multiple instances) without a shared session store
- No sticky sessions needed in a load-balanced deployment

**Alternative considered: Server-side sessions (HttpSession)**
- Pros: Easy to revoke, no token expiry complexity
- Cons: Server must maintain session state; scaling requires a distributed session store (Redis); sticky sessions or session replication needed

**Alternative considered: OAuth 2.0**
- Pros: Industry standard, supports third-party login, excellent token revocation via refresh token rotation
- Cons: Significantly more complex to implement; requires an Authorization Server (Keycloak, Auth0, etc.); overkill for an internal enterprise tool where all users are provisioned by HR

#### JWT Structure

A JWT has three Base64URL-encoded parts separated by `.`:

```
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9    ← Header (algorithm + type)
.
eyJzdWIiOiJ1c2VyQGV4LmNvbSIsInJvbGVzIjpbIlJPTEVfRU1QTE9ZRUUiXSwidXNlcklkIjoiMTIzLi4uIn0=    ← Payload (claims)
.
HMACSHA256_SIGNATURE    ← Signature (verifies integrity)
```

**Payload claims in TMS's tokens:**

| Claim | Content | Example |
|---|---|---|
| `sub` | User's email (username) | `"john@company.com"` |
| `roles` | Array of granted authorities | `["ROLE_MANAGER"]` |
| `userId` | UUID of the user | `"550e8400-..."` |
| `iat` | Issued-at timestamp | Unix epoch |
| `exp` | Expiry timestamp (24h later) | Unix epoch |

The frontend decodes the payload (without verification — it can't verify the signature) to extract `userId` and `roleName` at login time.

#### Full JWT Authentication Flow

```
[1] User submits email + password
    POST /api/v1/auth/login
    Body: { "email": "...", "password": "..." }

[2] AuthController.login() receives request
    → Calls AuthService.login()

[3] AuthService passes credentials to AuthenticationManager
    authenticationManager.authenticate(
        new UsernamePasswordAuthenticationToken(email, password)
    )

[4] AuthenticationManager delegates to DaoAuthenticationProvider
    → Calls CustomUserDetailsService.loadUserByUsername(email)
    → Fetches User from DB by email
    → Wraps in UserDetails object with GrantedAuthority(role)
    → BCryptPasswordEncoder.matches(rawPassword, storedHash) must return true

[5] On success, JwtService.generateToken(userDetails, userId) is called
    → Builds JWT with claims: roles, userId, sub, iat, exp
    → Signs with HMAC-SHA256 using the configured secret key

[6] LoginResponse(token) returned
    → Wrapped: { "success": true, "data": { "token": "eyJ..." } }

[7] Frontend receives token
    → Decodes payload to get userId + role
    → Dispatches setCredentials({ token, user }) to Redux store
    → Persists to localStorage: tms_token and tms_user

[8] Every subsequent request:
    → Request interceptor reads tms_token
    → Checks if expired (client-side expiry check via isTokenExpired())
    → Attaches header: Authorization: Bearer <token>

[9] Backend receives protected request:
    JwtAuthenticationFilter.doFilterInternal()
    → Reads Authorization header
    → Strips "Bearer " prefix
    → JwtService.extractUsername(token) → gets email
    → Loads UserDetails from DB by email
    → JwtService.isTokenValid(token, userDetails) → validates signature + expiry
    → Creates UsernamePasswordAuthenticationToken
    → Sets it in SecurityContextHolder

[10] Spring Security checks @PreAuthorize
    → SecurityContextHolder.getContext().getAuthentication() has the user + authorities
    → Expression evaluated against those authorities
```

#### SecurityConfig Deep Dive

```java
.csrf(AbstractHttpConfigurer::disable)
```
CSRF protection is disabled because the API is stateless (no cookies used for auth). CSRF attacks exploit the browser's automatic cookie sending. Since the JWT is stored in `localStorage` and sent via `Authorization` header (not a cookie), CSRF is not applicable. **Important security note:** If you ever switch to cookie-based auth, re-enable CSRF.

```java
.sessionManagement(session -> session
    .sessionCreationPolicy(SessionCreationPolicy.STATELESS)
)
```
Tells Spring Security never to create an `HttpSession`. This enforces the stateless contract.

```java
.addFilterBefore(jwtAuthenticationFilter, UsernamePasswordAuthenticationFilter.class)
```
Inserts the JWT filter **before** Spring's default `UsernamePasswordAuthenticationFilter`. This is critical — by the time Spring's filter runs, the security context is already populated, so Spring knows the request is authenticated.

```java
.exceptionHandling(ex -> ex
    .authenticationEntryPoint(...)
)
```
Custom entry point for unauthenticated requests. Without this, Spring would return a `403` (based on default behavior). With it, it correctly returns `401` with a JSON body rather than an HTML redirect to a login page.

#### Role Hierarchy

| Role | Capabilities |
|---|---|
| `EMPLOYEE` | Own timesheets, own leave requests, view holidays/projects |
| `MANAGER` | All EMPLOYEE capabilities + approve/reject team timesheets + team leave |
| `HR` | View all employees, manage leave types/balances |
| `HR_MANAGER` | HR capabilities + additional reporting |
| `DIRECTOR` | Full read access, approve timesheets at director level |
| `ADMIN` | Full system access: user management, departments, all operations |

#### BCrypt Password Hashing

```java
@Bean
public PasswordEncoder passwordEncoder() {
    return new BCryptPasswordEncoder();
}
```

BCrypt is used because:
1. It includes a **salt** automatically (prevents rainbow table attacks)
2. It is **deliberately slow** — the work factor makes brute-force expensive
3. `BCryptPasswordEncoder` has a default work factor of 10, meaning 2^10 = 1024 iterations per hash

The raw password is **never stored**. Only the hash is stored in `password_hash` column.

---

### 2.4 Database Schema (Detailed)

The schema is managed by **Flyway** (database migration tool). Every schema change is a numbered SQL file in `resources/db/migration/`. Flyway ensures migrations run in order and each only runs once — this means the database schema is reproducible across all environments.

#### Entity Relationship Overview

```
departments (1) ──── (N) users
users (1) ──────────── (N) users         [self-referencing: manager_id → id]
users (1) ──────────── (N) timesheets
timesheets (1) ──────── (N) time_entries
time_entries (N) ────── (1) projects
time_entries (N) ────── (1) tasks        [optional]
projects (N) ────────── (M) users        [via project_assignments]
users (1) ──────────── (N) leave_requests
users (1) ──────────── (N) leave_balances
leave_balances (N) ──── (1) leave_types
```

#### `users` Table

**Purpose:** Central identity table. Every actor in the system is a `User`.

| Column | Type | Why |
|---|---|---|
| `id` | CHAR(36) | UUID as string for cross-system portability |
| `employee_id` | VARCHAR(50) UNIQUE | Human-readable HR identifier (e.g., "EMP-0042") |
| `email` | VARCHAR(255) UNIQUE | Login credential; also used as JWT subject |
| `password_hash` | VARCHAR(255) | BCrypt hash — never the raw password |
| `manager_id` | CHAR(36) FK → users.id | Self-referencing: builds the org hierarchy |
| `role_id` | INT FK → roles.id | Single role per user (simpler than many-to-many for this domain) |
| `department_id` | INT FK → departments.id | Organizational unit assignment |
| `employment_type` | ENUM('FULL_TIME','PART_TIME','CONTRACT') | Affects leave allocation rules |
| `status` | ENUM('ACTIVE','INACTIVE') | Soft-delete alternative; INACTIVE users cannot log in |

**Design decisions:**
- UUID primary key (not auto-increment `LONG`) for the `users` table. This is because users are referenced across many tables. Auto-increment IDs expose sequential enumeration (attacker could guess `user/1`, `user/2`). UUIDs are opaque.
- `manager_id` is a self-referencing FK. This allows building an org chart without a separate `org_hierarchy` table. The `OrganizationService` traverses this hierarchy recursively.

#### `timesheets` Table

**Purpose:** One record per user per week. Acts as the "container" for that week's time entries.

| Column | Type | Why |
|---|---|---|
| `id` | BIGINT AUTO_INCREMENT | High-frequency table; BIGINT allows billions of records |
| `user_id` | CHAR(36) FK → users.id | Owner |
| `week_start_date` | DATE | Monday of the week (always Monday by convention) |
| `week_end_date` | DATE | Sunday of the week |
| `status` | ENUM | DRAFT → SUBMITTED → APPROVED/REJECTED → LOCKED |
| `submitted_at` | DATETIME | Audit timestamp |
| `approved_at` | DATETIME | Audit timestamp |
| `approved_by` | CHAR(36) FK → users.id | Who approved/rejected |
| `rejection_reason` | VARCHAR(1000) | Required when rejecting |

**Unique constraint:** `(user_id, week_start_date)` — enforces one timesheet per user per week at the database level, even if the application-level check is bypassed (defense in depth).

#### `time_entries` Table

**Purpose:** Individual work entries within a timesheet. Each entry logs time spent on a project/task on a specific day.

| Column | Type | Why |
|---|---|---|
| `timesheet_id` | BIGINT FK → timesheets.id | Parent container |
| `project_id` | BIGINT FK → projects.id | What project this time was for |
| `task_id` | BIGINT FK → tasks.id NULLABLE | Optional task link |
| `work_date` | DATE | Must fall within the timesheet's week |
| `start_time` | TIME | For overlap detection |
| `end_time` | TIME | For overlap detection |
| `duration_minutes` | INT | Derived from end_time - start_time; stored for fast aggregation |
| `task_note` | VARCHAR(255) | Free-form description |

**Why store `duration_minutes` if it can be computed from `start_time` and `end_time`?**  
Denormalization for query performance. Reports that aggregate total hours per project would need to compute duration for every entry on the fly. Storing it removes that computation from SQL aggregations. The trade-off is maintaining consistency (the validator ensures `duration = (end - start)` minutes at write time).

#### `leave_requests` Table

**Purpose:** Records a leave application and its lifecycle.

| Column | Type | Why |
|---|---|---|
| `user_id` | CHAR(36) | Applicant |
| `leave_type_id` | BIGINT FK → leave_types.id | What kind of leave |
| `start_date / end_date` | DATE | Inclusive range |
| `total_days` | INT | Pre-calculated; stored for display and balance deduction |
| `status` | ENUM | PENDING → APPROVED/REJECTED/CANCELLED |
| `approved_by` | CHAR(36) | Manager or HR who acted on it |
| `rejection_reason` | VARCHAR(500) | Required on rejection |

**Why store `total_days`?** Calculating working days between two dates requires knowing weekends and public holidays. This computation happens once at application time (in `LeaveValidator.calculateTotalDays()`) and the result is stored. Repeating this calculation on every read would be expensive and might produce different results if holidays are added retrospectively.

#### `leave_balances` Table

**Purpose:** Tracks each user's leave quota per type per year.

| Column | Type | Why |
|---|---|---|
| `user_id` | CHAR(36) | Owner |
| `leave_type_id` | BIGINT | E.g., Annual, Sick, Casual |
| `year` | INT | Resets each year |
| `total_allocated` | INT | From leave type default (e.g., 20 days annual) |
| `used_leaves` | INT | Incremented on approval |
| `remaining_leaves` | INT | Denormalized: `total_allocated - used_leaves` |

**Unique constraint:** `(user_id, leave_type_id, year)` — one balance record per user per leave category per year.

**Why `remaining_leaves` is denormalized:** Same reason as `duration_minutes` — fast dashboard reads without live arithmetic queries.

#### `projects` & `project_assignments` Tables

```
projects (1) ──── (N) project_assignments (N) ──── (1) users
```

| Column | Purpose |
|---|---|
| `project_code` | Unique short identifier (e.g., "PROJ-42") |
| `project_manager_id` | UUID FK to users — not normalized to assignments to avoid a join for the most common read |
| `status` | PLANNED / ACTIVE / ON_HOLD / COMPLETED / CANCELLED |

`project_assignments` is the join table with extra attributes:

| Column | Purpose |
|---|---|
| `project_role` | DEVELOPER / TESTER / LEAD / MANAGER / ANALYST etc. |
| `assigned_date` | When they joined the project |
| `end_date` | When they left (nullable) |

#### `audit_logs` Table

**Purpose:** Immutable trail of who did what and when. Never updated, only inserted.

| Column | Purpose |
|---|---|
| `user_id` | Who performed the action |
| `action` | Enum: CREATE / UPDATE / DELETE / SUBMIT / APPROVE / REJECT / LOGIN / LOGOUT |
| `entity_type` | String: "TIMESHEET" / "LEAVE" etc. |
| `entity_id` | The affected record's ID |
| `ip_address` | Extracted from `HttpServletRequest` |
| `old_value / new_value` | JSON snapshots (optional) |

#### Performance Indexes (V4 Migration)

```sql
CREATE INDEX idx_timesheets_user_id      ON timesheets(user_id);
CREATE INDEX idx_time_entries_timesheet  ON time_entries(timesheet_id);
CREATE INDEX idx_time_entries_project    ON time_entries(project_id);
CREATE INDEX idx_time_entries_user       ON time_entries(user_id);
CREATE INDEX idx_leave_requests_user     ON leave_requests(user_id);
CREATE INDEX idx_leave_requests_status   ON leave_requests(status);
CREATE INDEX idx_users_manager_id        ON users(manager_id);
CREATE INDEX idx_users_department_id     ON users(department_id);
```

**Why these specific indexes?**

- `idx_timesheets_user_id` — The most common query is "give me all timesheets for user X". Without an index, MySQL does a full table scan.
- `idx_time_entries_timesheet` — Loading a timesheet's entries always filters by `timesheet_id`.
- `idx_time_entries_user` — Time overlap detection queries by `userId + workDate`.
- `idx_leave_requests_status` — Manager approval page always filters `WHERE status = 'PENDING'`.
- `idx_users_manager_id` — Org chart and manager-scoped reports traverse `WHERE manager_id = ?`.

---

### 2.5 API Design

#### URL Structure Convention

```
/api/v1/{resource}               ← collection
/api/v1/{resource}/{id}          ← single resource
/api/v1/{resource}/{id}/action   ← state transition (not CRUD)
/api/v1/{resource}/user/{userId} ← filtered collection
```

Examples:
```
POST   /api/v1/timesheets              → create timesheet
GET    /api/v1/timesheets/{id}         → get timesheet
POST   /api/v1/timesheets/{id}/submit  → submit (state change)
POST   /api/v1/timesheets/{id}/approve → approve (state change)
GET    /api/v1/timesheets/user/{userId}→ user's timesheets
```

**Why `/submit` instead of `PATCH /timesheets/{id}` with `status: "SUBMITTED"`?**  
State transitions are business operations, not simple field updates. Using explicit action verbs:
1. Makes the intent explicit
2. Allows different `@PreAuthorize` rules per transition
3. Allows the service to enforce valid state machines (you can't approve an already-rejected timesheet)

#### ApiResponse Wrapper

Every endpoint returns a consistent envelope:

```java
@Getter @Builder
@JsonInclude(JsonInclude.Include.NON_NULL)
public class ApiResponse<T> {
    private final boolean success;
    private final T data;
    private final String message;
    private final String errorCode;  // only on errors
}
```

**Success response:**
```json
{
  "success": true,
  "data": { "id": 1, "status": "DRAFT", ... },
  "message": "Timesheet created"
}
```

**Error response:**
```json
{
  "success": false,
  "errorCode": "VALIDATION_FAILED",
  "message": "weekStartDate: must not be null"
}
```

`@JsonInclude(Include.NON_NULL)` ensures that `data` is omitted from error responses and `errorCode` is omitted from success responses — cleaner JSON.

**Why this wrapper?** A bare DTO response gives no standard way to communicate success/failure metadata. The wrapper makes it trivial for the frontend to check `response.data.success` and either use `response.data.data` or display `response.data.message`.

#### HTTP Status Codes Used

| Status | When Used |
|---|---|
| 200 OK | Successful GET, successful state transitions (submit/approve) |
| 201 Created | Successful POST that creates a new resource |
| 400 Bad Request | Validation failures, invalid state transitions |
| 401 Unauthorized | Missing or expired JWT |
| 403 Forbidden | Valid JWT but insufficient role/ownership |
| 404 Not Found | Resource doesn't exist |
| 409 Conflict | Duplicate timesheet for week, leave overlap, holiday conflict |
| 500 Internal Server Error | Unexpected exceptions (caught by `GlobalExceptionHandler`) |

#### DTO Pattern

DTOs (Data Transfer Objects) are separate classes from entities:

```
TimesheetCreateRequest  ← what the client sends
Timesheet               ← the JPA entity (never exposed)
TimesheetResponse       ← what the client receives
```

**Why not just return the entity directly?**

1. **Security:** Entities may have sensitive fields (e.g., `passwordHash` on `User`). DTOs allow deliberate field selection.
2. **API stability:** The entity schema may change for DB reasons without breaking the API contract.
3. **Performance:** Entities with lazy-loaded collections would trigger additional queries if serialized directly (N+1 problem). DTOs are populated with exactly the data needed.
4. **Validation:** `@NotBlank`, `@Size` etc. on request DTOs don't pollute entity classes.

#### MapStruct Mappers

```java
@Mapper(componentModel = "spring")
public interface TimesheetMapper {
    Timesheet toTimesheetEntity(TimesheetCreateRequest request);
    TimesheetResponse toTimesheetResponse(Timesheet timesheet);
}
```

MapStruct generates the actual mapping implementation at **compile time** (not runtime reflection). This means:
- Zero runtime overhead
- Compile-time error if a mapping is impossible
- IDE support for refactoring

The generated code is essentially hand-written getters/setters — fast and debuggable.

---

### 2.6 Business Logic Deep Dive

#### Timesheet State Machine

```
              ┌─────────────────────────────────┐
              │             DRAFT               │ ← initial state
              └──────────────┬──────────────────┘
                             │ submit (employee)
                             ▼
              ┌─────────────────────────────────┐
              │           SUBMITTED              │
              └──────┬───────────────┬──────────┘
             approve │               │ reject
            (manager)│               │(manager)
                     ▼               ▼
              ┌──────────┐   ┌───────────────┐
              │ APPROVED │   │   REJECTED    │──── re-submit ──→ SUBMITTED
              └──────────┘   └───────────────┘
                     │
              lock (admin)
                     ▼
              ┌──────────┐
              │  LOCKED  │  ← immutable, for payroll
              └──────────┘
```

A timesheet can only transition forward through defined states. The `TimesheetValidator` enforces this:

```java
// Cannot submit if not DRAFT or REJECTED
public void validateTimesheetCanBeSubmitted(Timesheet timesheet) {
    if (timesheet.getStatus() != TimesheetStatus.DRAFT
            && timesheet.getStatus() != TimesheetStatus.REJECTED) {
        throw new InvalidTimesheetStateException(...);
    }
}

// Cannot approve if not SUBMITTED
public void validateTimesheetCanBeApproved(Timesheet timesheet) {
    if (timesheet.getStatus() != TimesheetStatus.SUBMITTED) {
        throw new InvalidTimesheetStateException(...);
    }
}
```

#### Time Entry Overlap Detection

When adding a time entry, the system prevents two entries on the same day from having overlapping times. The algorithm:

```
New entry: start=09:00, end=11:00
Existing entries on same day: 08:00-10:00, 11:00-13:00

Overlap condition:
  existing.startTime < new.endTime  AND  existing.endTime > new.startTime

Check 08:00-10:00: 08:00 < 11:00 = true AND 10:00 > 09:00 = true → OVERLAP! ✗
Check 11:00-13:00: 11:00 < 11:00 = false → No overlap ✓
```

This is implemented as a JPQL query in `TimeEntryRepository`:

```java
@Query("SELECT te FROM TimeEntry te " +
       "WHERE te.userId = :userId " +
       "AND te.workDate = :workDate " +
       "AND te.startTime < :endTime " +
       "AND te.endTime > :startTime " +
       "AND te.id <> :excludeId")
List<TimeEntry> findOverlappingEntries(...);
```

The `excludeId` parameter is used when **updating** an existing entry — you don't want the entry to conflict with itself.

#### Leave Validation Chain

When a leave request is created, the `LeaveValidator` runs this chain:

```
1. validateLeaveTypeExists()       → Does leave type ID exist in DB?
2. validateDateRange()             → start_date ≤ end_date? Not in the past? Max 90 days?
3. calculateTotalDays()            → Count working days (exclude weekends + public holidays)
4. validateSufficientBalance()     → Does user have enough remaining days of this type?
5. validateNoApprovedLeaveOverlap()→ Does this date range overlap with any APPROVED leave?
```

Only after all five checks pass does the leave request get saved. If any check fails, a specific exception is thrown: `InsufficientLeaveBalanceException`, `LeaveOverlapException`, `LeaveConflictException`, etc. These are domain-specific exceptions, not generic `IllegalArgumentException`s, which allows:
- Specific HTTP status codes per exception type
- Clear error messages for the frontend to display
- Easy to unit test each validation individually

#### Audit Logging via AOP

```java
@Audit(action = AuditAction.SUBMIT, entityType = "TIMESHEET", description = "Timesheet submitted for approval")
public TimesheetResponse submitTimesheet(Long id) { ... }
```

The `@Audit` annotation triggers `AuditAspect.auditMethod()`:

```java
@Around("@annotation(auditAnnotation)")
public Object auditMethod(ProceedingJoinPoint pjp, Audit auditAnnotation) throws Throwable {
    Object result = pjp.proceed();  // Execute the actual method first
    
    // Only log if the method succeeded
    AuditLog log = AuditLog.builder()
        .userId(resolveCurrentUserId())     // from SecurityContextHolder
        .action(auditAnnotation.action())
        .entityType(auditAnnotation.entityType())
        .entityId(resolveEntityId(pjp.getArgs())) // first Long/UUID arg
        .ipAddress(resolveIpAddress())       // from HttpServletRequest
        .build();
    
    auditService.saveAuditLog(log);
    return result;
}
```

**Why AOP for auditing?**  
Cross-cutting concern: Audit logging should not pollute service business logic. With AOP, adding audit logging to any method is a one-line annotation. Without AOP, every service method would need a `try { ... } finally { auditService.log(...) }` block — repetitive and easy to forget.

#### Async Event-Driven Notifications

When a timesheet is submitted:

```java
// TimesheetService.submitTimesheet()
eventPublisher.publishEvent(new TimesheetSubmittedEvent(
    this, submitter.getId(), saved.getId(),
    submitter.getEmail(), submitter.getName(),
    managerId, managerEmail
));
```

`NotificationEventListener.onTimesheetSubmitted()` handles this event:

```java
@Async
@EventListener
public void onTimesheetSubmitted(TimesheetSubmittedEvent event) {
    // 1. Create in-app notification for employee
    notificationService.createNotification(...);
    
    // 2. Send HTML email to employee
    emailService.sendNotificationEmail(event.getSubmitterEmail(), ...);
    
    // 3. Create in-app notification for manager
    notificationService.createNotification(managerNotif);
    
    // 4. Send HTML email to manager
    emailService.sendNotificationEmail(event.getManagerEmail(), ...);
}
```

`@Async` means this runs on the `tms-async-*` thread pool, not the HTTP request thread. The submitter sees a `200 OK` immediately. The notifications were dispatched in the background. If email sending fails, the timesheet is still submitted — email failure doesn't roll back the business operation.

**Why Spring Events instead of direct service calls?**  
`TimesheetService` does not depend on `NotificationService`. This removes a coupling that would create a circular dependency (notification might need timesheet data). The event publisher is a Spring framework class, not a domain class. This is the **Observer pattern** implemented with Spring's built-in event bus.

---

### 2.7 Design Patterns Used

#### 1. Repository Pattern

All database interactions go through interfaces extending `JpaRepository<Entity, ID>`. The actual SQL/JPQL is defined in the interface as method signatures or `@Query` annotations.

**Benefit:** The service layer never writes SQL. If you switch from MySQL to PostgreSQL, only the Hibernate dialect changes — not a single service method.

#### 2. Service Layer Pattern

Business logic is isolated in `@Service` classes. Controllers are thin — they validate input and delegate. No business logic in controllers or repositories.

**Benefit:** Business logic is testable with plain unit tests (mock the repository, test the service). Controllers can be tested with `MockMvc`. Repositories can be tested with `@DataJpaTest`.

#### 3. DTO Pattern

Three kinds of DTOs per domain module:
- `*CreateRequest` — what comes in for creation
- `*UpdateRequest` — what comes in for updates
- `*Response` — what goes out

**Benefit:** API contract is decoupled from persistence model. Breaking DB changes don't break API.

#### 4. Exception Handling Pattern

Custom exceptions per domain:

```
Exception
└── RuntimeException (unchecked)
    ├── ResourceNotFoundException  → 404
    ├── ValidationException        → 400
    ├── ForbiddenException         → 403
    ├── UnauthorizedException      → 401
    ├── TimesheetLockedException   → 400
    ├── InvalidTimesheetStateException → 400
    ├── TimeOverlapException       → 409
    ├── LeaveOverlapException      → 409
    ├── InsufficientLeaveBalanceException → 400
    └── HolidayConflictException   → 409
```

`GlobalExceptionHandler` (`@RestControllerAdvice`) maps each type to an HTTP status and `ApiResponse.error()`. This centralizes error handling — no `try/catch` in controllers.

#### 5. Observer Pattern (Spring Events)

`ApplicationEventPublisher.publishEvent()` → `@EventListener` in listener classes. Used for notifications, decoupling the action from its side effects.

#### 6. Aspect-Oriented Programming (AOP)

`AuditAspect` is a cross-cutting concern implemented as an `@Aspect`. Does not modify business code.

---

### 2.8 Performance Considerations

#### N+1 Query Problem

**What is it?** If you load a list of 100 users and then for each user you call `user.getTimesheets()`, Hibernate fires 101 queries (1 for users + 100 for timesheets).

**How it's avoided here:**
1. Entities in TMS do **not** use `@OneToMany` or `@ManyToOne` JPA relationships for most associations. Instead, foreign keys are stored as plain `Long` or `UUID` fields. Joins are done explicitly in service layer queries.
2. The `User` entity has `role` loaded `FetchType.EAGER` because every security check needs the role — it saves a join query on every authenticated request.
3. The `open-in-view: false` setting in `application.yml` disables the "Open Session in View" anti-pattern, which would keep a Hibernate session open for the entire HTTP request, making lazy loading silently work from the view/controller layer — a common source of N+1 in Spring apps.

#### HikariCP Connection Pool

```yaml
hikari:
  maximum-pool-size: 10
  minimum-idle: 5
  connection-timeout: 30000
  idle-timeout: 600000
  max-lifetime: 1800000
```

- `maximum-pool-size: 10` — Up to 10 simultaneous DB connections. Rule of thumb: `(2 × core_count) + effective_disk_spindles`. For a small app, 10 is safe.
- `minimum-idle: 5` — Always keep 5 connections alive. Avoids connection establishment overhead on burst traffic.
- `max-lifetime: 1800000` (30 min) — Connections are recycled before MySQL's `wait_timeout` closes them from the server side.

#### `@Transactional(readOnly = true)` Class Default

As explained above, this skips Hibernate's dirty-check flush on read-only operations, which is a significant saving for methods that fetch large collections.

#### Stored `duration_minutes` Field

Rather than computing `TIMESTAMPDIFF(MINUTE, start_time, end_time)` in every aggregate query, the pre-computed value is stored and indexed through `SUM(duration_minutes)` queries.

---

### 2.9 Future Improvements

| Improvement | Why | How |
|---|---|---|
| **Redis cache for reports** | ReportService loads all timesheets/users into memory on every request | Add `spring-boot-starter-data-redis`; `@Cacheable("employee-hours-report")` with TTL |
| **JWT refresh tokens** | Current 24h tokens cannot be revoked if compromised | Implement refresh token rotation with short-lived access tokens (15 min) and long-lived refresh tokens (7 days) stored server-side |
| **Kafka for notifications** | Current Spring Events are in-process; if the service crashes, events are lost | Produce events to a Kafka topic; a separate notification service consumes them |
| **Database pagination** | `findAll()` returns all records | Use `Pageable` parameters in repository methods; `Page<T>` return type |
| **Database indexing improvements** | Composite indexes for multi-column queries | Add `(user_id, status)` on `timesheets`; `(user_id, work_date)` on `time_entries` |
| **Microservices extraction** | The notification and report modules are natural extraction candidates | Extract to separate Spring Boot services; API Gateway (Spring Cloud Gateway) for routing |
| **CQRS** | Read-heavy reports use same model as writes | Separate read model optimized for reporting (denormalized summary tables) |
| **WebSocket for real-time notifications** | Employees must refresh to see notifications | Spring WebSocket + STOMP; push notification events over WS connection |

---

## 3. Frontend (React) — Full Explanation

### 3.1 Architecture & Folder Structure

```
src/
├── api/                    ← axios client + endpoint constants
│   ├── axiosClient.ts      ← configured axios instance with interceptors
│   └── endpoints.ts        ← URL constants
├── components/             ← truly generic, application-agnostic UI
│   ├── ui/                 ← base primitives (Button, Input, Badge, Card, Dialog...)
│   ├── navigation/         ← Sidebar, Navbar, Header, SidebarItem
│   ├── auth/               ← LoginForm, AuthLayout
│   ├── common/             ← Spinner, ErrorBoundary
│   └── theme/              ← ThemeProvider, ThemeToggle (dark mode)
├── config/
│   └── env.ts              ← reads VITE_API_BASE_URL from environment
├── context/
│   └── AuthContext.tsx     ← wraps Redux auth slice; provides login/logout to components
├── features/               ← RTK Query API slices (one per backend domain)
│   ├── auth/               ← authApi.ts + authSlice.ts
│   ├── timesheets/         ← timesheetsApi.ts
│   ├── leave/              ← leaveApi.ts
│   ├── holidays/           ← holidaysApi.ts
│   ├── projects/           ← projectsApi.ts
│   ├── tasks/              ← tasksApi.ts
│   ├── notifications/      ← notificationsApi.ts
│   ├── reports/            ← reportsApi.ts
│   └── ...
├── hooks/                  ← small cross-cutting hooks
│   ├── useAuth.ts          ← reads from AuthContext
│   ├── useIsMobile.ts      ← responsive breakpoint detection
│   └── useDocumentTitle.ts ← sets <title> per page
├── layouts/
│   ├── AppLayout.tsx       ← authenticated shell: sidebar + main content
│   └── DashboardLayout.tsx ← inner layout variant
├── modules/                ← feature modules (one per business domain)
│   ├── timesheets/
│   │   ├── components/     ← TimesheetStatusBadge, TimeEntryRow, AddEntryRow...
│   │   ├── hooks/          ← useTimesheets.ts (wraps RTK Query)
│   │   ├── pages/          ← TimesheetDashboardPage, TimesheetEntryPage, HistoryPage
│   │   ├── services/       ← timesheetService.ts (axios-based, legacy path)
│   │   ├── types/          ← timesheet.types.ts
│   │   └── utils/          ← timesheetHelpers.ts (date math)
│   ├── leaves/             ← same structure
│   ├── projects/           ← same structure
│   ├── tasks/              ← same structure
│   ├── dashboard/          ← DashboardPage, EmployeeDashboard, ManagerDashboard, HRDashboard
│   ├── reports/            ← ReportsPage, charts, tables
│   └── ...
├── pages/
│   └── auth/LoginPage.tsx  ← only public page
├── routes/
│   └── ProtectedRoute.tsx  ← redirects to /login if not authenticated
├── store/
│   ├── store.ts            ← Redux store configuration
│   ├── baseApi.ts          ← RTK Query base API + ApiResponse unwrapping
│   └── hooks.ts            ← typed useAppSelector, useAppDispatch
└── types/
    └── api.types.ts        ← shared TypeScript types matching backend DTOs
```

**Why feature modules?** The `modules/` directory follows **vertical slice architecture**. Each business domain (timesheets, leaves, projects) owns its components, hooks, pages, services, and types in one place. This is more scalable than horizontal layers (all components in one folder, all hooks in another) because:
- Changes to the "leave" feature touch only `modules/leaves/`
- Onboarding new developers can focus on a single module
- Modules can be extracted to separate micro-frontends if needed

---

### 3.2 State Management

TMS uses a **hybrid state management strategy**:

| Layer | Tool | What it manages |
|---|---|---|
| Server state (cached API data) | RTK Query (Redux Toolkit Query) | Timesheets, users, leaves, projects, etc. |
| Global UI state | Redux slice (`authSlice`) | Auth token, current user, isLoading |
| Local UI state | React `useState` | Modal open/close, form state, filters |
| Form state | React Hook Form | Login form, leave application, timesheet creation |

#### Why RTK Query?

RTK Query is a data-fetching library built into Redux Toolkit. It replaces the pattern of manually writing `fetch → setLoading(true) → setData → setLoading(false) → setError` for every API call.

Benefits:
- **Automatic caching:** The same data fetched by two components is only fetched once. Subsequent components read from cache.
- **Automatic re-fetching:** When a mutation (createTimesheet, submitTimesheet) invalidates a tag (`'Timesheet'`), all queries subscribed to that tag automatically refetch.
- **Loading/error states:** `isLoading`, `isFetching`, `isError` are provided out of the box.
- **Optimistic updates:** Can be configured per mutation.

**Tag invalidation example:**

```typescript
// When submitting a timesheet, invalidate the cache:
submitTimesheet: builder.mutation<TimesheetResponse, number>({
  query: (id) => ({ url: `/timesheets/${id}/submit`, method: 'POST', body: {} }),
  invalidatesTags: (_result, _error, id) => [
    { type: 'Timesheet', id },    // invalidate this specific timesheet
    'Timesheet',                   // invalidate all timesheet queries
  ],
}),
```

When the mutation succeeds, any component using `useGetTimesheetsByUserQuery()` automatically refetches the latest data.

#### authSlice

The authentication state is a standard Redux slice:

```typescript
interface AuthState {
  token: string | null      // JWT string
  user: AuthUser | null     // { email, userId, roleName }
  isLoading: boolean
}
```

On login: `setCredentials({ token, user })` → saves to Redux + localStorage  
On logout: `logout()` → clears Redux + localStorage + resets all RTK Query cache

**Why localStorage for the token?**  
The alternative is `httpOnly` cookies (more secure against XSS). The trade-off here was simplicity — a cookie solution requires `SameSite=None; Secure` for cross-origin requests, CORS `allowCredentials: true` (already configured), and cannot be read by JavaScript (which means the frontend cannot decode the JWT to extract userId/role without storing them separately).

The current approach stores the token in localStorage and reads it in request interceptors. The expiry check in the interceptor mitigates persistent stale tokens.

**Logout listener clears RTK Query cache:**

```typescript
const authListener = createListenerMiddleware()
authListener.startListening({
  actionCreator: logout,
  effect: (_action, listenerApi) => {
    listenerApi.dispatch(baseApi.util.resetApiState())
  },
})
```

Without this, if User A logs out and User B logs in on the same browser, User B might see User A's cached notifications/timesheets for up to 60 seconds (the default `keepUnusedDataFor` window). The listener ensures the cache is wiped immediately on logout.

---

### 3.3 API Integration

There are **two API layers** in the frontend:

**Layer 1: RTK Query (preferred, modern)**
- `features/timesheets/timesheetsApi.ts` — injects endpoints into `baseApi`
- Components use hooks: `useGetTimesheetsByUserQuery(userId)`
- Handles caching, loading states, and tag invalidation automatically

**Layer 2: Axios services (legacy, direct)**
- `modules/timesheets/services/timesheetService.ts`
- Used in the complex `TimesheetEntryPage` where the component needs fine-grained control over multiple sequential API calls
- Uses `axiosClient.ts` which has interceptors

#### axiosClient Interceptors

```typescript
// Request interceptor — attaches JWT
axiosClient.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token = localStorage.getItem('tms_token')
    if (token) {
      if (isTokenExpired(token)) {
        redirectToLogin()                          // ← proactive expiry check
        return Promise.reject(new Error('Session expired'))
      }
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  }
)

// Response interceptor — handles 401 globally
axiosClient.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    if (error.response?.status === 401) {
      redirectToLogin()                            // ← reactive 401 handling
    }
    return Promise.reject(error)
  }
)
```

**Why two 401 handling mechanisms?**
- The request interceptor catches locally-expired tokens **before** the network round-trip. Fast UX — no wasted request.
- The response interceptor catches server-rejected tokens (e.g., the server re-signed the secret and all old tokens are invalid). Belt-and-suspenders approach.

#### RTK Query baseQueryWithAuth

```typescript
export const baseQueryWithAuth: BaseQueryFn = async (args, api, extraOptions) => {
  const result = await rawBaseQuery(args, api, extraOptions)

  if (result.error?.status === 401) {
    api.dispatch(logout())   // triggers cache clear + redirect
    return result
  }

  // Unwrap ApiResponse<T> envelope
  if (result.data && 'data' in (result.data as ApiResponse<unknown>)) {
    return { data: (result.data as ApiResponse<unknown>).data }
  }

  return result
}
```

The backend wraps everything in `{ success, data, message }`. This query wrapper unwraps it so RTK Query endpoints receive the plain `T` data — components never see the envelope.

---

### 3.4 Routing & Navigation

```typescript
// App.tsx — route tree

<Routes>
  {/* Public */}
  <Route path="/login" element={<LoginPage />} />

  {/* Protected — must be authenticated */}
  <Route element={<ProtectedRoute />}>
    <Route element={<AppLayout />}>    {/* sidebar + header shell */}
      <Route path="/*" element={
        <Suspense fallback={<PageSpinner />}>
          <Routes>
            <Route path="/dashboard"   element={<DashboardPage />} />
            <Route path="/timesheets"  element={<TimesheetDashboardPage />} />
            <Route path="/timesheets/:id" element={<TimesheetEntryPage />} />
            {/* ... all other routes ... */}
          </Routes>
        </Suspense>
      } />
    </Route>
  </Route>
</Routes>
```

#### ProtectedRoute

```typescript
export default function ProtectedRoute() {
  const { isAuthenticated } = useAuth()
  const location = useLocation()

  if (!isAuthenticated) {
    // Preserve the attempted URL so we can redirect back after login
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  return <Outlet />
}
```

`<Outlet />` renders the matched nested route. If not authenticated, React Router redirects to `/login`. The `state={{ from: location }}` pattern allows the login page to redirect back to the original URL after successful login.

#### Role-Based Dashboard

The `DashboardPage` acts as a router based on role:

```typescript
function DashboardPage() {
  const { user } = useAuth()
  const role = user?.roleName

  if (role === 'MANAGER') return <ManagerDashboardPage />
  if (role === 'HR' || role === 'HR_MANAGER') return <HRDashboardPage />
  return <EmployeeDashboardPage />  // default
}
```

This is simpler than having role-specific routes (`/manager-dashboard`) because:
- The URL `/dashboard` is bookmarkable by all roles
- The backend already scopes the report data by role
- No route-level role guards needed

#### Lazy Loading

Every page beyond `LoginPage` is code-split and loaded on demand:

```typescript
const TimesheetEntryPage = lazy(() => import('@/modules/timesheets/pages/TimesheetEntryPage'))
```

**Why?** The initial bundle size without lazy loading would include all 20+ pages. With code splitting, the initial paint only loads what's needed for `/login` and the auth flow. Each route's chunk is fetched on first navigation to that route. `<Suspense fallback={<PageSpinner />}>` shows a spinner during the download.

---

### 3.5 UI/UX Design Decisions

#### Design System: Radix UI + Tailwind CSS

Components in `src/components/ui/` wrap **Radix UI** primitives with **Tailwind CSS** styling:

| Component | Radix Primitive | Purpose |
|---|---|---|
| `Button` | None (custom) | Primary action, loading state, variant (primary/outline/ghost) |
| `Input` | None (custom) | Form input with label, error state |
| `Dialog` | `@radix-ui/react-dialog` | Modal overlay; accessible keyboard navigation built-in |
| `DropdownMenu` | `@radix-ui/react-dropdown-menu` | Context menus with keyboard nav |
| `Badge` | None (custom) | Status indicators |
| `Checkbox` | `@radix-ui/react-checkbox` | Accessible checkbox |
| `Tooltip` | `@radix-ui/react-tooltip` | Hover information |

**Why Radix UI?** It provides accessibility (ARIA attributes, keyboard navigation, focus management) for free. Building accessible modals and dropdowns from scratch is extremely complex. Radix is "headless" — it provides behavior and accessibility, but no styling, so Tailwind applies freely.

**Why Tailwind CSS?** Utility-first CSS eliminates context switching between component files and stylesheet files. It prevents CSS specificity conflicts and dead CSS accumulation. The `cn()` utility (combines `clsx` + `tailwind-merge`) handles conditional classes:

```typescript
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Usage
<button className={cn(
  "base-styles",
  isActive && "active-styles",
  disabled && "disabled-styles"
)} />
```

#### TanStack Table for Data Display

The user list, project list, task list, and timesheet history use `@tanstack/react-table` for:
- Sortable columns (client-side)
- Column visibility toggles
- Row selection
- Pagination

#### Recharts for Reports

`recharts` (React wrapper for D3) is used in the reports module:
- `BarChart` for hours per project
- `LineChart` for weekly trend
- `PieChart` for leave distribution

#### Dark Mode

`ThemeProvider` (Context-based) toggles `dark` class on `<html>`. Tailwind's `dark:` variant applies dark-mode styles. Preference is persisted in `localStorage`.

#### Toast Notifications (Sonner)

`sonner` provides toast notifications for action feedback:

```typescript
toast.success("Timesheet submitted successfully")
toast.error("Failed to submit: " + errorMessage)
```

Toasts are global — the `<Toaster>` component is mounted once in `main.tsx`.

#### ErrorBoundary

```typescript
<ErrorBoundary>
  <Routes>...</Routes>
</ErrorBoundary>
```

Catches unhandled React render errors (which would otherwise crash the entire UI) and shows a fallback "Something went wrong" message. Applied at both the root level and around the inner route tree.

---

### 3.6 Optimizations

#### Code Splitting (Lazy Loading)
All pages are dynamically imported, reducing the initial bundle to < 200KB parsed JS.

#### RTK Query Caching
Repeated navigation to the same page does not re-fetch data until the cache tag is invalidated. The `keepUnusedDataFor` defaults to 60 seconds.

#### `useMemo` / `useCallback`
Used in `TimesheetEntryPage` for expensive date calculations:
```typescript
const weekDates = useMemo(() => getWeekDates(weekStartDate), [weekStartDate])
```

#### Component Granularity
`TimeEntryRow` is a separate component from `TimesheetEntryPage`. React only re-renders the changed row when an entry is edited, not the entire page.

#### Vite Build Tooling
Vite uses native ES modules during development (instant HMR, no bundle step) and Rollup for production builds with tree-shaking and chunk optimization.

---

### 3.7 Future Improvements

| Improvement | Why |
|---|---|
| **Optimistic updates in RTK Query** | Currently, submit/approve actions wait for server response before updating UI. Optimistic updates would make it feel instantaneous. |
| **React Query's `staleTime` tuning** | Some data (holidays, departments) almost never changes. Setting `staleTime: Infinity` would prevent unnecessary refetches. |
| **Virtual scrolling for large tables** | The user list and timesheet history don't paginate; with 500+ users the DOM becomes heavy. `@tanstack/react-virtual` would virtualize the list. |
| **Accessibility audit** | Add `aria-live` regions for toast notifications; ensure all interactive elements are keyboard-reachable; test with screen readers. |
| **Service Worker / PWA** | Cache static assets; allow offline read of current timesheet. |
| **Error boundary per module** | Currently a single root error boundary. A module-level boundary would let one module crash without affecting others. |
| **Zustand instead of Redux** | For a project of this size, Zustand would be simpler. Redux is more powerful but adds boilerplate. The current RTK Query setup is well-organized, so migration is not urgent. |

---

## 4. End-to-End Flows

### 4.1 Login Flow

**Step-by-step, from browser to database and back:**

```
1. USER ACTION
   User navigates to https://TMS.app/login
   React Router renders <LoginPage>
   LoginPage renders <LoginForm>

2. FORM SUBMISSION
   User fills email + password, clicks "Sign In"
   React Hook Form validates fields (not blank, valid email format)
   If valid → calls login() from AuthContext

3. AUTHCONTEXT.login()
   Dispatches setAuthLoading(true) to Redux
   Calls loginMutation({ email, password }) from RTK Query authApi
   
4. RTK QUERY → BASE API → BACKEND
   HTTP POST /api/v1/auth/login
   Body: { "email": "john@company.com", "password": "secret123" }
   No Authorization header (public endpoint)

5. SPRING SECURITY FILTER CHAIN
   JwtAuthenticationFilter runs → no Bearer token → passes through
   SecurityConfig: /api/v1/auth/login is in PUBLIC_ENDPOINTS → permitAll()

6. AuthController.login()
   Calls AuthService.login(request)

7. AuthService.login()
   authenticationManager.authenticate(
     new UsernamePasswordAuthenticationToken("john@company.com", "secret123")
   )
   
   → DaoAuthenticationProvider
   → CustomUserDetailsService.loadUserByUsername("john@company.com")
      → UserRepository.findByEmail("john@company.com")
      → Returns User entity
      → Wraps in org.springframework.security.core.userdetails.User
         authorities = [new SimpleGrantedAuthority("ROLE_EMPLOYEE")]
   → BCryptPasswordEncoder.matches("secret123", storedHash) → true
   → Authentication successful

8. JWT GENERATION
   jwtService.generateToken(userDetails, user.getId())
   Payload: {
     "sub": "john@company.com",
     "roles": ["ROLE_EMPLOYEE"],
     "userId": "550e8400-e29b-41d4-a716-446655440000",
     "iat": 1710000000,
     "exp": 1710086400  (24h later)
   }
   Signed with HMAC-SHA256 using configured secret

9. RESPONSE
   HTTP 200 OK
   { "success": true, "data": { "token": "eyJ..." }, "message": "Login successful" }

10. RTK QUERY UNWRAPS
    baseQueryWithAuth strips the ApiResponse envelope
    Returns { token: "eyJ..." }

11. FRONTEND AUTH PROCESSING
    AuthContext receives token
    Decodes JWT payload (base64 decode, no server call)
    Extracts: sub (email), roles[0] (roleName), userId
    Dispatches setCredentials({ token, user: { email, roleName, userId } })
    
    authSlice.setCredentials():
    → state.token = "eyJ..."
    → state.user = { email: "john@...", roleName: "EMPLOYEE", userId: "550e..." }
    → localStorage.setItem("tms_token", "eyJ...")
    → localStorage.setItem("tms_user", JSON.stringify({...}))

12. REDIRECT
    AuthContext calls navigate("/dashboard")
    React Router renders <DashboardPage>
    Since roleName = "EMPLOYEE" → <EmployeeDashboardPage> is rendered
    Dashboard immediately fetches: timesheets, leave balance, notifications
    (using userId from Redux state as query parameter)
```

---

### 4.2 Timesheet Flow

**Complete lifecycle from creation to approval:**

```
┌─────────────────────────────────────────────────────────────────┐
│ PHASE 1: CREATE TIMESHEET (Employee)                            │
└─────────────────────────────────────────────────────────────────┘

1. Employee navigates to /timesheets
   TimesheetDashboardPage loads, fetches user's timesheets
   GET /api/v1/timesheets/user/{userId}
   
2. No timesheet for current week → "Create Timesheet" button shown
   Employee clicks it
   
3. createTimesheet mutation fires
   POST /api/v1/timesheets
   Body: { "userId": "550e...", "weekStartDate": "2026-03-23", "weekEndDate": "2026-03-29" }

4. Backend: TimesheetController.createTimesheet()
   → @PreAuthorize: any authenticated role ✓
   → @Valid validates request
   → timesheetService.createWeeklyTimesheet(request)
     → timesheetValidator.validateNoDuplicateTimesheetForWeek(userId, weekStart)
        → timesheetRepository.findByUserIdAndWeekStartDate() → empty → OK
     → timesheetMapper.toTimesheetEntity(request)
     → timesheet.setStatus(DRAFT)
     → timesheetRepository.save(timesheet)
     → Returns TimesheetResponse { id: 1, status: "DRAFT", ... }

5. Response: 201 Created
   RTK Query invalidates 'Timesheet' tag → dashboard refetches → timesheet appears

┌─────────────────────────────────────────────────────────────────┐
│ PHASE 2: ADD TIME ENTRIES (Employee)                            │
└─────────────────────────────────────────────────────────────────┘

6. Employee clicks the timesheet → navigates to /timesheets/1
   TimesheetEntryPage loads
   Fetches: timesheet details, existing entries, available projects, tasks

7. Employee clicks "Add Entry" in AddEntryRow component
   Selects: Project = "Website Redesign", Task = "Frontend Dev"
   Fills: Date = "Monday 2026-03-23", Start = 09:00, End = 13:00
   Description: "Implemented login page"
   
8. Frontend calculates duration: 09:00 → 13:00 = 240 minutes
   Validates no overlap with existing entries for that date (client-side check)
   
9. createTimeEntry mutation fires
   POST /api/v1/time-entries
   Body: { "timesheetId": 1, "projectId": 5, "taskId": 12, "userId": "550e...",
           "workDate": "2026-03-23", "startTime": "09:00", "endTime": "13:00",
           "durationMinutes": 240, "taskNote": "Frontend Dev",
           "description": "Implemented login page" }

10. Backend: TimeEntryController → TimeEntryService
    → timesheetValidator.validateTimesheetIsEditable(timesheet) → DRAFT → OK
    → timesheetValidator.validateNoTimeOverlap(userId, date, 09:00, 13:00, -1L)
       → TimeEntryRepository.findOverlappingEntries() → no overlap → OK
    → timesheetValidator.validateDailyHoursLimit() → 240 < 1440 → OK
    → timeEntryRepository.save(entry)
    → Returns TimeEntryResponse

11. Employee adds more entries throughout the week
    Total hours displayed: sum of durationMinutes / 60

┌─────────────────────────────────────────────────────────────────┐
│ PHASE 3: SUBMIT TIMESHEET (Employee)                            │
└─────────────────────────────────────────────────────────────────┘

12. Employee reviews entries, clicks "Submit for Approval"
    Confirmation dialog shown (Dialog from Radix UI)
    Employee confirms

13. submitTimesheet mutation fires
    POST /api/v1/timesheets/1/submit

14. Backend: TimesheetController.submitTimesheet(1)
    → @PreAuthorize: isAuthenticated() ✓
    → timesheetService.submitTimesheet(1)
      → timesheetValidator.validateTimesheetCanBeSubmitted(timesheet)
         → status == DRAFT → OK
      → timesheetValidator.validateTimesheetHasEntries(1)
         → timeEntryRepository.existsByTimesheetId(1) → true → OK
      → timesheet.setStatus(SUBMITTED)
      → timesheet.setSubmittedAt(LocalDateTime.now())
      → timesheetRepository.save(timesheet)
      
      → eventPublisher.publishEvent(new TimesheetSubmittedEvent(
           submitter.getId(), timesheetId,
           submitter.getEmail(), submitter.getName(),
           managerId, managerEmail
        ))
      
      (event is handled ASYNCHRONOUSLY on tms-async thread pool)
      
      → NotificationEventListener.onTimesheetSubmitted():
          Creates in-app notification for employee: "Timesheet #1 submitted"
          Sends HTML email to employee confirming submission
          Creates in-app notification for manager: "Timesheet pending review"
          Sends HTML email to manager

15. Response: 200 OK, status: "SUBMITTED"
    Frontend shows toast: "Timesheet submitted successfully"
    Status badge changes: DRAFT → SUBMITTED (red → yellow)
    Edit controls disabled (isEditable returns false for SUBMITTED)

┌─────────────────────────────────────────────────────────────────┐
│ PHASE 4: MANAGER REVIEW & APPROVAL                              │
└─────────────────────────────────────────────────────────────────┘

16. Manager logs in, checks notification bell → "Timesheet pending review"
    Manager navigates to /timesheets/manager (ManagerTimesheetDashboardPage)
    Fetches: GET /api/v1/timesheets/manager/{managerId}
    Sees list of submitted timesheets from direct reports

17. Manager clicks "Review" → navigates to /timesheets/manager/review/1
    ManagerTimesheetReviewPage loads timesheet + entries

18. Manager reviews: 40 hours logged across 5 projects, looks correct
    Clicks "Approve"

19. approveTimesheet mutation fires
    POST /api/v1/timesheets/1/approve
    Authorization: Bearer <manager-JWT>

20. Backend: TimesheetController.approveTimesheet(1)
    → @PreAuthorize: @timesheetService.isReportingManagerOfTimesheetOwner(email, 1)
       → Loads timesheet owner (john), checks john.getManagerId() == manager.getId() → true ✓
    → timesheetService.approveTimesheet(1, managerId)
      → validateTimesheetCanBeApproved → status == SUBMITTED → OK
      → timesheet.setStatus(APPROVED)
      → timesheet.setApprovedAt(now())
      → timesheet.setApprovedBy(managerId)
      → timesheetRepository.save()
      
      → eventPublisher.publishEvent(TimesheetApprovedEvent)
      → ASYNC: notifies employee "Timesheet #1 approved"
               sends congratulatory email to employee

21. Response: 200 OK, status: "APPROVED"
    Manager sees: status badge changes SUBMITTED → APPROVED

22. Employee refreshes dashboard → timesheet shows APPROVED
    (Or real-time via in-app notification)
```

---

### 4.3 Leave Flow

```
┌─────────────────────────────────────────────────────────────────┐
│ PHASE 1: EMPLOYEE APPLIES FOR LEAVE                             │
└─────────────────────────────────────────────────────────────────┘

1. Employee navigates to /leave
   LeaveDashboardPage loads
   Fetches: leave requests, leave balances (per type per year)
   
   LeaveBalanceCard shows:
   - Annual: 14 remaining / 20 total
   - Sick: 8 remaining / 10 total
   - Casual: 8 remaining
   
   LeaveCalendar shows approved leaves as colored blocks

2. Employee clicks "Apply for Leave"
   ApplyLeaveModal opens (Dialog)
   
3. Employee fills form:
   - Leave Type: Annual Leave
   - Start Date: 2026-04-01 (Wednesday)
   - End Date: 2026-04-05 (Sunday)
   - Reason: "Family vacation"
   
   Frontend calculates preview: ~4 working days (Mon-Fri, excluding weekend)

4. Employee submits
   POST /api/v1/leave
   Body: { "userId": "550e...", "leaveTypeId": 1, 
           "startDate": "2026-04-01", "endDate": "2026-04-05",
           "reason": "Family vacation" }

5. Backend validation chain:
   LeaveService.createLeaveRequest()
   → leaveValidator.validateLeaveTypeExists(1) → Annual Leave exists ✓
   → leaveValidator.validateDateRange(Apr 1, Apr 5) → valid range ✓
   → leaveValidator.calculateTotalDays(Apr 1, Apr 5)
      → Counts days: Apr 1(Wed), Apr 2(Thu), Apr 3(Fri) = 3 days
      → Apr 4(Sat), Apr 5(Sun) excluded as weekends
      → Total: 3 days
   → leaveValidator.validateSufficientBalance("550e...", 1, 3)
      → leaveBalanceRepository.findByUserIdAndLeaveTypeIdAndYear()
      → remaining = 14, needed = 3 → 14 ≥ 3 ✓
   → leaveValidator.validateNoApprovedLeaveOverlap("550e...", Apr 1, Apr 5, -1L)
      → No approved leaves in this range ✓
   
   All checks pass:
   → leave.setTotalDays(3)
   → leave.setStatus(PENDING)
   → leaveRepository.save()
   
   → eventPublisher.publishEvent(LeaveAppliedEvent)
   → ASYNC: Notifies manager "Leave request from John"
             Sends email to manager with dates and reason

6. Response: 201 Created
   Employee sees toast: "Leave request submitted"
   Calendar shows pending leave in yellow blocks

┌─────────────────────────────────────────────────────────────────┐
│ PHASE 2: MANAGER APPROVES/REJECTS                               │
└─────────────────────────────────────────────────────────────────┘

7. Manager receives notification + email
   Manager navigates to /leave/approvals
   ManagerLeaveApprovalPage shows pending requests from team
   
8a. APPROVE PATH:
   Manager clicks "Approve" on John's request
   PUT /api/v1/leave/123/approve
   Body: { "approvedBy": "manager-uuid" }
   
   Backend:
   → leaveValidator.validateLeaveIsPending(PENDING) ✓
   → leave.setStatus(APPROVED)
   → leave.setApprovedAt(now())
   → leave.setApprovedBy(managerId)
   → leaveBalanceService.deductLeaveBalance("550e...", 1, 3)
      → leaveBalance.setUsedLeaves(usedLeaves + 3)  // was 6, now 9
      → leaveBalance.setRemainingLeaves(20 - 9 = 11)
      → leaveBalanceRepository.save()
   → leaveRepository.save()
   
   ASYNC: Notify John "Your leave has been approved"
          Send email confirming approval

8b. REJECT PATH:
   Manager clicks "Reject", opens RejectLeaveModal
   Fills mandatory rejection reason: "Project deadline conflicts"
   PUT /api/v1/leave/123/reject
   Body: { "approvedBy": "manager-uuid", "rejectionReason": "Project deadline conflicts" }
   
   Backend:
   → leave.setStatus(REJECTED)
   → leave.setRejectionReason("Project deadline conflicts")
   → NO balance deduction (leave was never taken)
   → leaveRepository.save()
   
   ASYNC: Notify John "Your leave has been rejected"
          Send email with the rejection reason

9. FRONTEND UPDATE:
   Status changes: PENDING → APPROVED (green) or REJECTED (red)
   Employee's leave balance updates (refetch triggered by tag invalidation)
   Calendar: yellow pending block → green approved block
```

---

### 4.4 Report Flow

```
1. User navigates to /reports
   ReportsPage renders role-appropriate view:
   - EMPLOYEE  → own hours summary
   - MANAGER   → team hours + project utilization
   - HR        → company-wide leave report
   - DIRECTOR  → all KPIs

2. Frontend fetches report data:
   GET /api/v1/reports/employee-hours?userId=550e...&startDate=2026-01-01&endDate=2026-03-31
   GET /api/v1/reports/project-utilization
   GET /api/v1/reports/leave-summary
   GET /api/v1/reports/kpi-summary

3. Backend: ReportController → ReportService

   ReportService.getEmployeeHoursReport(auth, startDate, endDate):
   
   a. Resolve which users are visible to the caller:
      resolveAccessibleUserIds(auth):
      - ADMIN/HR/DIRECTOR → all active users
      - MANAGER → userRepository.findByManagerId(callerId)
      - EMPLOYEE → Set.of(callerId)
   
   b. Load timesheets for visible users:
      timesheetRepository.findByUserIdIn(visibleUserIds)
      
   c. Filter by date range:
      filterTimesheets(sheets, startDate, endDate)
      
   d. For each timesheet, load time entries:
      timeEntryRepository.findByTimesheetId(ts.getId())
      
   e. Aggregate per employee:
      Map<UUID, Long> minutesPerUser = entries.stream()
          .collect(groupingBy(TimeEntry::getUserId, summingLong(TimeEntry::getDurationMinutes)))
      
   f. Build EmployeeHoursEntry per user:
      { name, email, department, totalHours, billableHours, nonBillableHours }
   
   g. Return EmployeeHoursReport { entries, totalHours, startDate, endDate }

4. Frontend receives data:
   Recharts BarChart renders bars:
   - X axis: employee names
   - Y axis: hours
   - Two bars per employee: billable (blue) + non-billable (grey)
   
   ReportTable renders sortable rows
   ReportFilters allows drill-down by date range / department
   TrendInsights shows bulleted summary ("John logged 15% more than last month")

5. Export (if implemented):
   "Export CSV" button triggers client-side CSV generation from the data
```

---

## 5. Trade-Off Analysis

This section documents every major design decision: why it was made, what alternatives existed, and what would happen if it changed.

### JWT vs Sessions

| Aspect | JWT (chosen) | Server Sessions (alternative) |
|---|---|---|
| Scalability | Stateless — any server can validate | Requires shared session store or sticky sessions |
| Revocation | Cannot revoke before expiry (24h window) | Instant revocation (delete session record) |
| Complexity | Moderate (key management, expiry handling) | Low (built into Spring Session) |
| Security risk | Token theft = 24h access | Session theft = access until session deleted |
| **Decision** | **Chosen for stateless scalability** | Acceptable at small scale |

### MySQL vs PostgreSQL

| Aspect | MySQL (chosen) | PostgreSQL (alternative) |
|---|---|---|
| UUID handling | Stored as CHAR(36) — conversion overhead | Native UUID type — faster, smaller |
| JSONB queries | Limited JSON support | Excellent JSONB indexing |
| Full-text search | Basic | Advanced |
| **Decision** | **Chosen: familiar, widely hosted, compatible with Flyway** | Better for complex queries and JSON |

### Monolith vs Microservices

| Aspect | Monolith (chosen) | Microservices (alternative) |
|---|---|---|
| Deployment | Single JAR, simple | Dozens of services, orchestration needed |
| Transactions | @Transactional, simple, ACID | Distributed transactions (Saga), complex |
| Network latency | None (in-process calls) | Inter-service HTTP/gRPC overhead |
| Team size fit | Small team can understand entire codebase | Requires DevOps maturity, team autonomy |
| **Decision** | **Chosen: appropriate for current team + scale** | Premature for this stage |

### Redux Toolkit (RTK Query) vs React Query vs SWR

| Aspect | RTK Query (chosen) | React Query (alternative) | SWR (alternative) |
|---|---|---|---|
| Bundle size | Larger (Redux included) | Smaller | Smallest |
| DevTools | Excellent Redux DevTools | Good | Basic |
| State management | RTK handles non-server state too | Need separate store (Zustand/Jotai) | Need separate store |
| Mutation invalidation | Tag-based, declarative | Manual invalidation | Manual |
| **Decision** | **Chosen: team already using Redux; RTK Query prevents dual library** | Better DX for server-only state | Too minimal |

### Axios vs Fetch API

| Aspect | Axios (chosen) | Fetch API (alternative) |
|---|---|---|
| Interceptors | First-class support | Manual implementation required |
| Timeout | Built-in | No native timeout |
| Automatic JSON | Automatic parsing and serialization | Manual `.json()` parsing |
| Browser support | Broad + IE | Modern browsers only |
| **Decision** | **Chosen: interceptors critical for JWT injection and 401 handling** | |

### MapStruct vs Manual Mapping vs ModelMapper

| Aspect | MapStruct (chosen) | Manual Mapping | ModelMapper |
|---|---|---|---|
| Performance | Compile-time code gen = native speed | Native speed | Reflection-based = slowest |
| Safety | Compile error if field missing | No safety | Runtime error |
| Maintenance | Auto-detects renamed fields | Manual updates needed | Auto via reflection |
| **Decision** | **Chosen: best of both worlds — safe + fast** | | |

### `CHAR(36)` UUID vs `BINARY(16)` for MySQL UUIDs

| Aspect | CHAR(36) (chosen) | BINARY(16) (alternative) |
|---|---|---|
| Storage | 36 bytes | 16 bytes |
| Human readability | Direct; readable in SQL clients | Needs conversion function |
| Query performance | String comparison | Binary comparison (faster) |
| Hibernate compatibility | Easy with `@JdbcTypeCode(SqlTypes.CHAR)` | More complex mapping |
| **Decision** | **Chosen: developer experience >> marginal performance gain** | Optimize later if needed |

---

## 6. Scalability & Future Improvements

### Current Limitations

TMS in its current form can comfortably serve **up to ~500 concurrent users** on a single-server deployment. Here's why and what would need to change for scale:

| Bottleneck | Threshold | Solution |
|---|---|---|
| HikariCP pool (10 connections) | ~50-100 req/s | Increase pool size, add read replicas |
| Single JVM process | CPU-bound above ~500 rps | Horizontal scaling (multiple instances) |
| In-memory notification events | Lost on crash | Kafka/RabbitMQ persistent queue |
| No caching layer | ReportService loads all data | Redis cache for report aggregates |
| No CDN for frontend assets | Latency for global users | Vercel Edge / CloudFront |

### Path to 10,000+ Users

#### 1. Horizontal Backend Scaling

```
                     ┌─────────────────┐
          ┌──────────▶  TMS Instance 1  │
          │          └─────────────────┘
Browser ──▶  Load Balancer              │
          │          ┌─────────────────┐ MySQL Primary
          └──────────▶  TMS Instance 2  ├──────────┐
                     └─────────────────┘           │
                     ┌─────────────────┐           │ MySQL Replica
          ┌──────────▶  TMS Instance 3  │           └──────────┐
          │          └─────────────────┘                      ▼
          │                                          ┌──────────────────┐
          │                                          │  Read Replica    │
          │                                          └──────────────────┘
```

Since JWTs are stateless, any instance can validate any request. No session affinity needed.

#### 2. Redis Caching

```java
@Cacheable(value = "employee-hours", key = "#userId + '_' + #startDate + '_' + #endDate")
public EmployeeHoursReport getEmployeeHoursReport(UUID userId, LocalDate startDate, LocalDate endDate) { ... }

@CacheEvict(value = "employee-hours", allEntries = true)
@Transactional
public TimesheetResponse approveTimesheet(Long id, UUID approverId) { ... }
```

Reports are expensive (full table scan of time_entries). Cache them for 5 minutes. Evict when a timesheet is approved.

#### 3. Message Queue for Notifications (Kafka)

```
TimesheetService → produces → Kafka topic "timesheet.submitted"
                                         ↓
                             NotificationConsumer (separate service)
                             → reads message
                             → saves in-app notification
                             → sends email via SendGrid API
```

Benefits:
- Email failures don't affect business transactions
- Email service can retry independently
- Can handle 100,000 notifications/day with a 3-node Kafka cluster

#### 4. Database Read Replicas

Split read-heavy report queries to a MySQL read replica:

```yaml
# application.yml
spring:
  datasource:
    primary:
      url: jdbc:mysql://primary-host:3306/tms
    replica:
      url: jdbc:mysql://replica-host:3306/tms
```

Use `@Transactional(readOnly = true)` routing to direct report queries to the replica.

#### 5. Database Indexing Improvements

For the current query patterns at 10K users:

```sql
-- Composite index for most common timesheet query
ALTER TABLE timesheets ADD INDEX idx_user_status_week (user_id, status, week_start_date);

-- Covering index for time entry aggregation (avoids heap fetch)
ALTER TABLE time_entries ADD INDEX idx_entry_covering
  (user_id, work_date, duration_minutes, project_id);

-- Partial index for pending leaves only (most manager queries are PENDING)
ALTER TABLE leave_requests ADD INDEX idx_pending_user 
  (user_id, status) WHERE status = 'PENDING';  -- MySQL 8.0.13+ partial indexes
```

### Production Deployment Architecture

```
                         ┌─────────────────────────────────────┐
                         │            VERCEL (Frontend)         │
                         │  React SPA  ←  CloudFront CDN        │
                         └──────────────────┬──────────────────┘
                                            │ HTTPS
                         ┌──────────────────▼──────────────────┐
                         │         AWS ALB (Load Balancer)      │
                         └──────┬───────────────────┬──────────┘
                                │                   │
              ┌─────────────────▼──────┐  ┌─────────▼───────────────┐
              │  ECS Container Task 1  │  │  ECS Container Task 2   │
              │  tms-backend:1.0.0     │  │  tms-backend:1.0.0      │
              └─────────────────┬──────┘  └─────────┬───────────────┘
                                │                   │
                         ┌──────▼───────────────────▼──────────┐
                         │        Amazon RDS MySQL 8.0          │
                         │  Multi-AZ + Read Replica             │
                         └─────────────────────────────────────┘
                         
                         ┌─────────────────────────────────────┐
                         │     Amazon ElastiCache (Redis)       │
                         │  Report cache + session store backup  │
                         └─────────────────────────────────────┘
```

### CI/CD Pipeline

```yaml
# .github/workflows/deploy.yml
on:
  push:
    branches: [main]

jobs:
  test:
    - run: mvn test           # Unit + integration tests
    - run: npm test           # Vitest unit tests
    - run: npx playwright test # E2E tests
  
  build:
    - run: mvn package -DskipTests
    - run: docker build -t tms-backend .
    - run: docker push AWS_ECR/tms-backend
    - run: npm run build      # Vite production build
    - run: vercel --prod      # Deploy frontend to Vercel
  
  deploy:
    - run: aws ecs update-service --cluster tms --service backend
    # ECS performs rolling update: new tasks → health check → old tasks terminated
```

### Security Hardening for Production

| Area | Current | Production Recommendation |
|---|---|---|
| JWT storage | localStorage (XSS risk) | `httpOnly` cookie + CSRF token |
| JWT expiry | 24 hours | 15 minutes access + 7 day refresh |
| Password policy | BCrypt only | BCrypt + minimum complexity rules |
| Rate limiting | None | Spring Rate Limiter / API Gateway throttling |
| SQL injection | JPA parameterized queries ✓ | N/A — already safe |
| HTTPS | Dev: HTTP | Prod: TLS 1.3 only |
| Secret management | Environment variables | AWS Secrets Manager / HashiCorp Vault |
| CORS | Explicit origins ✓ | Same + add Content-Security-Policy header |
| Audit logs | DB-stored | Ship to CloudWatch / ELK Stack |

---

## 7. Interview Preparation

This section provides strong, articulate answers for the most common technical interview questions about this system.

---

### Q: Why did you choose JWT over sessions?

**Answer:**  
*"I chose JWT because the system needs to be stateless — the backend should be able to scale horizontally without requiring sticky sessions or a shared session store. With JWTs, any instance of the backend can validate any token independently by verifying the HMAC-SHA256 signature against the shared secret key. The token encodes the user's ID, email, and role, so no database lookup is needed during authentication on subsequent requests.*

*The trade-off I accepted is that tokens cannot be revoked until they expire — the 24-hour window means a stolen token is valid for up to 24 hours. For a more security-sensitive deployment, I'd implement refresh token rotation: short-lived access tokens (15 minutes) paired with long-lived refresh tokens (7 days) stored server-side, which gives us revocation capability with minimal UX impact."*

---

### Q: Why did you choose a layered architecture?

**Answer:**  
*"The layered architecture separates concerns: the controller handles HTTP marshaling, the service holds business logic, and the repository handles data access. Each layer can be tested independently — I can unit test the service by mocking the repository, test the controller with MockMvc, and test the repository with @DataJpaTest.*

*The key principle is that dependencies flow downward only: the controller depends on the service, the service depends on the repository, never the reverse. This means I can change the database layer (say, swap MySQL for PostgreSQL) without touching a single service method, and I can change the API contract without touching business rules.*

*In large teams, different developers can own different layers, reducing merge conflicts. The service layer also makes transaction management clean — @Transactional works at the service boundary, which is the correct abstraction."*

---

### Q: How would you scale this system?

**Answer:**  
*"The system has several scaling dimensions. For the backend, since JWTs are stateless, I can add more Spring Boot instances behind a load balancer immediately — no session affinity needed. I'd containerize with Docker and use ECS or Kubernetes for orchestration.*

*For the database, I'd add a read replica and route all @Transactional(readOnly=true) queries to it. The report service especially would benefit — it currently loads all timesheets into memory. I'd add a Redis cache layer for report aggregates with a 5-minute TTL.*

*For notifications, I'd migrate from Spring's synchronous event bus to Kafka. Currently, if the application crashes between timesheet submission and notification sending, the notification is lost. With Kafka, the event is durable.*

*For the frontend, I'd ensure all static assets are served from a CDN. Vite already produces an optimal production bundle with code splitting, so individual page chunks load on demand.*

*The biggest single impact would come from adding composite database indexes — the query `SELECT * FROM time_entries WHERE user_id = ? AND work_date BETWEEN ? AND ?` on a 10-million-row table would benefit enormously from an index on (user_id, work_date)."*

---

### Q: What are the current limitations of the system?

**Answer:**  
*"Several key limitations:*

*1. No real-time notifications. Employees must refresh the page to see updates. The backend fires events asynchronously, but there's no WebSocket connection. A real product would use WebSockets or Server-Sent Events.*

*2. No pagination on list endpoints. The TimesheetRepository.findByUserId() returns all timesheets — for a user who's been at the company for 5 years, that's 260+ records. Every report query loads the entire timesheets and time_entries tables into Java memory.*

*3. JWT cannot be revoked. If a user's account is disabled (status = INACTIVE), their token remains valid until expiry. The fix is to either check user status on every request (a DB hit) or implement a small blacklist.*

*4. Email is synchronous within the async thread. If Gmail's SMTP is down, the notification listener keeps retrying on the thread pool. There's no retry queue or dead-letter mechanism.*

*5. No multi-tenancy. The system serves a single company. Making it SaaS would require tenant isolation at the database level (either separate schemas or row-level tenant IDs on every table)."*

---

### Q: What would you improve next?

**Answer:**  
*"My immediate priorities would be:*

*First, add pagination to all list endpoints. `Page<T>` in Spring Data JPA with `Pageable` parameters is a trivial change that would prevent memory issues at scale.*

*Second, implement a proper refresh token mechanism. The current 24-hour JWT window is too long for a security-sensitive application. I'd add a refresh_tokens table, issue 15-minute access tokens, and implement the `/auth/refresh` endpoint that the frontend's request interceptor calls automatically when a request returns 401.*

*Third, add the Redis cache for reports. The report service currently does in-memory joins across all timesheets, users, and projects — it would fail under production load. A simple Spring Cache abstraction over Redis with @Cacheable and @CacheEvict would solve this.*

*Fourth, add WebSocket support for real-time notifications. Spring Boot has excellent WebSocket support via Spring Messaging + STOMP. This would significantly improve the user experience — managers would see pending approvals without refreshing.*

*Lastly, I'd set up proper database connection monitoring. Currently, HikariCP metrics aren't exposed. Adding Micrometer + Prometheus + Grafana would give visibility into connection pool saturation before it becomes a user-visible problem."*

---

### Q: Explain a complex technical problem you solved in this project.

**Answer:**  
*"The time overlap detection was a good challenge. When an employee logs 9:00-11:00 on Monday and tries to log 10:00-12:00 on the same day, the system must reject it. The naive approach would be to load all entries for that day into Java memory and check each one — O(n) per insert.*

*Instead, I pushed the overlap logic into a JPQL query:*

```sql
SELECT te FROM TimeEntry te 
WHERE te.userId = :userId 
AND te.workDate = :workDate 
AND te.startTime < :endTime    -- existing starts before new ends
AND te.endTime > :startTime    -- existing ends after new starts
AND te.id <> :excludeId        -- skip self when updating
```

*This is the standard interval overlap condition: two intervals [A, B] and [C, D] overlap if and only if A < D AND C < B. The query runs at the DB level with the index on (user_id, work_date), so it's O(log n) regardless of how many entries exist.*

*The excludeId parameter was important — when editing an existing entry, you don't want it to conflict with itself. Passing -1L when creating and the entry's own ID when updating handles both cases cleanly without two separate queries."*

---

*End of TMS Knowledge-Transfer Manual*

---

> **Document version:** 1.0  
> **Last updated:** March 2026  
> **Project:** TMS (TMS)  
> **Tech stack:** React 18 + Spring Boot 3.2 + MySQL 8.x + Java 21
