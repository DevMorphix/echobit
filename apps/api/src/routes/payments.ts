// Payments — exact contract port of backend/routes/payments.js, with the
// Razorpay SDK replaced by raw REST and the signature check made timing-safe.

import { Hono } from 'hono';
import { PAYMENT_PLANS } from '@echobit/shared/plans';
import { createRazorpayOrder, verifyRazorpaySignature } from '../lib/razorpay.ts';
import { serializeCoupon } from '../lib/serialize.ts';
import { getUserById, nowIso, updateRow } from '../lib/db.ts';
import { parseBody, schemas } from '../lib/validate.ts';
import { authenticateToken } from '../middleware/auth.ts';
import type { CouponRow, Env, HonoEnv } from '../types.ts';

const payments = new Hono<HonoEnv>();
payments.use('*', authenticateToken);

interface CouponResult {
  coupon: CouponRow | null;
  finalAmount: number;
}

class CouponError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

const applyCoupon = async (
  env: Env,
  code: string | undefined,
  planKey: string,
  baseAmount: number,
): Promise<CouponResult> => {
  if (!code) return { coupon: null, finalAmount: baseAmount };

  const coupon = await env.DB.prepare('SELECT * FROM coupons WHERE code = ?')
    .bind(code.toUpperCase().trim())
    .first<CouponRow>();
  if (!coupon || !coupon.is_active) throw new CouponError(400, 'Invalid or inactive coupon code.');
  if (coupon.expires_at && new Date(coupon.expires_at) < new Date()) {
    throw new CouponError(400, 'This coupon has expired.');
  }
  if (coupon.max_uses !== null && coupon.used_count >= coupon.max_uses) {
    throw new CouponError(400, 'This coupon has reached its usage limit.');
  }
  const applicablePlans = JSON.parse(coupon.applicable_plans) as string[];
  if (applicablePlans.length && !applicablePlans.includes(planKey)) {
    throw new CouponError(400, 'This coupon is not valid for the selected plan.');
  }

  let finalAmount = baseAmount;
  if (coupon.discount_type === 'percent') {
    finalAmount = Math.round(baseAmount * (1 - coupon.discount_value / 100));
  } else {
    finalAmount = Math.max(0, baseAmount - coupon.discount_value);
  }
  return { coupon, finalAmount };
};

const incrementCouponUse = (env: Env, couponId: string) =>
  env.DB.prepare('UPDATE coupons SET used_count = used_count + 1, updated_at = ? WHERE id = ?')
    .bind(nowIso(), couponId)
    .run();

// POST /api/payments/validate-coupon
payments.post('/validate-coupon', async (c) => {
  try {
    const body = await parseBody(c.req, schemas.validateCoupon);
    if (!body || !body.code || !body.plan) {
      return c.json({ error: 'code and plan are required' }, 400);
    }
    const { code, plan } = body;

    const planConfig = PAYMENT_PLANS[plan];
    if (!planConfig) return c.json({ error: 'Invalid plan' }, 400);

    const { coupon, finalAmount } = await applyCoupon(c.env, code, plan, planConfig.amount);
    const discount = planConfig.amount - finalAmount;

    return c.json({
      valid: true,
      discountType: coupon?.discount_type,
      discountValue: coupon?.discount_value,
      originalAmount: planConfig.amount,
      finalAmount,
      discountAmount: discount,
    });
  } catch (err) {
    if (err instanceof CouponError) return c.json({ error: err.message }, err.status as 400);
    console.error('validate-coupon error:', err);
    return c.json({ error: 'Failed to validate coupon' }, 500);
  }
});

// POST /api/payments/create-order
payments.post('/create-order', async (c) => {
  try {
    const body = await parseBody(c.req, schemas.createOrder);
    const { plan, couponCode } = body ?? {};

    const planConfig = plan ? PAYMENT_PLANS[plan] : undefined;
    if (!plan || !planConfig) {
      return c.json(
        { error: `Invalid plan. Valid plans: ${Object.keys(PAYMENT_PLANS).join(', ')}` },
        400,
      );
    }

    let finalAmount = planConfig.amount;
    let appliedCoupon: CouponRow | null = null;
    if (couponCode) {
      try {
        const result = await applyCoupon(c.env, couponCode, plan, planConfig.amount);
        finalAmount = result.finalAmount;
        appliedCoupon = result.coupon;
      } catch (err) {
        if (err instanceof CouponError) return c.json({ error: err.message }, err.status as 400);
        throw err;
      }
    }

    // Dev mock — returns a fake order so the frontend flow can be tested
    if (c.env.RAZORPAY_MOCK === 'true') {
      const mockId = `order_mock_${Date.now()}`;
      if (appliedCoupon) await incrementCouponUse(c.env, appliedCoupon.id);
      return c.json({
        order_id: mockId,
        amount: finalAmount,
        currency: planConfig.currency,
        description: planConfig.description,
        mock: true,
      });
    }

    const user = c.get('user');
    const order = await createRazorpayOrder(
      c.env.RAZORPAY_KEY_ID ?? '',
      c.env.RAZORPAY_KEY_SECRET ?? '',
      {
        amount: finalAmount,
        currency: planConfig.currency,
        receipt: `rcpt_${Date.now()}`,
        notes: {
          user_id: user.id,
          user_email: user.email,
          plan,
          coupon: couponCode || '',
        },
      },
    );

    if (appliedCoupon) await incrementCouponUse(c.env, appliedCoupon.id);

    return c.json({
      order_id: order.id,
      amount: order.amount,
      currency: order.currency,
      description: planConfig.description,
    });
  } catch (error) {
    console.error('Razorpay create-order error:', error);
    return c.json({ error: 'Failed to create payment order' }, 500);
  }
});

// POST /api/payments/verify
payments.post('/verify', async (c) => {
  try {
    const body = await parseBody(c.req, schemas.verifyPayment);
    if (!body || !body.razorpay_order_id || !body.razorpay_payment_id || !body.razorpay_signature) {
      return c.json({ error: 'Missing required payment fields' }, 400);
    }
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, plan } = body;

    const valid = await verifyRazorpaySignature(
      c.env.RAZORPAY_KEY_SECRET ?? '',
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
    );
    if (!valid) {
      return c.json({ error: 'Payment signature verification failed' }, 400);
    }

    const planConfig = plan ? PAYMENT_PLANS[plan] : undefined;
    let subscription: { plan: string; planBillingCycle: string; planExpiresAt: string } | null = null;
    if (planConfig) {
      const now = new Date();
      const expiresAt = new Date(now.getTime() + planConfig.days * 24 * 60 * 60 * 1000);
      await updateRow(c.env, 'users', c.get('user').id, {
        plan: planConfig.tier,
        plan_billing_cycle: planConfig.cycle,
        plan_start_date: now.toISOString(),
        plan_expires_at: expiresAt.toISOString(),
      });
      subscription = {
        plan: planConfig.tier,
        planBillingCycle: planConfig.cycle,
        planExpiresAt: expiresAt.toISOString(),
      };
    }

    return c.json({
      success: true,
      payment_id: razorpay_payment_id,
      order_id: razorpay_order_id,
      message: 'Payment verified successfully',
      subscription,
    });
  } catch (error) {
    console.error('Razorpay verify error:', error);
    return c.json({ error: 'Payment verification failed' }, 500);
  }
});

// GET /api/payments/status
payments.get('/status', async (c) => {
  try {
    const user = await getUserById(c.env, c.get('user').id);
    if (!user) return c.json({ error: 'User not found' }, 404);

    const now = new Date();
    const expiresAt = user.plan_expires_at ? new Date(user.plan_expires_at) : null;
    const isActive = user.plan !== 'free' && !!expiresAt && expiresAt > now;
    const daysRemaining =
      isActive && expiresAt
        ? Math.ceil((expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
        : 0;

    return c.json({
      plan: user.plan || 'free',
      planBillingCycle: user.plan_billing_cycle || null,
      planStartDate: user.plan_start_date || null,
      planExpiresAt: user.plan_expires_at || null,
      isActive,
      daysRemaining,
    });
  } catch (error) {
    console.error('Payment status error:', error);
    return c.json({ error: 'Failed to fetch subscription status' }, 500);
  }
});

export { serializeCoupon };
export default payments;
