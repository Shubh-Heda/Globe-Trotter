import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from './client';
import type {
  CreateTripPayload,
  DashboardResponse,
  ScheduledActivity,
  TripDetail,
  TripListResponse,
  TripOut,
  TripStop,
} from './types';

export function useDashboard() {
  return useQuery({
    queryKey: ['dashboard'],
    queryFn: () => api.get<DashboardResponse>('/dashboard'),
  });
}

export function useTrips(status?: string) {
  return useQuery({
    queryKey: ['trips', status ?? 'ALL'],
    queryFn: () =>
      api.get<TripListResponse>(`/trips${status ? `?status=${status}` : ''}`),
  });
}

export function useTrip(tripId: string | undefined) {
  return useQuery({
    queryKey: ['trip', tripId],
    queryFn: () => api.get<TripDetail>(`/trips/${tripId}`),
    enabled: !!tripId,
  });
}

export function useCreateTrip() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateTripPayload) => api.post<TripOut>('/trips', payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['trips'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
}

export function useDeleteTrip() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (tripId: string) => api.delete<void>(`/trips/${tripId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['trips'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
}

export function useAddStop(tripId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: {
      cityId: number;
      arrivalDate: string;
      departureDate: string;
      stayCents?: number;
      transportInCents?: number;
    }) => api.post<TripStop>(`/trips/${tripId}/stops`, payload),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['trip', tripId] }),
  });
}

export function useDeleteStop(tripId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (stopId: string) => api.delete<void>(`/stops/${stopId}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['trip', tripId] }),
  });
}

export function useAddActivity(tripId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: {
      stopId: string;
      customName: string;
      scheduledDate: string;
      startTime?: string;
      costCents?: number;
    }) =>
      api.post<ScheduledActivity>(`/stops/${payload.stopId}/activities`, {
        customName: payload.customName,
        scheduledDate: payload.scheduledDate,
        startTime: payload.startTime,
        costCents: payload.costCents ?? 0,
      }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['trip', tripId] }),
  });
}

export function useDeleteActivity(tripId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (activityId: string) => api.delete<void>(`/scheduled-activities/${activityId}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['trip', tripId] }),
  });
}
