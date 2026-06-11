// Public GET /api/plans — ported from backend/server.js (DB-backed pricing
// with hardcoded fallbacks).

import { Hono } from 'hono';
import { DEFAULT_FEATURES, DEFAULT_PRICES } from '@echobit/shared/plans';
import type { HonoEnv, PlanConfigRow } from '../types.ts';

const plans = new Hono<HonoEnv>();

const PLAN_KEYS = ['free', 'starter', 'pro', 'growth', 'team'] as const;

plans.get('/', async (c) => {
  try {
    const configs = await c.env.DB.prepare('SELECT * FROM plan_configs').all<PlanConfigRow>();
    const rows = configs.results ?? [];

    const result: Record<string, unknown> = {};
    for (const plan of PLAN_KEYS) {
      const found = rows.find((r) => r.plan === plan);
      const def = DEFAULT_PRICES[plan];
      result[plan] = {
        features: found ? JSON.parse(found.features) : DEFAULT_FEATURES[plan],
        monthlyPrice: found?.monthly_price || def.monthlyPrice,
        annualMonthly: found?.annual_monthly || def.annualMonthly,
        annualTotal: found?.annual_total || def.annualTotal,
        monthlyPaise: found?.monthly_paise || def.monthlyPaise,
        gates: found?.gates ? JSON.parse(found.gates) : {},
      };
    }
    return c.json(result);
  } catch {
    return c.json({ error: 'Failed to load plan features' }, 500);
  }
});

export default plans;
