// Barrel re-export — keeps existing `import { ... } from '../api'` paths
// working while the implementation lives in src/services/.

export { authState, initAuth, API_URL } from '../services/http.js';
export { authApi } from '../services/auth.js';
export { recordingsApi } from '../services/recordings.js';
export { meetingsApi } from '../services/meetings.js';
export { paymentsApi, plansApi } from '../services/payments.js';
export { adminApi, couponsApi } from '../services/admin.js';
