import { Routes, Route, Navigate } from 'react-router-dom'
import LoginPage from '@/pages/auth/LoginPage'
import ProtectedRoute from '@/routes/ProtectedRoute'
import { AppLayout } from '@/layouts/AppLayout'
import UserListPage from '@/modules/users/pages/UserListPage'
import ProjectListPage from '@/modules/projects/pages/ProjectListPage'
import ProjectDetailsPage from '@/modules/projects/pages/ProjectDetailsPage'
import TaskListPage from '@/modules/tasks/pages/TaskListPage'
import TaskDetailsPage from '@/modules/tasks/pages/TaskDetailsPage'
import TimesheetDashboardPage from '@/modules/timesheets/pages/TimesheetDashboardPage'
import TimesheetEntryPage from '@/modules/timesheets/pages/TimesheetEntryPage'
import TimesheetHistoryPage from '@/modules/timesheets/pages/TimesheetHistoryPage'
import ManagerTimesheetDashboardPage from '@/modules/timesheets/manager/pages/ManagerTimesheetDashboardPage'
import ManagerTimesheetReviewPage from '@/modules/timesheets/manager/pages/ManagerTimesheetReviewPage'
import OrganizationChartPage from '@/modules/organization/pages/OrganizationChartPage'
import { HolidayPage } from '@/modules/holidays/pages/HolidayPage'
import { LeaveDashboardPage } from '@/modules/leaves/pages/LeaveDashboardPage'
import { ManagerLeaveApprovalPage } from '@/modules/leaves/pages/ManagerLeaveApprovalPage'
import ManagerTimesheetReminderPage from '@/modules/notifications/pages/ManagerTimesheetReminderPage'
import NotificationsPage from '@/modules/notifications/pages/NotificationsPage'
import DashboardPage from '@/modules/dashboard/pages/DashboardPage'
import MyTeamPage from '@/modules/my-team/pages/MyTeamPage'
import DepartmentListPage from '@/modules/departments/pages/DepartmentListPage'
import ReportsPage from '@/modules/reports/pages/ReportsPage'
import SettingsPage from '@/modules/settings/pages/SettingsPage'

export default function App() {
  return (
    <Routes>
      {/* Public routes */}
      <Route path="/login" element={<LoginPage />} />

      {/* Protected routes — all wrapped by AppLayout */}
      <Route element={<ProtectedRoute />}>
        <Route element={<AppLayout />}>
          <Route path="/dashboard"                        element={<DashboardPage />} />
          <Route path="/my-team"                          element={<MyTeamPage />} />
          <Route path="/users"                            element={<UserListPage />} />
          <Route path="/organization"                     element={<OrganizationChartPage />} />
          <Route path="/departments"                      element={<DepartmentListPage />} />
          <Route path="/projects"                         element={<ProjectListPage />} />
          <Route path="/projects/:id"                     element={<ProjectDetailsPage />} />
          <Route path="/tasks"                            element={<TaskListPage />} />
          <Route path="/tasks/:id"                        element={<TaskDetailsPage />} />
          <Route path="/timesheets"                       element={<TimesheetDashboardPage />} />
          <Route path="/timesheets/history"               element={<TimesheetHistoryPage />} />
          <Route path="/timesheets/manager"               element={<ManagerTimesheetDashboardPage />} />
          <Route path="/timesheets/manager/review/:id"    element={<ManagerTimesheetReviewPage />} />
          <Route path="/timesheets/reminders"             element={<ManagerTimesheetReminderPage />} />
          <Route path="/timesheets/:id"                   element={<TimesheetEntryPage />} />
          <Route path="/leave"                            element={<LeaveDashboardPage />} />
          <Route path="/leave/approvals"                  element={<ManagerLeaveApprovalPage />} />
          <Route path="/holidays"                         element={<HolidayPage />} />
          <Route path="/notifications"                    element={<NotificationsPage />} />
          <Route path="/reports"                          element={<ReportsPage />} />
          <Route path="/settings"                         element={<SettingsPage />} />
        </Route>
      </Route>

      {/* Default redirect */}
      <Route path="/" element={<Navigate to="/dashboard" replace />} />
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  )
}


