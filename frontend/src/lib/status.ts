import type { TripStatus } from '../api/types';

/**
 * Mirrors v_trip_summary's CASE expression (migrations/002_views.sql) for
 * display purposes only. GET /trips returns the server-computed status
 * directly — use that when it's available; this is only for TripOut
 * responses (create/update/detail) which don't carry status.
 */
export function computeTripStatus(startDate: string, endDate: string): TripStatus {
  const today = new Date().toISOString().slice(0, 10);
  if (today < startDate) return 'UPCOMING';
  if (today > endDate) return 'COMPLETED';
  return 'ONGOING';
}

export const STATUS_COLOR: Record<TripStatus, string> = {
  UPCOMING: '#1f6f5c',
  ONGOING: '#b2721c',
  COMPLETED: '#5c6f69',
};

export function formatDateRange(startDate: string, endDate: string): string {
  const fmt = (d: string) =>
    new Date(d + 'T00:00:00').toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });
  return `${fmt(startDate)} – ${fmt(endDate)}`;
}
