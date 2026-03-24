import { baseApi } from '@/store/baseApi'
import type { ProfileUpdateRequest } from '@/modules/settings/types/settings.types'
import type { UserResponse } from '@/modules/users/types/user.types'

export const settingsApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    updateProfile: builder.mutation<UserResponse, { userId: string; body: ProfileUpdateRequest }>({
      query: ({ userId, body }) => ({
        url: `/users/${userId}`,
        method: 'PUT',
        body,
      }),
      invalidatesTags: (_result, _error, { userId }) => [
        'User',
        { type: 'User', id: userId },
      ],
    }),
  }),
  overrideExisting: false,
})

export const { useUpdateProfileMutation } = settingsApi
