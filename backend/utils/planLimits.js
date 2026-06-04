export const PLAN_LIMITS = {
  free: {
    recordingsPerMonth: 3,
    maxDurationSecs: 1200,            // 20 min
    maxStorageBytes: 1_073_741_824,   // 1 GB
    languageTier: 'basic_indian',     // English + Malayalam
    indianLanguages: true,            // includes Malayalam via Sarvam
    meetingMinutes: false,
    actionItems: false,
    pdfExport: false,
    priorityProcessing: false,
  },
  starter: {
    recordingsPerMonth: 15,
    maxDurationSecs: 2700,            // 45 min
    maxStorageBytes: 3_221_225_472,   // 3 GB
    languageTier: 'basic_indian',     // English + Hindi + Malayalam
    indianLanguages: true,
    meetingMinutes: false,
    actionItems: false,
    pdfExport: false,
    priorityProcessing: false,
  },
  pro: {
    recordingsPerMonth: 40,
    maxDurationSecs: 7200,            // 2 hours
    maxStorageBytes: 10_737_418_240,  // 10 GB
    languageTier: 'extended',         // 15+ languages
    indianLanguages: true,
    meetingMinutes: true,
    actionItems: true,
    pdfExport: true,
    priorityProcessing: true,
  },
  growth: {
    recordingsPerMonth: null,         // unlimited
    maxDurationSecs: 10_800,          // 3 hours
    maxStorageBytes: 26_843_545_600,  // 25 GB
    languageTier: 'full',             // 20+ languages
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
    maxStorageBytes: 53_687_091_200,  // 50 GB
    languageTier: 'full',
    indianLanguages: true,
    meetingMinutes: true,
    actionItems: true,
    pdfExport: true,
    priorityProcessing: true,
  },
};

/** Returns the user's currently active plan key, falling back to 'free' if expired. */
export const getActivePlan = (user) => {
  if (!user?.plan || user.plan === 'free') return 'free';
  if (!user.planExpiresAt || new Date(user.planExpiresAt) < new Date()) return 'free';
  return user.plan;
};

export const getPlanLimits = (user) => PLAN_LIMITS[getActivePlan(user)] ?? PLAN_LIMITS.free;

/**
 * Like getPlanLimits but merges admin-configured gate overrides from the DB.
 * Use this in routes that gate Pro/paid features (minutes, actions, etc.).
 */
export const getEffectiveLimits = async (user) => {
  const base = getPlanLimits(user);
  const plan = getActivePlan(user);
  try {
    const PlanConfig = (await import('../models/PlanConfig.js')).default;
    const cfg = await PlanConfig.findOne({ plan }).select('gates').lean();
    if (!cfg?.gates) return base;
    const g = cfg.gates;
    return {
      ...base,
      meetingMinutes:    g.meetingMinutes    ?? base.meetingMinutes,
      actionItems:       g.actionItems       ?? base.actionItems,
      pdfExport:         g.pdfExport         ?? base.pdfExport,
      indianLanguages:   g.indianLanguages   ?? base.indianLanguages,
      // 0 means unlimited for recordings; null means use plan default
      recordingsPerMonth: g.recordingsPerMonth != null
        ? (g.recordingsPerMonth === 0 ? null : g.recordingsPerMonth)
        : base.recordingsPerMonth,
      // convert admin minutes → seconds; null means use plan default
      maxDurationSecs: g.maxDurationMins != null
        ? g.maxDurationMins * 60
        : base.maxDurationSecs,
      // convert admin GB → bytes; null means use plan default
      maxStorageBytes: g.maxStorageGB != null
        ? g.maxStorageGB * 1_073_741_824
        : base.maxStorageBytes,
    };
  } catch {
    return base; // DB unavailable — fall back to hardcoded defaults
  }
};
