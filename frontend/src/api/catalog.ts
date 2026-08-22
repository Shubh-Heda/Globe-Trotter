import { useQuery } from '@tanstack/react-query';
import { api } from './client';

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
