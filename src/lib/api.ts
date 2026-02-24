const explicitApiBase = (import.meta.env.VITE_API_BASE_URL as string | undefined)?.trim() || '';
const devFallbackBase = import.meta.env.DEV ? 'http://localhost:4000' : '';
const rawApiBaseUrl = explicitApiBase || devFallbackBase;

// Keep empty base URL for local same-origin/API-proxy style setups.
export const API_BASE_URL = rawApiBaseUrl.replace(/\/+$/, '');

export function apiUrl(path: string): string {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  return `${API_BASE_URL}${normalizedPath}`;
}
