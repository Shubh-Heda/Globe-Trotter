import { useSessionStore } from '../stores/session';

export interface ApiErrorDetail {
  field: string;
  issue: string;
}

export interface ApiErrorBody {
  error: { code: string; message: string; details: ApiErrorDetail[] };
  requestId: string;
}

export class ApiError extends Error {
  code: string;
  status: number;
  details: ApiErrorDetail[];

  constructor(status: number, body: ApiErrorBody) {
    super(body.error.message);
    this.code = body.error.code;
    this.status = status;
    this.details = body.error.details ?? [];
  }
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const token = useSessionStore.getState().token;
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(init.headers as Record<string, string> | undefined),
  };
  if (token) headers.Authorization = `Bearer ${token}`;

  const response = await fetch(`/api/v1${path}`, { ...init, headers });

  if (response.status === 204) return undefined as T;

  const body = await response.json().catch(() => ({}));

  if (!response.ok) {
    if (response.status === 401) {
      // Session expired/invalid — clear it so PrivateRoute bounces to /login
      // instead of the app sitting on a dead token retrying forever.
      useSessionStore.getState().clearSession();
    }
    throw new ApiError(response.status, body as ApiErrorBody);
  }

  return body as T;
}

export const api = {
  get: <T>(path: string) => request<T>(path),
  post: <T>(path: string, body?: unknown) =>
    request<T>(path, { method: 'POST', body: body !== undefined ? JSON.stringify(body) : undefined }),
  patch: <T>(path: string, body?: unknown) =>
    request<T>(path, { method: 'PATCH', body: body !== undefined ? JSON.stringify(body) : undefined }),
  put: <T>(path: string, body?: unknown) =>
    request<T>(path, { method: 'PUT', body: body !== undefined ? JSON.stringify(body) : undefined }),
  delete: <T>(path: string) => request<T>(path, { method: 'DELETE' }),
};

/** Format integer cents as a display string. Never do arithmetic on the result. */
export function formatMoney(cents: number, currencyCode = 'INR'): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: currencyCode,
    maximumFractionDigits: 0,
  }).format(cents / 100);
}
