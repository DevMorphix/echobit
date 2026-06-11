import { createRouter, createWebHistory } from 'vue-router'
import { authState, initAuth } from '../api'

// Canonical site origin for SEO meta (override per environment via VITE_SITE_URL)
const BASE = import.meta.env.VITE_SITE_URL || 'https://echobits.xyz'

// All routes are lazy-loaded so each view (and its dependencies) is its own chunk.
const routes = [
  {
    path: '/',
    name: 'Welcome',
    component: () => import('../views/Welcome.vue'),
    meta: {
      title: 'Echobit – AI Meeting Recorder & Transcriber',
      description: 'Record, transcribe and summarize your meetings automatically with AI. Supports 15+ Indian languages. Free plan available.',
      canonical: BASE + '/',
    },
  },
  {
    path: '/delete-account',
    name: 'DeleteAccount',
    component: () => import('../views/DeleteAccount.vue'),
    meta: { requiresAuth: true },
  },
  {
    path: '/contact',
    name: 'ContactUs',
    component: () => import('../views/ContactUs.vue'),
    meta: {
      title: 'Contact Us – Echobit',
      description: 'Get in touch with the Echobit team. We are here to help with any questions about our AI meeting recorder.',
      canonical: BASE + '/contact',
    },
  },
  {
    path: '/request-deletion',
    name: 'RequestDeletion',
    component: () => import('../views/RequestDeletion.vue'),
  },
  {
    path: '/privacy-policy',
    name: 'PrivacyPolicy',
    component: () => import('../views/PrivacyPolicy.vue'),
    meta: {
      title: 'Privacy Policy – Echobit',
      description: 'Read the Echobit privacy policy. Learn how we handle your meeting recordings, transcriptions, and personal data.',
      canonical: BASE + '/privacy-policy',
    },
  },
  {
    path: '/pricing',
    name: 'Pricing',
    component: () => import('../views/Pricing.vue'),
    meta: {
      title: 'Pricing – Echobit AI Meeting Recorder',
      description: 'Simple, transparent pricing for Echobit. Start free, upgrade when you need more. Pro plans from ₹499/month.',
      canonical: BASE + '/pricing',
    },
  },
  {
    path: '/admin',
    name: 'AdminPanel',
    component: () => import('../views/AdminPanel.vue'),
    meta: { requiresAuth: true, requiresAdmin: true },
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
    meta: { guest: true, title: 'Get Started Free – Echobit', description: 'Create your free Echobit account. No credit card required.' },
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
      {
        path: '',
        name: 'DashboardHome',
        component: () => import('../views/DashboardHome.vue'),
      },
      {
        path: 'record',
        name: 'NewRecording',
        component: () => import('../views/NewRecording.vue'),
      },
      {
        path: 'recordings',
        name: 'RecordingsList',
        component: () => import('../views/RecordingsList.vue'),
      },
      {
        path: 'recordings/:id',
        name: 'RecordingDetail',
        component: () => import('../views/RecordingDetail.vue'),
      },
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
  const requiresAdmin = to.matched.some(record => record.meta.requiresAdmin)
  const isGuestRoute = to.matched.some(record => record.meta.guest)

  if (requiresAuth && !authState.isAuthenticated) {
    next('/login')
  } else if (requiresAdmin && authState.user?.role !== 'admin') {
    next('/dashboard')
  } else if (isGuestRoute && authState.isAuthenticated) {
    next('/dashboard')
  } else {
    next()
  }
})

const DEFAULT_TITLE = 'Echobit – AI Meeting Recorder & Transcriber'
const DEFAULT_DESC  = 'Record, transcribe and summarize your meetings automatically with AI. Supports 15+ Indian languages. Free plan available.'

router.afterEach((to) => {
  const title = to.meta?.title || DEFAULT_TITLE
  const desc  = to.meta?.description || DEFAULT_DESC
  const canonical = to.meta?.canonical || (BASE + to.path)

  document.title = title

  const set = (selector, attr, value) => {
    const el = document.querySelector(selector)
    if (el) el.setAttribute(attr, value)
  }
  set('meta[name="description"]', 'content', desc)
  set('meta[property="og:title"]', 'content', title)
  set('meta[property="og:description"]', 'content', desc)
  set('meta[property="og:url"]', 'content', canonical)
  set('link[rel="canonical"]', 'href', canonical)
})

export default router
