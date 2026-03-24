import { http, HttpResponse } from 'msw'

const BASE = 'http://localhost:8080/api/v1'

const mockTimesheets = [
  {
    id: 1,
    userId: 'user-001',
    weekStartDate: '2024-01-01',
    weekEndDate: '2024-01-07',
    status: 'DRAFT',
    submittedAt: null,
    approvedAt: null,
    approvedBy: null,
    rejectionReason: null,
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
  },
]

const mockLeaves = [
  {
    id: 1,
    userId: 'user-001',
    leaveTypeId: 1,
    leaveTypeName: 'Annual Leave',
    startDate: '2024-03-01',
    endDate: '2024-03-05',
    totalDays: 5,
    reason: 'Vacation',
    status: 'PENDING',
    appliedAt: '2024-02-01T00:00:00Z',
    reviewedBy: null,
    reviewedAt: null,
    managerComments: null,
  },
]

const mockUsers = [
  {
    id: 'user-001',
    employeeId: 'EMP001',
    name: 'Test User',
    email: 'admin@company.com',
    phone: null,
    departmentId: 1,
    managerId: null,
    designation: 'Engineer',
    roleName: 'ADMIN',
    employmentType: 'FULL_TIME',
    joiningDate: '2024-01-01',
    status: 'ACTIVE',
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
  },
]

function ok<T>(data: T) {
  return HttpResponse.json({ success: true, data, message: 'OK' })
}

function pagedOk<T>(content: T[]) {
  return HttpResponse.json({
    success: true,
    data: { content, totalElements: content.length, totalPages: 1, number: 0, size: 200 },
    message: 'OK',
  })
}

export const handlers = [
  // â”€â”€ Auth â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  http.post(`${BASE}/auth/login`, () => {
    return HttpResponse.json({
      success: true,
      data: {
        // Minimal JWT: header.payload.signature
        // payload = {"sub":"admin@company.com","roles":["ROLE_ADMIN"],"userId":"user-001","exp":9999999999}
        accessToken:
          'eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJhZG1pbkBjb21wYW55LmNvbSIsInJvbGVzIjpbIlJPTEVfQURNSU4iXSwidXNlcklkIjoidXNlci0wMDEiLCJleHAiOjk5OTk5OTk5OTl9.FAKESIG',
        tokenType: 'Bearer',
      },
      message: 'Login successful',
    })
  }),

  // â”€â”€ Users â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  http.get(`${BASE}/users`, () => pagedOk(mockUsers)),
  http.get(`${BASE}/users/:id`, ({ params }) => ok(mockUsers.find((u) => u.id === params.id) ?? mockUsers[0])),
  http.get(`${BASE}/users/team/:managerId`, () => ok([])),
  http.get(`${BASE}/users/department/:departmentId`, () => ok([])),
  http.post(`${BASE}/users`, async ({ request }) => {
    const body = await request.json() as Record<string, unknown>
    return ok({ ...mockUsers[0], ...body, id: 'new-user' })
  }),
  http.put(`${BASE}/users/:id`, async ({ params, request }) => {
    const body = await request.json() as Record<string, unknown>
    return ok({ ...mockUsers[0], ...body, id: params.id })
  }),
  http.delete(`${BASE}/users/:id`, () => ok(null)),

  // â”€â”€ Timesheets â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  http.get(`${BASE}/timesheets/user/:userId`, () => ok(mockTimesheets)),
  http.get(`${BASE}/timesheets/:id`, ({ params }) => {
    const ts = mockTimesheets.find((t) => t.id === Number(params.id))
    if (!ts) return new HttpResponse(null, { status: 404 })
    return ok(ts)
  }),
  http.post(`${BASE}/timesheets`, async ({ request }) => {
    const body = await request.json() as Record<string, unknown>
    return ok({ ...mockTimesheets[0], id: 99, ...body })
  }),
  http.post(`${BASE}/timesheets/:id/submit`, ({ params }) => {
    const ts = mockTimesheets.find((t) => t.id === Number(params.id))
    return ok({ ...(ts ?? mockTimesheets[0]), status: 'SUBMITTED' })
  }),
  http.post(`${BASE}/timesheets/:id/approve`, ({ params }) => {
    const ts = mockTimesheets.find((t) => t.id === Number(params.id))
    return ok({ ...(ts ?? mockTimesheets[0]), status: 'APPROVED' })
  }),
  http.post(`${BASE}/timesheets/:id/reject`, ({ params }) => {
    const ts = mockTimesheets.find((t) => t.id === Number(params.id))
    return ok({ ...(ts ?? mockTimesheets[0]), status: 'REJECTED' })
  }),
  http.post(`${BASE}/timesheets/:id/lock`, ({ params }) => {
    const ts = mockTimesheets.find((t) => t.id === Number(params.id))
    return ok({ ...(ts ?? mockTimesheets[0]), status: 'LOCKED' })
  }),

  // â”€â”€ Time Entries â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  http.get(`${BASE}/time-entries/timesheet/:timesheetId`, () => ok([])),
  http.get(`${BASE}/time-entries/user/:userId/date/:date`, () => ok([])),
  http.post(`${BASE}/time-entries`, async ({ request }) => {
    const body = await request.json() as Record<string, unknown>
    return ok({ id: 1, ...body, durationMinutes: 480 })
  }),
  http.put(`${BASE}/time-entries/:id`, async ({ params, request }) => {
    const body = await request.json() as Record<string, unknown>
    return ok({ id: Number(params.id), ...body, durationMinutes: 480 })
  }),
  http.delete(`${BASE}/time-entries/:id`, () => ok(null)),

  // â”€â”€ Leaves â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  http.get(`${BASE}/leaves/user/:userId`, () => ok(mockLeaves)),
  http.get(`${BASE}/leaves/manager/:managerId`, () => ok([])),
  http.post(`${BASE}/leaves`, async ({ request }) => {
    const body = await request.json() as Record<string, unknown>
    return ok({ ...mockLeaves[0], id: 99, ...body })
  }),
  http.post(`${BASE}/leaves/:id/approve`, ({ params }) => {
    const leave = mockLeaves.find((l) => l.id === Number(params.id))
    return ok({ ...(leave ?? mockLeaves[0]), status: 'APPROVED' })
  }),
  http.post(`${BASE}/leaves/:id/reject`, ({ params }) => {
    const leave = mockLeaves.find((l) => l.id === Number(params.id))
    return ok({ ...(leave ?? mockLeaves[0]), status: 'REJECTED' })
  }),
  http.post(`${BASE}/leaves/:id/cancel`, ({ params }) => {
    const leave = mockLeaves.find((l) => l.id === Number(params.id))
    return ok({ ...(leave ?? mockLeaves[0]), status: 'CANCELLED' })
  }),

  // â”€â”€ Leave Types â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  http.get(`${BASE}/leave-types`, () =>
    ok([{ id: 1, name: 'Annual Leave', defaultAnnualAllocation: 20, requiresApproval: true }]),
  ),

  // â”€â”€ Leave Balances â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  http.get(`${BASE}/leave-balances/user/:userId`, () =>
    ok([
      {
        id: 1,
        userId: 'user-001',
        leaveTypeId: 1,
        leaveTypeName: 'Annual Leave',
        year: 2024,
        totalAllocated: 20,
        usedLeaves: 3,
        remainingLeaves: 17,
        updatedAt: '2024-01-01T00:00:00Z',
      },
    ]),
  ),
  http.post(`${BASE}/leave-balances/initialize/:year`, ({ params }) =>
    ok({ year: Number(params.year), recordsCreated: 10 }),
  ),

  // â”€â”€ Projects â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  http.get(`${BASE}/projects`, () => pagedOk([])),
  http.get(`${BASE}/projects/:id`, () => ok({ id: 1, name: 'Test Project', status: 'ACTIVE' })),
  http.post(`${BASE}/projects`, async ({ request }) => {
    const body = await request.json() as Record<string, unknown>
    return ok({ id: 1, ...body })
  }),
  http.put(`${BASE}/projects/:id`, async ({ params, request }) => {
    const body = await request.json() as Record<string, unknown>
    return ok({ id: Number(params.id), ...body })
  }),
  http.delete(`${BASE}/projects/:id`, () => ok({ id: 1, status: 'COMPLETED' })),

  // â”€â”€ Project Assignments â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  http.get(`${BASE}/project-assignments/project/:projectId`, () => ok([])),
  http.get(`${BASE}/project-assignments/user/:userId`, () => ok([])),
  http.post(`${BASE}/project-assignments`, async ({ request }) => {
    const body = await request.json() as Record<string, unknown>
    return ok({ id: 1, ...body })
  }),
  http.delete(`${BASE}/project-assignments/:id`, () => ok(null)),

  // â”€â”€ Tasks â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  http.get(`${BASE}/tasks`, () => pagedOk([])),
  http.get(`${BASE}/tasks/:id`, () => ok({ id: 1, title: 'Test Task', status: 'TODO' })),
  http.get(`${BASE}/tasks/project/:projectId`, () => ok([])),
  http.get(`${BASE}/tasks/user/:userId`, () => ok([])),
  http.post(`${BASE}/tasks`, async ({ request }) => {
    const body = await request.json() as Record<string, unknown>
    return ok({ id: 1, ...body })
  }),
  http.put(`${BASE}/tasks/:id`, async ({ params, request }) => {
    const body = await request.json() as Record<string, unknown>
    return ok({ id: Number(params.id), ...body })
  }),
  http.patch(`${BASE}/tasks/:id/status`, async ({ params, request }) => {
    const body = await request.json() as Record<string, unknown>
    return ok({ id: Number(params.id), ...body })
  }),
  http.delete(`${BASE}/tasks/:id`, () => ok(null)),

  // â”€â”€ Holidays â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  http.get(`${BASE}/holidays`, () => ok([])),
  http.get(`${BASE}/holidays/range`, () => ok([])),
  http.post(`${BASE}/holidays`, async ({ request }) => {
    const body = await request.json() as Record<string, unknown>
    return ok({ id: 1, ...body })
  }),
  http.put(`${BASE}/holidays/:id`, async ({ params, request }) => {
    const body = await request.json() as Record<string, unknown>
    return ok({ id: Number(params.id), ...body })
  }),
  http.delete(`${BASE}/holidays/:id`, () => ok(null)),

  // â”€â”€ Departments â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  http.get(`${BASE}/departments`, () => pagedOk([])),
  http.get(`${BASE}/departments/:id`, () =>
    ok({ id: 1, name: 'Engineering', status: 'ACTIVE', memberCount: 5 }),
  ),
  http.get(`${BASE}/departments/:id/members`, () => ok([])),

  // â”€â”€ Notifications â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  http.get(`${BASE}/notifications/user/:userId`, () => ok([])),
  http.get(`${BASE}/notifications/user/:userId/unread-count`, () => ok(0)),
  http.put(`${BASE}/notifications/:id/read`, ({ params }) =>
    ok({ id: Number(params.id), isRead: true }),
  ),
  http.post(`${BASE}/notifications/remind/:userId`, () => ok('Reminder sent')),

  // â”€â”€ Organization â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  http.get(`${BASE}/organization/departments`, () => ok([])),

  // â”€â”€ Reports â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  http.get(`${BASE}/reports/employee-hours`, () =>
    ok({ entries: [], totalHours: 0, totalBillableHours: 0, totalNonBillableHours: 0, employeeCount: 0 }),
  ),
  http.get(`${BASE}/reports/project-utilization`, () =>
    ok({ entries: [], totalAllocatedHours: 0, totalLoggedHours: 0, avgUtilizationPercent: 0 }),
  ),
  http.get(`${BASE}/reports/billable-hours`, () =>
    ok({ entries: [], totalBillableHours: 0, totalNonBillableHours: 0, totalHours: 0, overallBillablePercent: 0 }),
  ),
  http.get(`${BASE}/reports/kpi-summary`, () =>
    ok({ totalHoursLogged: 0, totalBillableHours: 0, utilizationPercent: 0, activeEmployees: 0, activeProjects: 0, pendingTimesheets: 0 }),
  ),
]
