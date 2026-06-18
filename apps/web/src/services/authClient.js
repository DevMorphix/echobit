import { createAuthClient } from 'better-auth/vue';
import { emailOTPClient } from 'better-auth/client/plugins';

export const authClient = createAuthClient({
  baseURL: `${window.location.origin}/api/auth`,
  fetchOptions: { credentials: 'include' },
  plugins: [emailOTPClient()],
});
