// Plan pricing/features constants shared by API and (eventually) web.
// DEFAULT_PRICES / DEFAULT_FEATURES ported from backend/server.js;
// PAYMENT_PLANS ported from backend/routes/payments.js.

export const DEFAULT_PRICES = {
  free:    { monthlyPrice: '₹0',   annualMonthly: '₹0',   annualTotal: '₹0',     monthlyPaise: 0 },
  starter: { monthlyPrice: '₹149', annualMonthly: '₹99',  annualTotal: '₹1,188', monthlyPaise: 14900 },
  pro:     { monthlyPrice: '₹499', annualMonthly: '₹399', annualTotal: '₹4,788', monthlyPaise: 49900 },
  growth:  { monthlyPrice: '₹999', annualMonthly: '₹799', annualTotal: '₹9,588', monthlyPaise: 99900 },
  team:    { monthlyPrice: '₹799', annualMonthly: '₹599', annualTotal: '₹7,188', monthlyPaise: 79900 },
} as const;

export interface PlanFeature {
  text: string;
  included: boolean;
}

export const DEFAULT_FEATURES: Record<keyof typeof DEFAULT_PRICES, PlanFeature[]> = {
  free: [
    { text: '3 recordings / month', included: true },
    { text: 'AI transcription (English + Malayalam)', included: true },
    { text: 'Basic AI summary', included: true },
    { text: 'AI notes', included: false },
    { text: 'PDF export', included: false },
    { text: 'Meeting minutes', included: false },
  ],
  starter: [
    { text: '15 recordings / month', included: true },
    { text: 'AI transcription (English + Hindi + Malayalam)', included: true },
    { text: 'AI summary + notes', included: true },
    { text: 'PDF export', included: false },
    { text: 'Meeting minutes', included: false },
    { text: 'Priority processing', included: false },
  ],
  pro: [
    { text: '40 recordings / month', included: true },
    { text: 'AI transcription (15+ languages)', included: true },
    { text: 'AI summary + meeting minutes', included: true },
    { text: 'Action item extraction', included: true },
    { text: 'Auto-record Google Meet calls (10 hrs/mo)', included: true },
    { text: 'PDF export', included: true },
  ],
  growth: [
    { text: 'Unlimited recordings', included: true },
    { text: 'AI transcription (20+ languages)', included: true },
    { text: 'Everything in Pro', included: true },
    { text: 'Auto-record Google Meet calls (25 hrs/mo)', included: true },
    { text: 'Priority processing + support', included: true },
    { text: '25 GB storage', included: true },
  ],
  team: [
    { text: 'Unlimited recordings', included: true },
    { text: 'All 11 Indian languages', included: true },
    { text: 'AI summaries + meeting minutes', included: true },
    { text: 'PDF export', included: true },
    { text: 'Team workspace', included: true },
    { text: 'Priority support', included: true },
  ],
};

export interface PaymentPlan {
  amount: number; // paise
  currency: 'INR';
  description: string;
  tier: 'starter' | 'pro' | 'growth';
  cycle: 'monthly' | 'annual';
  days: number;
}

export const PAYMENT_PLANS: Record<string, PaymentPlan> = {
  starter_monthly: { amount:  14900, currency: 'INR', description: 'Echobit Starter – Monthly', tier: 'starter', cycle: 'monthly', days: 30 },
  starter_annual:  { amount: 118800, currency: 'INR', description: 'Echobit Starter – Annual',  tier: 'starter', cycle: 'annual',  days: 365 },
  pro_monthly:     { amount:  49900, currency: 'INR', description: 'Echobit Pro – Monthly',     tier: 'pro',     cycle: 'monthly', days: 30 },
  pro_annual:      { amount: 478800, currency: 'INR', description: 'Echobit Pro – Annual',      tier: 'pro',     cycle: 'annual',  days: 365 },
  growth_monthly:  { amount:  99900, currency: 'INR', description: 'Echobit Growth – Monthly',  tier: 'growth',  cycle: 'monthly', days: 30 },
  growth_annual:   { amount: 958800, currency: 'INR', description: 'Echobit Growth – Annual',   tier: 'growth',  cycle: 'annual',  days: 365 },
};
