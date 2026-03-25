package com.company.tms.report.service;

import com.company.tms.leave.entity.Leave;
import com.company.tms.leave.entity.LeaveStatus;
import com.company.tms.leave.repository.LeaveRepository;
import com.company.tms.leave.repository.LeaveTypeRepository;
import com.company.tms.project.entity.Project;
import com.company.tms.project.repository.ProjectRepository;
import com.company.tms.report.dto.*;
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

    // ── Helpers ───────────────────────────────────────────────────────────────

    private Map<Long, String> buildProjectNameMap() {
        return projectRepository.findAll().stream()
                .collect(Collectors.toMap(Project::getId, Project::getName));
    }

    private Map<UUID, User> buildUserMap() {
        return userRepository.findAll().stream()
                .collect(Collectors.toMap(User::getId, Function.identity()));
    }

    /** Returns department name for a user. Falls back to "Unknown" if not resolvable. */
    private String resolveDepartmentName(User user, Map<Long, String> deptNameCache) {
        if (user.getDepartmentId() == null) return "Unknown";
        return deptNameCache.computeIfAbsent(user.getDepartmentId(), id -> "Dept-" + id);
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
        Map<Long, String> deptNameCache = new HashMap<>();

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

        Set<UUID> accessible = resolveAccessibleUserIds(auth);
        Map<Long, String> projectNames = buildProjectNameMap();

        // Aggregate time entries per project
        Map<Long, Long> minutesPerProject   = new HashMap<>();
        Map<Long, Set<UUID>> usersPerProject = new HashMap<>();

        // Iterate timesheets in range for accessible users
        for (UUID userId : accessible) {
            List<Timesheet> sheets = filterTimesheets(
                    timesheetRepository.findByUserId(userId), startDate, endDate);
            for (Timesheet ts : sheets) {
                for (TimeEntry te : timeEntryRepository.findByTimesheetId(ts.getId())) {
                    if (filterProjectId != null && !filterProjectId.equals(te.getProjectId())) continue;
                    long mins = te.getDurationMinutes() != null ? te.getDurationMinutes() : 0;
                    minutesPerProject.merge(te.getProjectId(), mins, Long::sum);
                    usersPerProject.computeIfAbsent(te.getProjectId(), k -> new HashSet<>()).add(userId);
                }
            }
        }

        List<ProjectUtilizationEntry> entries = new ArrayList<>();
        double totalLogged = 0;

        for (Map.Entry<Long, Long> e : minutesPerProject.entrySet()) {
            Long projId = e.getKey();
            double logged = minutesToHours(e.getValue());
            // No allocated hours concept on the Project entity; use logged as allocated baseline.
            entries.add(ProjectUtilizationEntry.builder()
                    .projectId(projId)
                    .projectName(projectNames.getOrDefault(projId, "Project-" + projId))
                    .allocatedHours(logged)
                    .loggedHours(logged)
                    .utilizationPercent(100.0)
                    .billableHours(logged)
                    .nonBillableHours(0)
                    .activeEmployees(usersPerProject.getOrDefault(projId, Collections.emptySet()).size())
                    .build());
            totalLogged += logged;
        }

        double avgUtil = entries.isEmpty() ? 0 :
                Math.round(entries.stream().mapToDouble(ProjectUtilizationEntry::getUtilizationPercent)
                        .average().orElse(0) * 10.0) / 10.0;

        return ProjectUtilizationReport.builder()
                .entries(entries)
                .totalAllocatedHours(totalLogged)
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
        Map<Long, String> deptNameCache = new HashMap<>();

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
        Map<Long, String> deptNameCache = new HashMap<>();

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
}
