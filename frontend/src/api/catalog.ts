import { useQuery } from '@tanstack/react-query';
import { api } from './client';
import type { ActivityCatalogItem, ActivityCategory, CityFull } from './types';

export interface City {
  id: number;
  name: string;
  countryName: string | null;
}

export function useCities() {
  return useQuery({
    queryKey: ['cities'],
    queryFn: () => api.get<{ items: City[]; total: number }>('/cities?limit=100'),
    staleTime: 5 * 60 * 1000, // catalogue data barely changes — safe to cache longer
  });
}

export function useCitySearch(params: { q?: string; sort?: 'cost' | 'popularity' }) {
  return useQuery({
    queryKey: ['citySearch', params.q ?? '', params.sort ?? 'popularity'],
    queryFn: () => {
      const qs = new URLSearchParams({ sort: params.sort ?? 'popularity', limit: '40' });
      if (params.q) qs.set('q', params.q);
      return api.get<{ items: CityFull[]; total: number }>(`/cities?${qs}`);
    },
  });
}

export function useActivityCategories() {
  return useQuery({
    queryKey: ['activityCategories'],
    queryFn: () => api.get<ActivityCategory[]>('/activity-categories'),
    staleTime: 5 * 60 * 1000,
  });
}

export function useActivitySearch(params: { q?: string; categoryId?: number }) {
  return useQuery({
    queryKey: ['activitySearch', params.q ?? '', params.categoryId ?? 0],
    queryFn: () => {
      const qs = new URLSearchParams({ limit: '40' });
      if (params.q) qs.set('q', params.q);
      if (params.categoryId) qs.set('categoryId', String(params.categoryId));
      return api.get<{ items: ActivityCatalogItem[]; total: number }>(`/activities?${qs}`);
    },
  });
}
