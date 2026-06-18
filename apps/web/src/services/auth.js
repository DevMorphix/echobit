import { authClient } from './authClient.js';
import { API_URL, authState, refreshSession, clearSession, setSession, setLegacyToken } from './http.js';

const unwrap = (res) => {
  if (res?.error) {
    const err = new Error(res.error.message || 'Request failed');
    err.status = res.error.status;
    err.code = res.error.code;
    throw err;
  }
  return res?.data;
};

const captchaOpts = (token) => (token ? { headers: { 'x-captcha-response': token } } : undefined);

export const authApi = {
  async login(email, password) {
    authState.loading = true;
    try {
      const res = await authClient.signIn.email({ email, password });
      unwrap(res);
      await refreshSession();
      return res.data;
    } finally {
      authState.loading = false;
    }
  },

  async register(name, email, password, profile = {}, turnstileToken) {
    authState.loading = true;
    try {
      const res = await authClient.signUp.email({
        email,
        password,
        name,
        ...(profile.country ? { country: profile.country } : {}),
        ...(profile.profession ? { profession: profile.profession } : {}),
        ...(profile.preferredLanguage ? { preferredLanguage: profile.preferredLanguage } : {}),
        fetchOptions: captchaOpts(turnstileToken),
      });
      unwrap(res);
      await authClient.emailOtp.sendVerificationOtp({ email, type: 'email-verification' });
      return res.data;
    } finally {
      authState.loading = false;
    }
  },

  async sendVerification(email, turnstileToken) {
    return unwrap(await authClient.emailOtp.sendVerificationOtp({
      email,
      type: 'email-verification',
      fetchOptions: captchaOpts(turnstileToken),
    }));
  },

  async verifyEmail(email, otp) {
    const res = await authClient.emailOtp.verifyEmail({ email, otp });
    unwrap(res);
    await refreshSession();
    return res.data;
  },

  async forgotPassword(email, turnstileToken) {
    return unwrap(await authClient.emailOtp.requestPasswordReset({
      email,
      fetchOptions: captchaOpts(turnstileToken),
    }));
  },

  async resetPassword(email, otp, newPassword) {
    return unwrap(await authClient.emailOtp.resetPassword({ email, otp, password: newPassword }));
  },

  async googleLogin(idToken) {
    authState.loading = true;
    try {
      const res = await authClient.signIn.social({ provider: 'google', idToken: { token: idToken } });
      unwrap(res);
      await refreshSession();
      return res.data;
    } finally {
      authState.loading = false;
    }
  },

  // Mobile ?token= handoff: verify the legacy JWT, attach it to /api/v1 calls,
  // and populate authState so the checkout flow works during the transition.
  async loginWithToken(token) {
    try {
      const response = await fetch(`${API_URL}/auth/me`, { headers: { Authorization: `Bearer ${token}` } });
      if (!response.ok) return false;
      const data = await response.json();
      setLegacyToken(token);
      setSession({ user: data.user });
      return true;
    } catch {
      return false;
    }
  },

  logout() {
    return clearSession();
  },
};
