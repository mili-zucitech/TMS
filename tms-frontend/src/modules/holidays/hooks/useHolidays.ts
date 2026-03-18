import { useCallback, useEffect, useState } from 'react'
import { toast } from 'sonner'
import {
  createHoliday,
  deleteHoliday,
  getHolidays,
  updateHoliday,
} from '../services/holidayService'
import type {
  HolidayCreateRequest,
  HolidayResponse,
  HolidayUpdateRequest,
} from '../types/holiday.types'

export function useHolidays() {
  const [holidays, setHolidays] = useState<HolidayResponse[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchHolidays = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const data = await getHolidays()
      setHolidays(data)
    } catch {
      setError('Failed to load holidays')
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    void fetchHolidays()
  }, [fetchHolidays])

  const addHoliday = useCallback(
    async (payload: HolidayCreateRequest) => {
      const created = await createHoliday(payload)
      setHolidays((prev) => [...prev, created].sort(byDate))
      toast.success('Holiday created successfully')
      return created
    },
    [],
  )

  const editHoliday = useCallback(
    async (id: number, payload: HolidayUpdateRequest) => {
      const updated = await updateHoliday(id, payload)
      setHolidays((prev) =>
        prev.map((h) => (h.id === id ? updated : h)).sort(byDate),
      )
      toast.success('Holiday updated successfully')
      return updated
    },
    [],
  )

  const removeHoliday = useCallback(async (id: number) => {
    await deleteHoliday(id)
    setHolidays((prev) => prev.filter((h) => h.id !== id))
    toast.success('Holiday deleted successfully')
  }, [])

  return {
    holidays,
    isLoading,
    error,
    fetchHolidays,
    addHoliday,
    editHoliday,
    removeHoliday,
  }
}

// ── Helpers ──────────────────────────────────────────────────
function byDate(a: HolidayResponse, b: HolidayResponse) {
  return a.holidayDate.localeCompare(b.holidayDate)
}
