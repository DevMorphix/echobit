// D1-backed effective limits: base PLAN_LIMITS → plan_configs.gates (admin) →
// user.featureOverrides. Mirrors backend/utils/planLimits.js getEffectiveLimits.

import {
  getActivePlan,
  mergeEffectiveLimits,
  type PlanGates,
  type PlanLimits,
  type FeatureOverrides,
} from '@echobit/shared/plan-limits';
import type { Env, UserRow } from '../types.ts';

export interface UserPlanView {
  plan: string;
  planExpiresAt: string | null;
  featureOverrides: FeatureOverrides | null;
}

export const userPlanView = (row: UserRow): UserPlanView => {
  let overrides: FeatureOverrides | null = null;
  try {
    overrides = JSON.parse(row.feature_overrides) as FeatureOverrides;
  } catch {
    overrides = null;
  }
  return { plan: row.plan, planExpiresAt: row.plan_expires_at, featureOverrides: overrides };
};

export const getEffectiveLimits = async (env: Env, user: UserPlanView): Promise<PlanLimits> => {
  const plan = getActivePlan(user);
  let gates: PlanGates | null = null;
  try {
    const row = await env.DB.prepare('SELECT gates FROM plan_configs WHERE plan = ?')
      .bind(plan)
      .first<{ gates: string }>();
    if (row?.gates) gates = JSON.parse(row.gates) as PlanGates;
  } catch {
    // DB unavailable — keep hardcoded defaults
  }
  return mergeEffectiveLimits(user, gates);
};
