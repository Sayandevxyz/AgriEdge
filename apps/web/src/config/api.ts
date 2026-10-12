/**
 * Centralized API URL resolution and authenticated fetch client.
 * Supports VITE_API_URL (e.g. Render backend URL: https://agriedge-api.onrender.com).
 * If unset, defaults to relative /api paths which are proxied by Vite or Vercel rewrites.
 */
export const API_BASE_URL: string = (
  import.meta.env.VITE_API_URL ||
  import.meta.env.VITE_API_BASE_URL ||
  ''
).replace(/\/$/, '');

export const apiUrl = (endpoint: string): string => {
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  return `${API_BASE_URL}${cleanEndpoint}`;
};

export class ApiError extends Error {
  status: number;
  data: any;
  constructor(message: string, status: number, data?: any) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.data = data;
  }
}

let isRefreshing = false;
let refreshPromise: Promise<string | null> | null = null;

async function performTokenRefresh(): Promise<string | null> {
  const refreshToken = localStorage.getItem('agriedge_refresh_token');
  if (!refreshToken) return null;

  try {
    const res = await fetch(apiUrl('/api/v1/auth/refresh'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refresh_token: refreshToken }),
    });

    if (res.ok) {
      const data = await res.json();
      if (data.access_token) {
        localStorage.setItem('agriedge_token', data.access_token);
        if (data.refresh_token) {
          localStorage.setItem('agriedge_refresh_token', data.refresh_token);
        }
        return data.access_token;
      }
    }
  } catch (err) {
    console.error('Token refresh request failed:', err);
  }
  return null;
}

/**
 * Robust fetch wrapper that:
 * 1. Attaches Bearer JWT token if user is authenticated
 * 2. Handles 401 by attempting a single refresh token exchange
 * 3. On refresh failure, clears credentials and redirects to /login
 * 4. Surfaces response errors cleanly
 */
export async function apiFetch(input: string, init: RequestInit = {}): Promise<Response> {
  const url = apiUrl(input);
  const headers = new Headers(init.headers || {});

  const token = localStorage.getItem('agriedge_token');
  if (token && !headers.has('Authorization')) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  if (init.body && typeof init.body === 'string' && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  let response = await fetch(url, { ...init, headers });

  if (response.status === 401) {
    if (
      !input.includes('/auth/login') &&
      !input.includes('/auth/refresh') &&
      !input.includes('/auth/register')
    ) {
      if (!isRefreshing) {
        isRefreshing = true;
        refreshPromise = performTokenRefresh().finally(() => {
          isRefreshing = false;
          refreshPromise = null;
        });
      }

      const newToken = await refreshPromise;
      if (newToken) {
        headers.set('Authorization', `Bearer ${newToken}`);
        response = await fetch(url, { ...init, headers });
        return response;
      } else {
        localStorage.removeItem('agriedge_token');
        localStorage.removeItem('agriedge_refresh_token');
        localStorage.removeItem('agriedge_user');
        if (typeof window !== 'undefined' && window.location.pathname !== '/login') {
          window.location.href = '/login';
        }
      }
    }
  }

  return response;
}
