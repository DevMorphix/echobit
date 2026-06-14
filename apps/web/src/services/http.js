import { reactive } from 'vue';

// Same-origin by default — the Worker serves both the SPA and /api.
// VITE_API_URL overrides for local dev against a remote backend.
export const API_URL = import.meta.env.VITE_API_URL || '/api/v1';

// Fallback expiry used only when the server doesn't return expiresAt.
// Backend issues 7-day tokens; this constant is just the safety fallback.
export const TOKEN_EXPIRY_MS = 7 * 24 * 60 * 60 * 1000;

const isTokenExpired = () => {
  const expiresAt = localStorage.getItem('tokenExpiresAt');
  if (!expiresAt) return true;
  return Date.now() >= parseInt(expiresAt, 10);
};

// Auth state — single reactive source of truth for the whole app
export const authState = reactive({
  user: null,
  token: localStorage.getItem('token'),
  isAuthenticated: !!localStorage.getItem('token') && !isTokenExpired(),
  loading: false,
});

export const initAuth = () => {
  const token = localStorage.getItem('token');
  const user = localStorage.getItem('user');

  if (token && user && !isTokenExpired()) {
    authState.token = token;
    authState.user = JSON.parse(user);
    authState.isAuthenticated = true;
  } else if (token) {
    clearSession();
  }
};

export const storeSession = (data) => {
  authState.token = data.token;
  authState.user = data.user;
  authState.isAuthenticated = true;
  localStorage.setItem('token', data.token);
  localStorage.setItem('user', JSON.stringify(data.user));
  const expiresAt = data.expiresAt || Date.now() + TOKEN_EXPIRY_MS;
  localStorage.setItem('tokenExpiresAt', expiresAt.toString());
};

export const clearSession = () => {
  authState.token = null;
  authState.user = null;
  authState.isAuthenticated = false;
  localStorage.removeItem('token');
  localStorage.removeItem('user');
  localStorage.removeItem('tokenExpiresAt');
};

export const apiRequest = async (endpoint, options = {}) => {
  const headers = {
    'Content-Type': 'application/json',
    ...options.headers,
  };

  if (authState.token) {
    headers['Authorization'] = `Bearer ${authState.token}`;
  }

  const response = await fetch(`${API_URL}${endpoint}`, {
    ...options,
    headers,
  });

  const data = await response.json();

  if (!response.ok) {
    const err = new Error(data.error || 'Request failed');
    err.status = response.status;
    err.code = data.code;
    throw err;
  }

  return data;
};
