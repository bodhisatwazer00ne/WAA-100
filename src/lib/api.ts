const explicitApiBase = (import.meta.env.VITE_API_BASE_URL as string | undefined)?.trim() || '';
const devFallbackBase = import.meta.env.DEV ? 'http://localhost:4000' : '';
const rawApiBaseUrl = explicitApiBase || devFallbackBase;
const AUTH_TOKEN_STORAGE_KEY = 'waa100_auth_token_v1';

// Keep empty base URL for local same-origin/API-proxy style setups.
export const API_BASE_URL = rawApiBaseUrl.replace(/\/+$/, '');

export function apiUrl(path: string): string {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  return `${API_BASE_URL}${normalizedPath}`;
}

export function getAuthToken(): string {
  if (typeof window === 'undefined') return '';
  return window.localStorage.getItem(AUTH_TOKEN_STORAGE_KEY) ?? '';
}

export function setAuthToken(token: string) {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(AUTH_TOKEN_STORAGE_KEY, token);
}

export function clearAuthToken() {
  if (typeof window === 'undefined') return;
  window.localStorage.removeItem(AUTH_TOKEN_STORAGE_KEY);
}

export async function apiRequest<T>(
  path: string,
  init: RequestInit = {},
  options: { withAuth?: boolean } = { withAuth: true },
): Promise<T> {
  const headers = new Headers(init.headers ?? {});
  if (!headers.has('Content-Type') && init.body !== undefined) {
    headers.set('Content-Type', 'application/json');
  }

  if (options.withAuth !== false) {
    const token = getAuthToken();
    if (token) headers.set('Authorization', `Bearer ${token}`);
  }

  const response = await fetch(apiUrl(path), { ...init, headers });
  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || `Request failed (${response.status})`);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return (await response.json()) as T;
}
