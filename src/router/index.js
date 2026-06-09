import { createRouter, createWebHistory } from 'vue-router'
import { authState, initAuth } from '../api'
import Welcome from '../views/Welcome.vue'
import Login from '../views/Login.vue'
import Register from '../views/Register.vue'
import Dashboard from '../views/Dashboard.vue'
import DashboardHome from '../views/DashboardHome.vue'
import NewRecording from '../views/NewRecording.vue'
import RecordingsList from '../views/RecordingsList.vue'
import RecordingDetail from '../views/RecordingDetail.vue'
import DeleteAccount from '../views/DeleteAccount.vue'
import PrivacyPolicy from '../views/PrivacyPolicy.vue'
import AdminPanel from '../views/AdminPanel.vue'
import ContactUs from '../views/ContactUs.vue'
import RequestDeletion from '../views/RequestDeletion.vue'
import Pricing from '../views/Pricing.vue'
import VerifyEmail from '../views/VerifyEmail.vue'
import ForgotPassword from '../views/ForgotPassword.vue'

const BASE = 'https://echobits.devmorphix.com'

const routes = [
  {
    path: '/',
    name: 'Welcome',
    component: Welcome,
    meta: {
      title: 'Echobit – AI Meeting Recorder & Transcriber',
      description: 'Record, transcribe and summarize your meetings automatically with AI. Supports 15+ Indian languages. Free plan available.',
      canonical: BASE + '/',
    },
  },
  {
    path: '/delete-account',
    name: 'DeleteAccount',
    component: DeleteAccount,
    meta: { requiresAuth: true },
  },
  {
    path: '/contact',
    name: 'ContactUs',
    component: ContactUs,
    meta: {
      title: 'Contact Us – Echobit',
      description: 'Get in touch with the Echobit team. We are here to help with any questions about our AI meeting recorder.',
      canonical: BASE + '/contact',
    },
  },
  {
    path: '/request-deletion',
    name: 'RequestDeletion',
    component: RequestDeletion,
  },
  {
    path: '/privacy-policy',
    name: 'PrivacyPolicy',
    component: PrivacyPolicy,
    meta: {
      title: 'Privacy Policy – Echobit',
      description: 'Read the Echobit privacy policy. Learn how we handle your meeting recordings, transcriptions, and personal data.',
      canonical: BASE + '/privacy-policy',
    },
  },
  {
    path: '/pricing',
    name: 'Pricing',
    component: Pricing,
    meta: {
      title: 'Pricing – Echobit AI Meeting Recorder',
      description: 'Simple, transparent pricing for Echobit. Start free, upgrade when you need more. Pro plans from ₹499/month.',
      canonical: BASE + '/pricing',
    },
  },
  {
    path: '/admin',
    name: 'AdminPanel',
    component: AdminPanel,
    meta: { requiresAuth: true, requiresAdmin: true },
  },
  {
    path: '/login',
    name: 'Login',
    component: Login,
    meta: { guest: true, title: 'Sign In – Echobit' },
  },
  {
    path: '/register',
    name: 'Register',
    component: Register,
    meta: { guest: true, title: 'Get Started Free – Echobit', description: 'Create your free Echobit account. No credit card required.' },
  },
  {
    path: '/verify-email',
    name: 'VerifyEmail',
    component: VerifyEmail,
    meta: { guest: true },
  },
  {
    path: '/forgot-password',
    name: 'ForgotPassword',
    component: ForgotPassword,
    meta: { guest: true, title: 'Reset Password – Echobit' },
  },
  {
    path: '/dashboard',
    component: Dashboard,
    meta: { requiresAuth: true },
    children: [
      {
        path: '',
        name: 'DashboardHome',
        component: DashboardHome
      },
      {
        path: 'record',
        name: 'NewRecording',
        component: NewRecording
      },
      {
        path: 'recordings',
        name: 'RecordingsList',
        component: RecordingsList
      },
      {
        path: 'recordings/:id',
        name: 'RecordingDetail',
        component: RecordingDetail
      }
    ]
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes
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

  let metaDesc = document.querySelector('meta[name="description"]')
  if (metaDesc) metaDesc.setAttribute('content', desc)

  let metaOgTitle = document.querySelector('meta[property="og:title"]')
  if (metaOgTitle) metaOgTitle.setAttribute('content', title)

  let metaOgDesc = document.querySelector('meta[property="og:description"]')
  if (metaOgDesc) metaOgDesc.setAttribute('content', desc)

  let metaOgUrl = document.querySelector('meta[property="og:url"]')
  if (metaOgUrl) metaOgUrl.setAttribute('content', canonical)

  let linkCanonical = document.querySelector('link[rel="canonical"]')
  if (linkCanonical) linkCanonical.setAttribute('href', canonical)
})

export default router
