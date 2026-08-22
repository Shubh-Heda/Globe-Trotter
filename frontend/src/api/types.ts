// Mirrors backend/app/modules/*/schemas.py exactly — see BACKEND-TO-FRONTEND.md
// for the verified wire shapes. Keep field names in sync if the API changes.

export type TripStatus = 'UPCOMING' | 'ONGOING' | 'COMPLETED';
export type TripVisibility = 'PRIVATE' | 'PUBLIC';

export interface TripSummary {
  id: string;
  userId: string;
  name: string;
  description: string | null;
  startDate: string;
  endDate: string;
  coverImagePath: string | null;
  visibility: TripVisibility;
  shareSlug: string | null;
  currencyCode: string;
  budgetCapCents: number | null;
  durationDays: number;
  copiedFromTripId: string | null;
  createdAt: string;
  status: TripStatus;
  stopCount: number;
  totalCents: number;
}

export interface TripListResponse {
  items: TripSummary[];
  total: number;
}

// Standalone stop/activity endpoints (POST/PATCH /trips/{id}/stops,
// /stops/{id}/activities) return these flat shapes.
export interface ScheduledActivity {
  id: string;
  tripStopId: string;
  activityId: number | null;
  customName: string | null;
  scheduledDate: string;
  startTime: string | null;
  durationMinutes: number | null;
  costCents: number;
  sortOrder: number;
  notes: string | null;
}

export interface TripStop {
  id: string;
  tripId: string;
  cityId: number;
  cityName: string | null;
  arrivalDate: string;
  departureDate: string;
  sortOrder: number;
  stayCents: number;
  transportInCents: number;
  notes: string | null;
}

// GET /trips/{id} nests a slimmer shape (no tripId/tripStopId — implied by
// nesting) — TripStopBrief / StopActivityBrief in backend/app/modules/trips/schemas.py.
export interface ActivityBrief {
  id: string;
  activityId: number | null;
  customName: string | null;
  scheduledDate: string;
  startTime: string | null;
  durationMinutes: number | null;
  costCents: number;
  sortOrder: number;
  notes: string | null;
}

export interface StopBrief {
  id: string;
  cityId: number;
  cityName: string | null;
  arrivalDate: string;
  departureDate: string;
  sortOrder: number;
  stayCents: number;
  transportInCents: number;
  notes: string | null;
  activities: ActivityBrief[];
}

export interface TripDetail {
  id: string;
  userId: string;
  name: string;
  description: string | null;
  startDate: string;
  endDate: string;
  coverImagePath: string | null;
  visibility: TripVisibility;
  shareSlug: string | null;
  currencyCode: string;
  budgetCapCents: number | null;
  durationDays: number;
  copiedFromTripId: string | null;
  createdAt: string;
  updatedAt: string;
  stops: StopBrief[];
}

// POST /trips and PATCH /trips/{id} return this — no stops, no status
// (status/stopCount/totalCents only exist on TripSummary, from the list view).
export interface TripOut {
  id: string;
  userId: string;
  name: string;
  description: string | null;
  startDate: string;
  endDate: string;
  coverImagePath: string | null;
  visibility: TripVisibility;
  shareSlug: string | null;
  currencyCode: string;
  budgetCapCents: number | null;
  durationDays: number;
  copiedFromTripId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateTripPayload {
  name: string;
  description?: string;
  startDate: string;
  endDate: string;
  coverImagePath?: string;
  currencyCode?: string;
  budgetCapCents?: number;
}

export interface DashboardTrip {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  coverImagePath: string | null;
  status: TripStatus;
  stopCount: number;
  totalCents: number;
}

export interface DashboardCity {
  id: number;
  name: string;
  countryName: string;
  popularityScore: number;
  costIndex: number;
  imagePath: string | null;
}

export interface DashboardResponse {
  user: { id: string; fullName: string; email: string };
  recentTrips: DashboardTrip[];
  recommendedCities: DashboardCity[];
  budgetHighlight: { tripId: string; tripName: string; totalCents: number; budgetCapCents: number | null } | null;
}
