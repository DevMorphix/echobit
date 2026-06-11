import { API_URL, apiRequest, authState, clearSession, storeSession, TOKEN_EXPIRY_MS } from './http.js';

export const authApi = {
  async login(email, password) {
    authState.loading = true;
    try {
      const data = await apiRequest('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      });
      storeSession(data);
      return data;
    } finally {
      authState.loading = false;
    }
  },

  async register(name, email, password, profile = {}) {
    authState.loading = true;
    try {
      return await apiRequest('/auth/register', {
        method: 'POST',
        body: JSON.stringify({ name, email, password, ...profile }),
      });
    } finally {
      authState.loading = false;
    }
  },

  async sendVerification(email) {
    return apiRequest('/auth/send-verification', {
      method: 'POST',
      body: JSON.stringify({ email }),
    });
  },

  async verifyEmail(email, otp) {
    const data = await apiRequest('/auth/verify-email', {
      method: 'POST',
      body: JSON.stringify({ email, otp }),
    });
    storeSession(data);
    return data;
  },

  async forgotPassword(email) {
    return apiRequest('/auth/forgot-password', {
      method: 'POST',
      body: JSON.stringify({ email }),
    });
  },

  async resetPassword(email, otp, newPassword) {
    return apiRequest('/auth/reset-password', {
      method: 'POST',
      body: JSON.stringify({ email, otp, newPassword }),
    });
  },

  async googleLogin(idToken) {
    authState.loading = true;
    try {
      const data = await apiRequest('/auth/google', {
        method: 'POST',
        body: JSON.stringify({ idToken }),
      });
      storeSession(data);
      return data;
    } finally {
      authState.loading = false;
    }
  },

  // Auto-login using a JWT passed from the mobile app via URL param (?token=...)
  async loginWithToken(token) {
    try {
      const response = await fetch(`${API_URL}/auth/me`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) return false;
      const data = await response.json();
      storeSession({ token, user: data.user, expiresAt: Date.now() + TOKEN_EXPIRY_MS });
      return true;
    } catch {
      return false;
    }
  },

  logout() {
    clearSession();
  },
};
