import { useEffect, useState } from 'react'
import { Building2, RefreshCw, AlertCircle } from 'lucide-react'
import type { AxiosError } from 'axios'

import { Button } from '@/components/ui/Button'
import { OrgChart } from '../components/OrgChart'
import organizationService from '../services/organizationService'
import type { OrganizationDepartment } from '../types/organization.types'
import type { ApiResponse } from '@/types/api.types'

function getErrorMessage(err: unknown): string {
  const axiosErr = err as AxiosError<ApiResponse<unknown>>
  return axiosErr?.response?.data?.message ?? 'Failed to load organization data'
}

// â”€â”€ Skeleton â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

function OrgChartSkeleton() {
  return (
    <div className="flex min-w-max flex-col items-center gap-0 pb-8 animate-pulse">
      <div className="h-16 w-52 rounded-2xl bg-muted" />
      <div className="h-8 w-px bg-muted" />
      <div className="h-px bg-muted" style={{ width: 'calc(4 * 256px - 56px)' }} />
      <div className="flex flex-row items-start gap-8">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="flex flex-col items-center">
            <div className="h-8 w-px bg-muted" />
            <div className="h-28 w-56 rounded-xl bg-muted" />
            <div className="h-6 w-px bg-muted" />
            <div className="flex flex-row gap-4">
              {Array.from({ length: 2 }).map((_, j) => (
                <div key={j} className="flex flex-col items-center">
                  <div className="h-6 w-px bg-muted" />
                  <div className="h-36 w-[200px] rounded-xl bg-muted" />
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// â”€â”€ Page â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export default function OrganizationChartPage() {
  const [departments, setDepartments] = useState<OrganizationDepartment[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchData = async () => {
    setIsLoading(true)
    setError(null)
    try {
      const data = await organizationService.getDepartments()
      setDepartments(data)
    } catch (err) {
      setError(getErrorMessage(err))
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    void fetchData()
  }, [])

  return (
    <div className="flex h-full flex-col">
      <div className="mx-auto flex w-full max-w-[1800px] flex-1 flex-col gap-6 px-4 sm:px-6 lg:px-8 py-6 min-h-0">

        {/* â”€â”€ Page header â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 shadow-md shadow-emerald-500/25">
              <Building2 className="h-5 w-5 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">Organization</h1>
              <p className="text-sm text-muted-foreground">
                {isLoading
                  ? 'Loading...'
                  : `${departments.length} department${departments.length !== 1 ? 's' : ''} Â· ${departments.reduce((n, d) => n + d.employees.length, 0)} employees`}
              </p>
            </div>
          </div>

          <Button
            variant="outline"
            size="icon"
            className="h-9 w-9 shrink-0"
            onClick={() => void fetchData()}
            disabled={isLoading}
            title="Refresh"
          >
            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
          </Button>
        </div>

        {/* â”€â”€ Error banner â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
        {error && (
          <div
            role="alert"
            className="flex items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/8 px-4 py-3 text-sm text-destructive"
          >
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{error}</span>
            <Button
              variant="ghost"
              size="sm"
              className="ml-auto text-destructive hover:text-destructive"
              onClick={() => void fetchData()}
            >
              Retry
            </Button>
          </div>
        )}

        {/* â”€â”€ Chart â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
        {!error && (
          <div className="flex-1 min-h-0 rounded-xl border border-border bg-card overflow-hidden">
            {isLoading ? (
              <div className="flex h-full items-center justify-center">
                <OrgChartSkeleton />
              </div>
            ) : departments.length === 0 ? (
              <div className="flex h-full flex-col items-center justify-center gap-3 text-center">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-muted">
                  <Building2 className="h-6 w-6 text-muted-foreground" />
                </div>
                <p className="text-sm text-muted-foreground">No departments found.</p>
              </div>
            ) : (
              <OrgChart departments={departments} />
            )}
          </div>
        )}
      </div>
    </div>
  )
}
