/**
 * Centralized API URL resolution for local and production deployments.
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
