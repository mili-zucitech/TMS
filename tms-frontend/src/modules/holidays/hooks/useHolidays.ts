import { useCallback } from 'react'
import { toast } from 'sonner'
import {
  useGetHolidaysQuery,
  useCreateHolidayMutation,
  useUpdateHolidayMutation,
  useDeleteHolidayMutation,
} from '@/features/holidays/holidaysApi'
import type {
  HolidayCreateRequest,
  HolidayUpdateRequest,
} from '../types/holiday.types'

export function useHolidays() {
  const { data: holidays = [], isLoading, error: queryError } = useGetHolidaysQuery()
  const error = queryError ? 'Failed to load holidays' : null

  const [createHolidayMutation] = useCreateHolidayMutation()
  const [updateHolidayMutation] = useUpdateHolidayMutation()
  const [deleteHolidayMutation] = useDeleteHolidayMutation()

  const addHoliday = useCallback(
    async (payload: HolidayCreateRequest) => {
      const created = await createHolidayMutation(payload).unwrap()
      toast.success('Holiday created successfully')
      return created
    },
    [createHolidayMutation],
  )

  const editHoliday = useCallback(
    async (id: number, payload: HolidayUpdateRequest) => {
      const updated = await updateHolidayMutation({ id, body: payload }).unwrap()
      toast.success('Holiday updated successfully')
      return updated
    },
    [updateHolidayMutation],
  )

  const removeHoliday = useCallback(
    async (id: number) => {
      await deleteHolidayMutation(id).unwrap()
      toast.success('Holiday deleted successfully')
    },
    [deleteHolidayMutation],
  )

  return {
    holidays,
    isLoading,
    error,
    addHoliday,
    editHoliday,
    removeHoliday,
  }
}
