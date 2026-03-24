import { baseApi } from '@/store/baseApi'
import type {
  HolidayResponse,
  HolidayCreateRequest,
  HolidayUpdateRequest,
} from '@/modules/holidays/types/holiday.types'

export const holidaysApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getHolidays: builder.query<HolidayResponse[], void>({
      query: () => '/holidays',
      providesTags: ['Holiday'],
    }),
    getHolidayById: builder.query<HolidayResponse, number>({
      query: (id) => `/holidays/${id}`,
      providesTags: (_result, _error, id) => [{ type: 'Holiday', id }],
    }),
    getHolidaysInRange: builder.query<HolidayResponse[], { startDate: string; endDate: string }>({
      query: ({ startDate, endDate }) => ({
        url: '/holidays/range',
        params: { startDate, endDate },
      }),
      providesTags: ['Holiday'],
    }),
    createHoliday: builder.mutation<HolidayResponse, HolidayCreateRequest>({
      query: (body) => ({ url: '/holidays', method: 'POST', body }),
      invalidatesTags: ['Holiday'],
    }),
    updateHoliday: builder.mutation<HolidayResponse, { id: number; body: HolidayUpdateRequest }>({
      query: ({ id, body }) => ({ url: `/holidays/${id}`, method: 'PUT', body }),
      invalidatesTags: ['Holiday'],
    }),
    deleteHoliday: builder.mutation<void, number>({
      query: (id) => ({ url: `/holidays/${id}`, method: 'DELETE' }),
      invalidatesTags: ['Holiday'],
    }),
  }),
  overrideExisting: false,
})

export const {
  useGetHolidaysQuery,
  useGetHolidayByIdQuery,
  useGetHolidaysInRangeQuery,
  useCreateHolidayMutation,
  useUpdateHolidayMutation,
  useDeleteHolidayMutation,
} = holidaysApi
