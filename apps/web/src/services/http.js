import { reactive } from 'vue';
import { authClient } from './authClient.js';

// Recordings/payments live under /api/v1; Better Auth is at /api/auth.
export const API_URL = import.meta.env.VITE_API_URL || '/api/v1';

export const authState = reactive({
  user: null,
  isAuthenticated: false,
  loading: true,
});

// Legacy bearer from the mobile ?token= handoff (Pricing). When set it's attached
// to /api/v1 calls; the API's requireUser accepts it alongside Better Auth cookies.
let legacyToken = null;
export const setLegacyToken = (t) => { legacyToken = t || null; };

export const setSession = (data) => {
  authState.user = data?.user ?? null;
  authState.isAuthenticated = !!data?.user;
};

export const refreshSession = async () => {
  try {
    const { data } = await authClient.getSession();
    setSession(data);
  } catch {
    setSession(null);
  }
};

export const initAuth = async () => {
  await refreshSession();
  authState.loading = false;
};

export const clearSession = async () => {
  try { await authClient.signOut(); } catch { /* ignore */ }
  setSession(null);
  legacyToken = null;
};

export const apiRequest = async (endpoint, options = {}) => {
  const headers = { 'Content-Type': 'application/json', ...options.headers };
  if (legacyToken) headers['Authorization'] = `Bearer ${legacyToken}`;

  const response = await fetch(`${API_URL}${endpoint}`, { ...options, headers, credentials: 'include' });
  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    const err = new Error(data.error || 'Request failed');
    err.status = response.status;
    err.code = data.code;
    throw err;
  }
  return data;
};
