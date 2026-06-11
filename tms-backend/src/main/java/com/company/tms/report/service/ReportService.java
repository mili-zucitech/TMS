package com.company.tms.report.service;

import com.company.tms.leave.entity.Leave;
import com.company.tms.leave.entity.LeaveStatus;
import com.company.tms.leave.repository.LeaveRepository;
import com.company.tms.leave.repository.LeaveTypeRepository;
import com.company.tms.organization.entity.Department;
import com.company.tms.organization.repository.DepartmentRepository;
import com.company.tms.project.dto.ProjectUtilizationResponse;
import com.company.tms.project.entity.Project;
import com.company.tms.project.repository.ProjectRepository;
import com.company.tms.project.service.ProjectUtilizationService;
import com.company.tms.report.dto.*;
import com.company.tms.task.entity.Task;
import com.company.tms.task.entity.TaskStatus;
import com.company.tms.task.repository.TaskRepository;
import com.company.tms.timesheet.entity.TimeEntry;
import com.company.tms.timesheet.entity.Timesheet;
import com.company.tms.timesheet.entity.TimesheetStatus;
import com.company.tms.timesheet.repository.TimeEntryRepository;
import com.company.tms.timesheet.repository.TimesheetRepository;
import com.company.tms.user.entity.User;
import com.company.tms.user.entity.UserStatus;
import com.company.tms.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.*;
import java.util.function.Function;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class ReportService {

    private final TimesheetRepository timesheetRepository;
    private final TimeEntryRepository timeEntryRepository;
    private final UserRepository userRepository;
    private final ProjectRepository projectRepository;
    private final LeaveRepository leaveRepository;
    private final LeaveTypeRepository leaveTypeRepository;
    private final DepartmentRepository departmentRepository;
    private final TaskRepository taskRepository;
    private final ProjectUtilizationService projectUtilizationService;

    // ── Helpers ───────────────────────────────────────────────────────────────

    private Map<Long, String> buildProjectNameMap() {
        return projectRepository.findAll().stream()
                .collect(Collectors.toMap(Project::getId, Project::getName));
    }

    private Map<UUID, User> buildUserMap() {
        return userRepository.findAll().stream()
                .collect(Collectors.toMap(User::getId, Function.identity()));
    }

    /** Pre-loads all department id→name mappings from the database. */
    private Map<Long, String> buildDepartmentNameMap() {
        return departmentRepository.findAll().stream()
                .collect(Collectors.toMap(Department::getId, Department::getName));
    }

    /** Returns department name for a user. Falls back to "Unknown" if not resolvable. */
    private String resolveDepartmentName(User user, Map<Long, String> deptNameCache) {
        if (user.getDepartmentId() == null) return "Unknown";
        return deptNameCache.getOrDefault(user.getDepartmentId(), "Unknown");
    }

    private double minutesToHours(long minutes) {
        return Math.round((minutes / 60.0) * 10.0) / 10.0;
    }

    /** Filters timesheets to those whose week falls within [startDate, endDate]. Nullable params = no filter. */
    private List<Timesheet> filterTimesheets(List<Timesheet> sheets, LocalDate startDate, LocalDate endDate) {
        return sheets.stream()
                .filter(ts -> (startDate == null || !ts.getWeekStartDate().isBefore(startDate))
                        && (endDate == null || !ts.getWeekStartDate().isAfter(endDate)))
                .collect(Collectors.toList());
    }

    /**
     * Resolves which user UUIDs the caller may see, based on their Spring Security role.
     *
     * ADMIN / HR / DIRECTOR → all users
     * MANAGER               → only their direct reports
     * EMPLOYEE              → only themselves
     */
    private Set<UUID> resolveAccessibleUserIds(Authentication auth) {
        if (auth == null) return Collections.emptySet();

        Set<String> roles = auth.getAuthorities().stream()
                .map(GrantedAuthority::getAuthority)
                .collect(Collectors.toSet());

        if (roles.contains("ROLE_ADMIN") || roles.contains("ROLE_HR")
                || roles.contains("ROLE_HR_MANAGER") || roles.contains("ROLE_DIRECTOR")) {
            return userRepository.findAll().stream()
                    .map(User::getId)
                    .collect(Collectors.toSet());
        }

        String email = auth.getName();
        Optional<User> caller = userRepository.findByEmail(email);
        if (caller.isEmpty()) return Collections.emptySet();

        if (roles.contains("ROLE_MANAGER")) {
            Set<UUID> ids = new HashSet<>();
            ids.add(caller.get().getId());
            userRepository.findByManagerId(caller.get().getId())
                    .forEach(u -> ids.add(u.getId()));
            return ids;
        }

        // EMPLOYEE — self only
        return Set.of(caller.get().getId());
    }

    // ── Employee Hours ─────────────────────────────────────────────────────────

    public EmployeeHoursReport getEmployeeHoursReport(
            Authentication auth,
            LocalDate startDate,
            LocalDate endDate,
            Long departmentId,
            UUID filterUserId) {

        Set<UUID> accessible = resolveAccessibleUserIds(auth);

        // Apply optional filters
        if (filterUserId != null) accessible.retainAll(Set.of(filterUserId));

        Map<UUID, User> userMap = buildUserMap();
        Map<Long, String> deptNameCache = buildDepartmentNameMap();

        // Build one entry per (user, week)
        List<EmployeeHoursEntry> entries = new ArrayList<>();
        double totalHours = 0, totalBillable = 0;

        for (UUID userId : accessible) {
            User user = userMap.get(userId);
            if (user == null) continue;
            if (departmentId != null && !departmentId.equals(user.getDepartmentId())) continue;

            String deptName = resolveDepartmentName(user, deptNameCache);

            List<Timesheet> sheets = filterTimesheets(
                    timesheetRepository.findByUserId(userId), startDate, endDate);

            for (Timesheet ts : sheets) {
                List<TimeEntry> teList = timeEntryRepository.findByTimesheetId(ts.getId());
                long totalMin = teList.stream()
                        .mapToLong(te -> te.getDurationMinutes() != null ? te.getDurationMinutes() : 0)
                        .sum();
                // All logged hours are treated as billable (no billable flag on TimeEntry).
                // Non-billable hours would require a dedicated flag; for now billedHours = totalHours.
                double hrs = minutesToHours(totalMin);
                entries.add(EmployeeHoursEntry.builder()
                        .userId(userId)
                        .employeeName(user.getName())
                        .department(deptName)
                        .totalHours(hrs)
                        .billableHours(hrs)
                        .nonBillableHours(0)
                        .weekStartDate(ts.getWeekStartDate().toString())
                        .build());
                totalHours   += hrs;
                totalBillable += hrs;
            }
        }

        return EmployeeHoursReport.builder()
                .entries(entries)
                .totalHours(minutesToHours(Math.round(totalHours * 60)))
                .totalBillableHours(minutesToHours(Math.round(totalBillable * 60)))
                .totalNonBillableHours(0)
                .employeeCount((int) entries.stream().map(EmployeeHoursEntry::getUserId).distinct().count())
                .build();
    }

    // ── Project Utilization ────────────────────────────────────────────────────

    public ProjectUtilizationReport getProjectUtilizationReport(
            Authentication auth,
            LocalDate startDate,
            LocalDate endDate,
            Long filterProjectId) {

        Set<String> roles = auth.getAuthorities().stream()
                .map(GrantedAuthority::getAuthority)
                .collect(Collectors.toSet());

        // Determine which projects this caller may see
        List<Project> projects;
        if (roles.contains("ROLE_ADMIN") || roles.contains("ROLE_HR")
                || roles.contains("ROLE_HR_MANAGER") || roles.contains("ROLE_DIRECTOR")) {
            projects = projectRepository.findAll();
        } else if (roles.contains("ROLE_MANAGER")) {
            String email = auth.getName();
            Optional<User> caller = userRepository.findByEmail(email);
            if (caller.isEmpty()) {
                return ProjectUtilizationReport.builder()
                        .entries(Collections.emptyList())
                        .totalAllocatedHours(0)
                        .totalLoggedHours(0)
                        .avgUtilizationPercent(0)
                        .build();
            }
            UUID managerId = caller.get().getId();
            projects = projectRepository.findAll().stream()
                    .filter(p -> managerId.equals(p.getProjectManagerId()))
                    .collect(Collectors.toList());
        } else {
            return ProjectUtilizationReport.builder()
                    .entries(Collections.emptyList())
                    .totalAllocatedHours(0)
                    .totalLoggedHours(0)
                    .avgUtilizationPercent(0)
                    .build();
        }

        // Apply optional project filter
        if (filterProjectId != null) {
            projects = projects.stream()
                    .filter(p -> filterProjectId.equals(p.getId()))
                    .collect(Collectors.toList());
        }

        // Compute active employee count per project from time entries in the requested date range
        Set<UUID> accessible = resolveAccessibleUserIds(auth);
        Map<Long, Set<UUID>> usersPerProject = new HashMap<>();
        for (UUID userId : accessible) {
            List<Timesheet> sheets = filterTimesheets(
                    timesheetRepository.findByUserId(userId), startDate, endDate);
            for (Timesheet ts : sheets) {
                for (TimeEntry te : timeEntryRepository.findByTimesheetId(ts.getId())) {
                    if (te.getProjectId() == null) continue;
                    usersPerProject.computeIfAbsent(te.getProjectId(), k -> new HashSet<>()).add(userId);
                }
            }
        }

        // Build entries using ProjectUtilizationService for real estimated vs logged data
        List<ProjectUtilizationEntry> entries = new ArrayList<>();
        double totalLogged    = 0;
        double totalAllocated = 0;

        for (Project project : projects) {
            try {
                ProjectUtilizationResponse util = projectUtilizationService.getUtilization(project.getId());
                double loggedHours    = util.getTotalLoggedHours() != null ? util.getTotalLoggedHours() : 0;
                double estimatedHours = util.getTotalEstimatedHours() != null ? util.getTotalEstimatedHours() : 0;
                double utilizationPct = util.getUtilizationPercentage() != null ? util.getUtilizationPercentage() : 0;
                int    activeEmp      = usersPerProject.getOrDefault(project.getId(), Collections.emptySet()).size();

                entries.add(ProjectUtilizationEntry.builder()
                        .projectId(project.getId())
                        .projectName(project.getName())
                        .allocatedHours(estimatedHours)
                        .loggedHours(loggedHours)
                        .utilizationPercent(Math.round(utilizationPct * 10.0) / 10.0)
                        .billableHours(loggedHours)
                        .nonBillableHours(0)
                        .activeEmployees(activeEmp)
                        .build());

                totalLogged    += loggedHours;
                totalAllocated += estimatedHours;
            } catch (Exception ex) {
                log.warn("Skipping project {} in utilization report: {}", project.getId(), ex.getMessage());
            }
        }

        entries.sort(Comparator.comparingDouble(ProjectUtilizationEntry::getLoggedHours).reversed());

        double avgUtil = entries.isEmpty() ? 0 :
                Math.round(entries.stream()
                        .mapToDouble(ProjectUtilizationEntry::getUtilizationPercent)
                        .average().orElse(0) * 10.0) / 10.0;

        return ProjectUtilizationReport.builder()
                .entries(entries)
                .totalAllocatedHours(totalAllocated)
                .totalLoggedHours(totalLogged)
                .avgUtilizationPercent(avgUtil)
                .build();
    }

    // ── Billable Hours ─────────────────────────────────────────────────────────

    public BillableHoursReport getBillableHoursReport(
            Authentication auth,
            LocalDate startDate,
            LocalDate endDate,
            Long filterProjectId,
            UUID filterUserId) {

        Set<UUID> accessible = resolveAccessibleUserIds(auth);
        if (filterUserId != null) accessible.retainAll(Set.of(filterUserId));

        Map<UUID, User> userMap     = buildUserMap();
        Map<Long, String> projNames = buildProjectNameMap();
        Map<Long, String> deptNameCache = buildDepartmentNameMap();

        // Accumulate per (userId, projectId)
        record Key(UUID userId, Long projectId) {}
        Map<Key, Long> minuteMap = new HashMap<>();

        for (UUID userId : accessible) {
            List<Timesheet> sheets = filterTimesheets(
                    timesheetRepository.findByUserId(userId), startDate, endDate);
            for (Timesheet ts : sheets) {
                for (TimeEntry te : timeEntryRepository.findByTimesheetId(ts.getId())) {
                    if (filterProjectId != null && !filterProjectId.equals(te.getProjectId())) continue;
                    long mins = te.getDurationMinutes() != null ? te.getDurationMinutes() : 0;
                    minuteMap.merge(new Key(userId, te.getProjectId()), mins, Long::sum);
                }
            }
        }

        List<BillableHoursEntry> entries = new ArrayList<>();
        double totalBillable = 0, totalHours = 0;

        for (Map.Entry<Key, Long> e : minuteMap.entrySet()) {
            Key key = e.getKey();
            User user = userMap.get(key.userId());
            if (user == null) continue;
            double hrs = minutesToHours(e.getValue());
            String dept = resolveDepartmentName(user, deptNameCache);
            entries.add(BillableHoursEntry.builder()
                    .userId(key.userId())
                    .employeeName(user.getName())
                    .department(dept)
                    .projectId(key.projectId())
                    .projectName(projNames.getOrDefault(key.projectId(), "Project-" + key.projectId()))
                    .billableHours(hrs)
                    .nonBillableHours(0)
                    .totalHours(hrs)
                    .billablePercent(100)
                    .build());
            totalBillable += hrs;
            totalHours    += hrs;
        }

        int overallPct = totalHours > 0 ? (int) Math.round((totalBillable / totalHours) * 100) : 0;

        return BillableHoursReport.builder()
                .entries(entries)
                .totalBillableHours(totalBillable)
                .totalNonBillableHours(0)
                .totalHours(totalHours)
                .overallBillablePercent(overallPct)
                .build();
    }

    // ── Leave Report ────────────────────────────────────────────────────────────────────────

    public LeaveReport getLeaveReport(
            Authentication auth,
            LocalDate startDate,
            LocalDate endDate,
            Long departmentId,
            UUID filterUserId,
            Long filterLeaveTypeId) {

        Set<UUID> accessible = resolveAccessibleUserIds(auth);
        if (filterUserId != null) accessible.retainAll(Set.of(filterUserId));

        Map<UUID, User> userMap = buildUserMap();
        Map<Long, String> deptNameCache = buildDepartmentNameMap();

        // Resolve leave type names once
        Map<Long, String> leaveTypeNames = leaveTypeRepository.findAll().stream()
                .collect(Collectors.toMap(
                        com.company.tms.leave.entity.LeaveType::getId,
                        com.company.tms.leave.entity.LeaveType::getName));

        List<Leave> allLeaves = leaveRepository.findByUserIdIn(accessible);

        // Apply optional date and leave-type filters
        List<Leave> filtered = allLeaves.stream()
                .filter(l -> startDate == null || !l.getStartDate().isBefore(startDate))
                .filter(l -> endDate == null || !l.getEndDate().isAfter(endDate))
                .filter(l -> filterLeaveTypeId == null || filterLeaveTypeId.equals(l.getLeaveTypeId()))
                .collect(Collectors.toList());

        List<LeaveReportEntry> entries = new ArrayList<>();
        int totalApproved = 0, totalPending = 0, totalRejected = 0, totalDays = 0;

        for (Leave leave : filtered) {
            User user = userMap.get(leave.getUserId());
            if (user == null) continue;
            if (departmentId != null && !departmentId.equals(user.getDepartmentId())) continue;

            String deptName   = resolveDepartmentName(user, deptNameCache);
            String leaveType  = leaveTypeNames.getOrDefault(leave.getLeaveTypeId(), "Unknown");
            String statusStr  = leave.getStatus().name();

            entries.add(LeaveReportEntry.builder()
                    .userId(leave.getUserId())
                    .employeeName(user.getName())
                    .department(deptName)
                    .leaveType(leaveType)
                    .totalDays(leave.getTotalDays())
                    .status(statusStr)
                    .startDate(leave.getStartDate().toString())
                    .endDate(leave.getEndDate().toString())
                    .build());

            totalDays += leave.getTotalDays();
            if (leave.getStatus() == LeaveStatus.APPROVED)  totalApproved++;
            else if (leave.getStatus() == LeaveStatus.PENDING)   totalPending++;
            else if (leave.getStatus() == LeaveStatus.REJECTED)  totalRejected++;
        }

        return LeaveReport.builder()
                .entries(entries)
                .totalApproved(totalApproved)
                .totalPending(totalPending)
                .totalRejected(totalRejected)
                .totalDays(totalDays)
                .build();
    }

    // ── KPI Summary ───────────────────────────────────────────────────────────────────────

    public KpiSummary getKpiSummary(
            Authentication auth,
            LocalDate startDate,
            LocalDate endDate) {

        Set<UUID> accessible = resolveAccessibleUserIds(auth);

        // ---- Hours ----
        double totalHours = 0, totalBillable = 0;
        int pendingTimesheets = 0;

        for (UUID userId : accessible) {
            List<Timesheet> sheets = filterTimesheets(
                    timesheetRepository.findByUserId(userId), startDate, endDate);
            for (Timesheet ts : sheets) {
                if (ts.getStatus() == TimesheetStatus.SUBMITTED) {
                    pendingTimesheets++;
                }
                List<TimeEntry> teList = timeEntryRepository.findByTimesheetId(ts.getId());
                long totalMin = teList.stream()
                        .mapToLong(te -> te.getDurationMinutes() != null ? te.getDurationMinutes() : 0)
                        .sum();
                double hrs = minutesToHours(totalMin);
                totalHours    += hrs;
                totalBillable += hrs;
            }
        }

        double utilPct = totalHours > 0
                ? Math.round((totalBillable / totalHours) * 1000.0) / 10.0
                : 0.0;

        // ---- Active employees (ACTIVE status) ----
        long activeEmployees = userRepository.findAll().stream()
                .filter(u -> accessible.contains(u.getId()))
                .filter(u -> u.getStatus() == UserStatus.ACTIVE)
                .count();

        // ---- Active projects (have at least one time entry in range) ----
        Set<Long> projectIds = new HashSet<>();
        for (UUID userId : accessible) {
            List<Timesheet> sheets = filterTimesheets(
                    timesheetRepository.findByUserId(userId), startDate, endDate);
            for (Timesheet ts : sheets) {
                timeEntryRepository.findByTimesheetId(ts.getId())
                        .forEach(te -> {
                            if (te.getProjectId() != null) projectIds.add(te.getProjectId());
                        });
            }
        }

        return KpiSummary.builder()
                .totalHoursLogged(totalHours)
                .totalBillableHours(totalBillable)
                .utilizationPercent(utilPct)
                .activeEmployees((int) activeEmployees)
                .activeProjects(projectIds.size())
                .pendingTimesheets(pendingTimesheets)
                .build();
    }

    // ── Overtime Summary ───────────────────────────────────────────────────────

    private static final double WEEKLY_HOURS_TARGET = 40.0;

    public OvertimeSummaryReport getOvertimeSummary(
            Authentication auth,
            LocalDate startDate,
            LocalDate endDate,
            Long departmentId) {

        Set<UUID> accessible = resolveAccessibleUserIds(auth);
        Map<UUID, User> userMap = buildUserMap();
        Map<Long, String> deptNameCache = buildDepartmentNameMap();

        List<OvertimeSummaryEntry> entries = new ArrayList<>();
        Set<UUID> affectedEmployees = new HashSet<>();
        double totalOvertimeHours = 0;

        for (UUID userId : accessible) {
            User user = userMap.get(userId);
            if (user == null) continue;
            if (departmentId != null && !departmentId.equals(user.getDepartmentId())) continue;

            String deptName = resolveDepartmentName(user, deptNameCache);

            List<Timesheet> sheets = filterTimesheets(
                    timesheetRepository.findByUserId(userId), startDate, endDate);

            for (Timesheet ts : sheets) {
                List<TimeEntry> teList = timeEntryRepository.findByTimesheetId(ts.getId());
                long totalMin = teList.stream()
                        .mapToLong(te -> te.getDurationMinutes() != null ? te.getDurationMinutes() : 0)
                        .sum();
                double hrs = minutesToHours(totalMin);
                if (hrs > WEEKLY_HOURS_TARGET) {
                    double overtime = Math.round((hrs - WEEKLY_HOURS_TARGET) * 10.0) / 10.0;
                    entries.add(OvertimeSummaryEntry.builder()
                            .userId(userId.toString())
                            .employeeName(user.getName())
                            .department(deptName)
                            .weekStartDate(ts.getWeekStartDate().toString())
                            .totalHours(hrs)
                            .overtimeHours(overtime)
                            .overtimeReason(ts.getOvertimeReason())
                            .build());
                    affectedEmployees.add(userId);
                    totalOvertimeHours += overtime;
                }
            }
        }

        entries.sort(Comparator.comparing(OvertimeSummaryEntry::getWeekStartDate).reversed());

        return OvertimeSummaryReport.builder()
                .entries(entries)
                .totalOvertimeWeeks(entries.size())
                .totalOvertimeHours(Math.round(totalOvertimeHours * 10.0) / 10.0)
                .affectedEmployees(affectedEmployees.size())
                .build();
    }

    // ── Timesheet Compliance ───────────────────────────────────────────────────

    public TimesheetComplianceReport getTimesheetCompliance(
            Authentication auth,
            LocalDate startDate,
            LocalDate endDate,
            Long departmentId) {

        Set<UUID> accessible = resolveAccessibleUserIds(auth);
        Map<UUID, User> userMap = buildUserMap();
        Map<Long, String> deptNameCache = buildDepartmentNameMap();

        List<TimesheetComplianceEntry> entries = new ArrayList<>();
        int grandTotal = 0, grandSubmitted = 0, grandApproved = 0, grandRejected = 0;

        for (UUID userId : accessible) {
            User user = userMap.get(userId);
            if (user == null) continue;
            if (departmentId != null && !departmentId.equals(user.getDepartmentId())) continue;

            String deptName = resolveDepartmentName(user, deptNameCache);
            List<Timesheet> sheets = filterTimesheets(
                    timesheetRepository.findByUserId(userId), startDate, endDate);

            if (sheets.isEmpty()) continue;

            int total = sheets.size();
            int submitted = (int) sheets.stream()
                    .filter(ts -> ts.getSubmittedAt() != null).count();
            int approved = (int) sheets.stream()
                    .filter(ts -> ts.getStatus() == TimesheetStatus.APPROVED).count();
            int rejected = (int) sheets.stream()
                    .filter(ts -> ts.getStatus() == TimesheetStatus.REJECTED).count();
            int draft = (int) sheets.stream()
                    .filter(ts -> ts.getStatus() == TimesheetStatus.DRAFT).count();

            double compliance = total > 0
                    ? Math.round((submitted / (double) total) * 1000.0) / 10.0
                    : 0.0;

            entries.add(TimesheetComplianceEntry.builder()
                    .userId(userId.toString())
                    .employeeName(user.getName())
                    .department(deptName)
                    .totalTimesheets(total)
                    .submitted(submitted)
                    .approved(approved)
                    .rejected(rejected)
                    .draft(draft)
                    .compliancePercent(compliance)
                    .build());

            grandTotal     += total;
            grandSubmitted += submitted;
            grandApproved  += approved;
            grandRejected  += rejected;
        }

        double overallCompliance = grandTotal > 0
                ? Math.round((grandSubmitted / (double) grandTotal) * 1000.0) / 10.0
                : 0.0;

        return TimesheetComplianceReport.builder()
                .entries(entries)
                .overallCompliancePercent(overallCompliance)
                .totalTimesheets(grandTotal)
                .totalSubmitted(grandSubmitted)
                .totalApproved(grandApproved)
                .totalRejected(grandRejected)
                .build();
    }

    // ── Task Summary ───────────────────────────────────────────────────────────

    public TaskSummaryReport getTaskSummary(
            Authentication auth,
            LocalDate startDate,
            LocalDate endDate,
            Long filterProjectId) {

        Set<UUID> accessible = resolveAccessibleUserIds(auth);
        Map<Long, String> projectNames = buildProjectNameMap();

        // Determine which projects logged time by accessible users
        Set<Long> relevantProjects = new HashSet<>();
        Map<Long, Long> loggedMinutesPerProject = new HashMap<>();

        for (UUID userId : accessible) {
            List<Timesheet> sheets = filterTimesheets(
                    timesheetRepository.findByUserId(userId), startDate, endDate);
            for (Timesheet ts : sheets) {
                for (TimeEntry te : timeEntryRepository.findByTimesheetId(ts.getId())) {
                    if (te.getProjectId() == null) continue;
                    if (filterProjectId != null && !filterProjectId.equals(te.getProjectId())) continue;
                    relevantProjects.add(te.getProjectId());
                    long mins = te.getDurationMinutes() != null ? te.getDurationMinutes() : 0;
                    loggedMinutesPerProject.merge(te.getProjectId(), mins, Long::sum);
                }
            }
        }

        List<TaskSummaryEntry> entries = new ArrayList<>();
        int grandTotalTasks = 0, grandCompleted = 0;
        double grandEstimated = 0, grandLogged = 0;

        for (Long projId : relevantProjects) {
            List<Task> tasks = taskRepository.findByProjectId(projId);
            int total = tasks.size();
            int completed = (int) tasks.stream()
                    .filter(t -> t.getStatus() == TaskStatus.COMPLETED).count();
            int inProgress = (int) tasks.stream()
                    .filter(t -> t.getStatus() == TaskStatus.IN_PROGRESS
                              || t.getStatus() == TaskStatus.IN_REVIEW).count();
            int blocked = (int) tasks.stream()
                    .filter(t -> t.getStatus() == TaskStatus.BLOCKED).count();
            int todo = (int) tasks.stream()
                    .filter(t -> t.getStatus() == TaskStatus.TODO).count();

            double estimated = tasks.stream()
                    .filter(t -> t.getEstimatedHours() != null)
                    .mapToDouble(t -> t.getEstimatedHours().doubleValue())
                    .sum();
            double logged = minutesToHours(loggedMinutesPerProject.getOrDefault(projId, 0L));
            double variance = Math.round((logged - estimated) * 10.0) / 10.0;
            double completionRate = total > 0
                    ? Math.round((completed / (double) total) * 1000.0) / 10.0
                    : 0.0;

            entries.add(TaskSummaryEntry.builder()
                    .projectId(projId)
                    .projectName(projectNames.getOrDefault(projId, "Project-" + projId))
                    .totalTasks(total)
                    .completedTasks(completed)
                    .inProgressTasks(inProgress)
                    .blockedTasks(blocked)
                    .todoTasks(todo)
                    .completionRate(completionRate)
                    .estimatedHours(Math.round(estimated * 10.0) / 10.0)
                    .loggedHours(logged)
                    .variance(variance)
                    .build());

            grandTotalTasks += total;
            grandCompleted  += completed;
            grandEstimated  += estimated;
            grandLogged     += logged;
        }

        entries.sort(Comparator.comparing(TaskSummaryEntry::getProjectName));

        double overallCompletion = grandTotalTasks > 0
                ? Math.round((grandCompleted / (double) grandTotalTasks) * 1000.0) / 10.0
                : 0.0;

        return TaskSummaryReport.builder()
                .entries(entries)
                .totalTasks(grandTotalTasks)
                .totalCompleted(grandCompleted)
                .overallCompletionRate(overallCompletion)
                .totalEstimatedHours(Math.round(grandEstimated * 10.0) / 10.0)
                .totalLoggedHours(Math.round(grandLogged * 10.0) / 10.0)
                .totalVariance(Math.round((grandLogged - grandEstimated) * 10.0) / 10.0)
                .build();
    }

    // ── Approval Turnaround ────────────────────────────────────────────────────

    public ApprovalTurnaroundReport getApprovalTurnaround(
            LocalDate startDate,
            LocalDate endDate) {

        List<Timesheet> allSheets = timesheetRepository.findAll();
        Map<UUID, User> userMap = buildUserMap();

        // Only consider timesheets that were actually approved
        List<Timesheet> approved = allSheets.stream()
                .filter(ts -> ts.getStatus() == TimesheetStatus.APPROVED
                        && ts.getSubmittedAt() != null
                        && ts.getApprovedAt() != null
                        && ts.getApprovedBy() != null)
                .filter(ts -> startDate == null || !ts.getWeekStartDate().isBefore(startDate))
                .filter(ts -> endDate == null || !ts.getWeekStartDate().isAfter(endDate))
                .toList();

        // Group by approver
        Map<UUID, List<Double>> turnaroundsByManager = new HashMap<>();
        for (Timesheet ts : approved) {
            UUID managerId = ts.getApprovedBy();
            if (managerId == null) continue;
            double days = ChronoUnit.HOURS.between(ts.getSubmittedAt(), ts.getApprovedAt()) / 24.0;
            turnaroundsByManager.computeIfAbsent(managerId, k -> new ArrayList<>()).add(days);
        }

        List<ApprovalTurnaroundEntry> entries = new ArrayList<>();
        double orgTotalDays = 0;
        int orgTotalApproved = 0;

        for (Map.Entry<UUID, List<Double>> e : turnaroundsByManager.entrySet()) {
            User manager = userMap.get(e.getKey());
            String managerName = manager != null ? manager.getName() : "Unknown";
            List<Double> days = e.getValue();
            double avg = days.stream().mapToDouble(Double::doubleValue).average().orElse(0);
            double min = days.stream().mapToDouble(Double::doubleValue).min().orElse(0);
            double max = days.stream().mapToDouble(Double::doubleValue).max().orElse(0);

            entries.add(ApprovalTurnaroundEntry.builder()
                    .managerId(e.getKey().toString())
                    .managerName(managerName)
                    .totalApproved(days.size())
                    .avgDaysToApprove(Math.round(avg * 100.0) / 100.0)
                    .minDaysToApprove(Math.round(min * 100.0) / 100.0)
                    .maxDaysToApprove(Math.round(max * 100.0) / 100.0)
                    .build());

            orgTotalDays    += days.stream().mapToDouble(Double::doubleValue).sum();
            orgTotalApproved += days.size();
        }

        entries.sort(Comparator.comparing(ApprovalTurnaroundEntry::getAvgDaysToApprove));

        double orgAvg = orgTotalApproved > 0
                ? Math.round((orgTotalDays / orgTotalApproved) * 100.0) / 100.0
                : 0.0;

        return ApprovalTurnaroundReport.builder()
                .entries(entries)
                .orgAvgDaysToApprove(orgAvg)
                .totalApproved(orgTotalApproved)
                .build();
    }
}
