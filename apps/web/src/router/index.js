import { createRouter, createWebHistory } from 'vue-router'
import { authState, initAuth } from '../api'

// Product app only. The marketing pages (/, /pricing, /contact, /privacy-policy,
// /request-deletion) live in the Astro promo site (apps/promo) and are served
// statically by the Worker — they are NOT routes here. This SPA is served (as a
// shell) only for the app routes below; the app is noindex.
const routes = [
  // `/` is the marketing home (Astro). If the SPA ever receives `/` (dev, or a
  // stray client nav), bounce into the app; the guard sends guests to /login.
  { path: '/', redirect: '/dashboard' },
  {
    path: '/delete-account',
    name: 'DeleteAccount',
    component: () => import('../views/DeleteAccount.vue'),
    meta: { requiresAuth: true },
  },
  {
    // Interactive checkout (Razorpay). The public pricing teaser is the Astro
    // page at /pricing; this is the in-app upgrade flow.
    path: '/upgrade',
    name: 'Upgrade',
    component: () => import('../views/Pricing.vue'),
    meta: { title: 'Upgrade – Echobit' },
  },
  {
    path: '/admin',
    name: 'AdminPanel',
    // Authorization is enforced by Cloudflare Access at the edge (and on every
    // /api/v1/admin/* call), not an in-app role. requiresAuth just ensures the
    // app session is initialized for the panel UI.
    component: () => import('../views/AdminPanel.vue'),
    meta: { requiresAuth: true },
  },
  {
    path: '/login',
    name: 'Login',
    component: () => import('../views/Login.vue'),
    meta: { guest: true, title: 'Sign In – Echobit' },
  },
  {
    path: '/register',
    name: 'Register',
    component: () => import('../views/Register.vue'),
    meta: { guest: true, title: 'Get Started Free – Echobit' },
  },
  {
    path: '/verify-email',
    name: 'VerifyEmail',
    component: () => import('../views/VerifyEmail.vue'),
    meta: { guest: true },
  },
  {
    path: '/forgot-password',
    name: 'ForgotPassword',
    component: () => import('../views/ForgotPassword.vue'),
    meta: { guest: true, title: 'Reset Password – Echobit' },
  },
  {
    path: '/dashboard',
    component: () => import('../views/Dashboard.vue'),
    meta: { requiresAuth: true },
    children: [
      { path: '', name: 'DashboardHome', component: () => import('../views/DashboardHome.vue') },
      { path: 'record', name: 'NewRecording', component: () => import('../views/NewRecording.vue') },
      { path: 'recordings', name: 'RecordingsList', component: () => import('../views/RecordingsList.vue') },
      { path: 'recordings/:id', name: 'RecordingDetail', component: () => import('../views/RecordingDetail.vue') },
    ],
  },
]

const router = createRouter({
  history: createWebHistory(),
  routes,
})

// Initialize auth state
initAuth()

// Navigation guards
router.beforeEach((to, from, next) => {
  const requiresAuth = to.matched.some(record => record.meta.requiresAuth)
  const isGuestRoute = to.matched.some(record => record.meta.guest)

  if (requiresAuth && !authState.isAuthenticated) {
    next('/login')
  } else if (isGuestRoute && authState.isAuthenticated) {
    next('/dashboard')
  } else {
    next()
  }
})

router.afterEach((to) => {
  document.title = to.meta?.title || 'Echobit'
})

export default router
