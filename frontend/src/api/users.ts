import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from './client';
import type {
  AdminStats,
  AdminUser,
  AdminUserListResponse,
  SavedDestination,
  UserProfile,
} from './types';

export function useProfile() {
  return useQuery({
    queryKey: ['profile'],
    queryFn: () => api.get<UserProfile>('/users/me'),
  });
}

export function useUpdateProfile() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: { fullName?: string; homeCityId?: number }) =>
      api.patch<UserProfile>('/users/me', payload),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['profile'] }),
  });
}

export function useSavedDestinations() {
  return useQuery({
    queryKey: ['savedDestinations'],
    queryFn: () => api.get<SavedDestination[]>('/users/me/saved-destinations'),
  });
}

export function useAddSavedDestination() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (cityId: number) => api.post<SavedDestination>('/users/me/saved-destinations', { cityId }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['savedDestinations'] }),
  });
}

export function useRemoveSavedDestination() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (cityId: number) => api.delete<void>(`/users/me/saved-destinations/${cityId}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['savedDestinations'] }),
  });
}

export function useAdminStats() {
  return useQuery({
    queryKey: ['adminStats'],
    queryFn: () => api.get<AdminStats>('/admin/stats'),
  });
}

export function useAdminUsers() {
  return useQuery({
    queryKey: ['adminUsers'],
    queryFn: () => api.get<AdminUserListResponse>('/admin/users?limit=100'),
  });
}

export function useUpdateAdminUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: { userId: string; role?: string; deletedAt?: string | null }) =>
      api.patch<AdminUser>(`/admin/users/${payload.userId}`, {
        role: payload.role,
        deletedAt: payload.deletedAt,
      }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['adminUsers'] }),
  });
}
