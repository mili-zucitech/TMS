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
    numberOfDays: 5,
    reason: 'Vacation',
    status: 'PENDING',
    appliedAt: '2024-02-01T00:00:00Z',
    reviewedBy: null,
    reviewedAt: null,
    managerComments: null,
  },
]

export const handlers = [
  // ── Auth ──────────────────────────────────────────────────────────────────
  http.post(`${BASE}/auth/login`, () => {
    return HttpResponse.json({
      success: true,
      data: {
        accessToken:
          // Minimal JWT: header.{"sub":"admin@company.com","roles":["ROLE_ADMIN"],"userId":"user-001","exp":9999999999}.signature
          'eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJhZG1pbkBjb21wYW55LmNvbSIsInJvbGVzIjpbIlJPTEVfQURNSU4iXSwidXNlcklkIjoidXNlci0wMDEiLCJleHAiOjk5OTk5OTk5OTl9.FAKESIG',
        tokenType: 'Bearer',
      },
      message: 'Login successful',
    })
  }),

  // ── Timesheets ────────────────────────────────────────────────────────────
  http.get(`${BASE}/timesheets`, () => {
    return HttpResponse.json({
      success: true,
      data: { content: mockTimesheets, totalElements: 1, totalPages: 1, number: 0, size: 20 },
      message: 'OK',
    })
  }),

  http.get(`${BASE}/timesheets/:id`, ({ params }) => {
    const ts = mockTimesheets.find((t) => t.id === Number(params.id))
    if (!ts) return new HttpResponse(null, { status: 404 })
    return HttpResponse.json({ success: true, data: ts, message: 'OK' })
  }),

  http.get(`${BASE}/timesheets/:id/entries`, () => {
    return HttpResponse.json({ success: true, data: [], message: 'OK' })
  }),

  // ── Leaves ────────────────────────────────────────────────────────────────
  http.get(`${BASE}/leaves`, () => {
    return HttpResponse.json({
      success: true,
      data: { content: mockLeaves, totalElements: 1, totalPages: 1, number: 0, size: 20 },
      message: 'OK',
    })
  }),

  http.get(`${BASE}/leaves/balance/:userId`, () => {
    return HttpResponse.json({
      success: true,
      data: [
        { leaveTypeId: 1, leaveTypeName: 'Annual Leave', allocatedDays: 20, usedDays: 5, pendingDays: 0, remainingDays: 15 },
      ],
      message: 'OK',
    })
  }),

  http.get(`${BASE}/leaves/types`, () => {
    return HttpResponse.json({
      success: true,
      data: [{ id: 1, name: 'Annual Leave', maxDaysPerYear: 20 }],
      message: 'OK',
    })
  }),

  // ── Users ─────────────────────────────────────────────────────────────────
  http.get(`${BASE}/users`, () => {
    return HttpResponse.json({
      success: true,
      data: {
        content: [
          {
            id: 'user-001',
            employeeId: 'EMP001',
            name: 'Admin User',
            email: 'admin@company.com',
            roleName: 'ADMIN',
            status: 'ACTIVE',
          },
        ],
        totalElements: 1,
        totalPages: 1,
        number: 0,
        size: 20,
      },
      message: 'OK',
    })
  }),

  http.get(`${BASE}/users/:id`, ({ params }) => {
    return HttpResponse.json({
      success: true,
      data: {
        id: params.id,
        employeeId: 'EMP001',
        name: 'Admin User',
        email: 'admin@company.com',
        roleName: 'ADMIN',
        status: 'ACTIVE',
      },
      message: 'OK',
    })
  }),

  // ── Notifications ─────────────────────────────────────────────────────────
  http.get(`${BASE}/notifications`, () => {
    return HttpResponse.json({ success: true, data: [], message: 'OK' })
  }),
]
