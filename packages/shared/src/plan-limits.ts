// Ported verbatim from backend/utils/planLimits.js — the 3-tier gating system:
// PLAN_LIMITS (base) → plan_configs.gates (admin, plan-wide) → user.featureOverrides (per-user).

export interface PlanLimits {
  recordingsPerMonth: number | null; // null = unlimited
  maxDurationSecs: number;
  maxStorageBytes: number;
  languageTier: 'basic_indian' | 'extended' | 'full';
  indianLanguages: boolean;
  meetingMinutes: boolean;
  actionItems: boolean;
  pdfExport: boolean;
  priorityProcessing: boolean;
}

export type PlanKey = 'free' | 'starter' | 'pro' | 'growth' | 'team';

export const PLAN_LIMITS: Record<PlanKey, PlanLimits> = {
  free: {
    recordingsPerMonth: 3,
    maxDurationSecs: 1200, // 20 min
    maxStorageBytes: 1_073_741_824, // 1 GB
    languageTier: 'basic_indian', // English + Malayalam
    indianLanguages: true,
    meetingMinutes: false,
    actionItems: false,
    pdfExport: false,
    priorityProcessing: false,
  },
  starter: {
    recordingsPerMonth: 15,
    maxDurationSecs: 2700, // 45 min
    maxStorageBytes: 3_221_225_472, // 3 GB
    languageTier: 'basic_indian', // English + Hindi + Malayalam
    indianLanguages: true,
    meetingMinutes: false,
    actionItems: false,
    pdfExport: false,
    priorityProcessing: false,
  },
  pro: {
    recordingsPerMonth: 40,
    maxDurationSecs: 7200, // 2 hours
    maxStorageBytes: 10_737_418_240, // 10 GB
    languageTier: 'extended', // 15+ languages
    indianLanguages: true,
    meetingMinutes: true,
    actionItems: true,
    pdfExport: true,
    priorityProcessing: true,
  },
  growth: {
    recordingsPerMonth: null, // unlimited
    maxDurationSecs: 10_800, // 3 hours
    maxStorageBytes: 26_843_545_600, // 25 GB
    languageTier: 'full', // 20+ languages
    indianLanguages: true,
    meetingMinutes: true,
    actionItems: true,
    pdfExport: true,
    priorityProcessing: true,
  },
  // kept for existing users; no longer sold
  team: {
    recordingsPerMonth: null,
    maxDurationSecs: 10_800,
    maxStorageBytes: 53_687_091_200, // 50 GB
    languageTier: 'full',
    indianLanguages: true,
    meetingMinutes: true,
    actionItems: true,
    pdfExport: true,
    priorityProcessing: true,
  },
};

export interface PlanGates {
  meetingMinutes?: boolean | null;
  actionItems?: boolean | null;
  pdfExport?: boolean | null;
  indianLanguages?: boolean | null;
  recordingsPerMonth?: number | null; // null = plan default; 0 = unlimited
  maxDurationMins?: number | null;
  maxStorageGB?: number | null;
}

export interface FeatureOverrides {
  meetingMinutes?: boolean | null;
  actionItems?: boolean | null;
  pdfExport?: boolean | null;
  indianLanguages?: boolean | null;
}

export interface PlanUserLike {
  plan?: string | null;
  planExpiresAt?: string | Date | null;
  featureOverrides?: FeatureOverrides | null;
}

/** Returns the user's currently active plan key, falling back to 'free' if expired. */
export const getActivePlan = (user: PlanUserLike | null | undefined): PlanKey => {
  if (!user?.plan || user.plan === 'free') return 'free';
  if (!user.planExpiresAt || new Date(user.planExpiresAt) < new Date()) return 'free';
  return (user.plan in PLAN_LIMITS ? user.plan : 'free') as PlanKey;
};

export const getPlanLimits = (user: PlanUserLike | null | undefined): PlanLimits =>
  PLAN_LIMITS[getActivePlan(user)] ?? PLAN_LIMITS.free;

/**
 * Merges base plan limits with admin plan-wide gates (tier 2) and per-user
 * featureOverrides (tier 3). The caller supplies the gates (from D1) so this
 * stays a pure function.
 */
export const mergeEffectiveLimits = (
  user: PlanUserLike | null | undefined,
  gates: PlanGates | null | undefined,
): PlanLimits => {
  const base = getPlanLimits(user);
  let limits = base;

  if (gates) {
    limits = {
      ...base,
      meetingMinutes: gates.meetingMinutes ?? base.meetingMinutes,
      actionItems: gates.actionItems ?? base.actionItems,
      pdfExport: gates.pdfExport ?? base.pdfExport,
      indianLanguages: gates.indianLanguages ?? base.indianLanguages,
      recordingsPerMonth:
        gates.recordingsPerMonth != null
          ? gates.recordingsPerMonth === 0
            ? null
            : gates.recordingsPerMonth
          : base.recordingsPerMonth,
      maxDurationSecs:
        gates.maxDurationMins != null ? gates.maxDurationMins * 60 : base.maxDurationSecs,
      maxStorageBytes:
        gates.maxStorageGB != null ? gates.maxStorageGB * 1_073_741_824 : base.maxStorageBytes,
    };
  }

  const ov = user?.featureOverrides;
  if (ov) {
    if (ov.meetingMinutes != null) limits = { ...limits, meetingMinutes: ov.meetingMinutes };
    if (ov.actionItems != null) limits = { ...limits, actionItems: ov.actionItems };
    if (ov.pdfExport != null) limits = { ...limits, pdfExport: ov.pdfExport };
    if (ov.indianLanguages != null) limits = { ...limits, indianLanguages: ov.indianLanguages };
  }

  return limits;
};
