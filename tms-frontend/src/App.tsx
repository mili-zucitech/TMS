import { lazy, Suspense } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { Loader2 } from 'lucide-react'
import ProtectedRoute from '@/routes/ProtectedRoute'
import { AppLayout } from '@/layouts/AppLayout'
import { ErrorBoundary } from '@/components/ErrorBoundary'

// ── Eagerly loaded (tiny, always needed on first paint) ───────────────────────
import LoginPage from '@/pages/auth/LoginPage'

// ── Lazily loaded (each module is a separate JS chunk) ───────────────────────
const DashboardPage              = lazy(() => import('@/modules/dashboard/pages/DashboardPage'))
const MyTeamPage                 = lazy(() => import('@/modules/my-team/pages/MyTeamPage'))
const UserListPage               = lazy(() => import('@/modules/users/pages/UserListPage'))
const OrganizationChartPage      = lazy(() => import('@/modules/organization/pages/OrganizationChartPage'))
const DepartmentListPage         = lazy(() => import('@/modules/departments/pages/DepartmentListPage'))
const ProjectListPage            = lazy(() => import('@/modules/projects/pages/ProjectListPage'))
const ProjectDetailsPage         = lazy(() => import('@/modules/projects/pages/ProjectDetailsPage'))
const TaskListPage               = lazy(() => import('@/modules/tasks/pages/TaskListPage'))
const TaskDetailsPage            = lazy(() => import('@/modules/tasks/pages/TaskDetailsPage'))
const TimesheetDashboardPage     = lazy(() => import('@/modules/timesheets/pages/TimesheetDashboardPage'))
const TimesheetEntryPage         = lazy(() => import('@/modules/timesheets/pages/TimesheetEntryPage'))
const TimesheetHistoryPage       = lazy(() => import('@/modules/timesheets/pages/TimesheetHistoryPage'))
const ManagerTimesheetDashboardPage = lazy(() => import('@/modules/timesheets/manager/pages/ManagerTimesheetDashboardPage'))
const ManagerTimesheetReviewPage = lazy(() => import('@/modules/timesheets/manager/pages/ManagerTimesheetReviewPage'))
const LeaveDashboardPage         = lazy(() => import('@/modules/leaves/pages/LeaveDashboardPage').then((m) => ({ default: m.LeaveDashboardPage })))
const ManagerLeaveApprovalPage   = lazy(() => import('@/modules/leaves/pages/ManagerLeaveApprovalPage').then((m) => ({ default: m.ManagerLeaveApprovalPage })))
const HolidayPage                = lazy(() => import('@/modules/holidays/pages/HolidayPage').then((m) => ({ default: m.HolidayPage })))
const ManagerTimesheetReminderPage = lazy(() => import('@/modules/notifications/pages/ManagerTimesheetReminderPage'))
const NotificationsPage          = lazy(() => import('@/modules/notifications/pages/NotificationsPage'))
const ReportsPage                = lazy(() => import('@/modules/reports/pages/ReportsPage'))
const SettingsPage               = lazy(() => import('@/modules/settings/pages/SettingsPage'))

// ── Page-level loading spinner ────────────────────────────────────────────────
function PageSpinner() {
  return (
    <div className="flex h-full min-h-[60vh] items-center justify-center">
      <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
    </div>
  )
}

export default function App() {
  return (
    <ErrorBoundary>
      <Routes>
        {/* Public routes */}
        <Route path="/login" element={<LoginPage />} />

        {/* Protected routes — all wrapped by AppLayout */}
        <Route element={<ProtectedRoute />}>
          <Route element={<AppLayout />}>
            <Route
              path="/*"
              element={
                <ErrorBoundary>
                  <Suspense fallback={<PageSpinner />}>
                    <Routes>
                      <Route path="/dashboard"                     element={<DashboardPage />} />
                      <Route path="/my-team"                       element={<MyTeamPage />} />
                      <Route path="/users"                         element={<UserListPage />} />
                      <Route path="/organization"                  element={<OrganizationChartPage />} />
                      <Route path="/departments"                   element={<DepartmentListPage />} />
                      <Route path="/projects"                      element={<ProjectListPage />} />
                      <Route path="/projects/:id"                  element={<ProjectDetailsPage />} />
                      <Route path="/tasks"                         element={<TaskListPage />} />
                      <Route path="/tasks/:id"                     element={<TaskDetailsPage />} />
                      <Route path="/timesheets"                    element={<TimesheetDashboardPage />} />
                      <Route path="/timesheets/history"            element={<TimesheetHistoryPage />} />
                      <Route path="/timesheets/manager"            element={<ManagerTimesheetDashboardPage />} />
                      <Route path="/timesheets/manager/review/:id" element={<ManagerTimesheetReviewPage />} />
                      <Route path="/timesheets/reminders"          element={<ManagerTimesheetReminderPage />} />
                      <Route path="/timesheets/:id"                element={<TimesheetEntryPage />} />
                      <Route path="/leave"                         element={<LeaveDashboardPage />} />
                      <Route path="/leave/approvals"               element={<ManagerLeaveApprovalPage />} />
                      <Route path="/holidays"                      element={<HolidayPage />} />
                      <Route path="/notifications"                 element={<NotificationsPage />} />
                      <Route path="/reports"                       element={<ReportsPage />} />
                      <Route path="/settings"                      element={<SettingsPage />} />
                    </Routes>
                  </Suspense>
                </ErrorBoundary>
              }
            />
          </Route>
        </Route>

        {/* Default redirect */}
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </ErrorBoundary>
  )
}


