import express from 'express';
import Razorpay from 'razorpay';
import crypto from 'crypto';
import { authenticateToken } from '../middleware/auth.js';
import User from '../models/User.js';

const router = express.Router();

let _razorpay = null;
const getRazorpay = () => {
  if (!_razorpay) {
    _razorpay = new Razorpay({
      key_id: process.env.RAZORPAY_KEY_ID,
      key_secret: process.env.RAZORPAY_KEY_SECRET,
    });
  }
  return _razorpay;
};

// Plan → amount in paise (INR)
const PLANS = {
  starter_monthly: { amount:  14900, currency: 'INR', description: 'Echobit Starter – Monthly', tier: 'starter', cycle: 'monthly', days: 30  },
  starter_annual:  { amount: 118800, currency: 'INR', description: 'Echobit Starter – Annual',  tier: 'starter', cycle: 'annual',  days: 365 },
  pro_monthly:     { amount:  49900, currency: 'INR', description: 'Echobit Pro – Monthly',     tier: 'pro',     cycle: 'monthly', days: 30  },
  pro_annual:      { amount: 478800, currency: 'INR', description: 'Echobit Pro – Annual',      tier: 'pro',     cycle: 'annual',  days: 365 },
  growth_monthly:  { amount:  99900, currency: 'INR', description: 'Echobit Growth – Monthly',  tier: 'growth',  cycle: 'monthly', days: 30  },
  growth_annual:   { amount: 958800, currency: 'INR', description: 'Echobit Growth – Annual',   tier: 'growth',  cycle: 'annual',  days: 365 },
};

const DEV_MOCK = process.env.RAZORPAY_MOCK === 'true';

// POST /api/payments/create-order
router.post('/create-order', authenticateToken, async (req, res) => {
  try {
    const { plan } = req.body;

    const planConfig = PLANS[plan];
    if (!planConfig) {
      return res.status(400).json({ error: `Invalid plan. Valid plans: ${Object.keys(PLANS).join(', ')}` });
    }

    // Dev mock — returns a fake order so the frontend flow can be tested
    if (DEV_MOCK) {
      const mockId = `order_mock_${Date.now()}`;
      console.log('[Razorpay] MOCK mode — returning fake order:', mockId);
      return res.json({
        order_id: mockId,
        amount: planConfig.amount,
        currency: planConfig.currency,
        description: planConfig.description,
        mock: true,
      });
    }

    const order = await getRazorpay().orders.create({
      amount: planConfig.amount,
      currency: planConfig.currency,
      receipt: `rcpt_${Date.now()}`,
      notes: {
        user_id: req.user.id,
        user_email: req.user.email,
        plan,
      },
    });

    res.json({
      order_id: order.id,
      amount: order.amount,
      currency: order.currency,
      description: planConfig.description,
    });
  } catch (error) {
    console.error('Razorpay create-order error:', error);
    res.status(500).json({ error: 'Failed to create payment order' });
  }
});

// POST /api/payments/verify
router.post('/verify', authenticateToken, async (req, res) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, plan } = req.body;

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return res.status(400).json({ error: 'Missing required payment fields' });
    }

    const expectedSignature = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest('hex');

    if (expectedSignature !== razorpay_signature) {
      return res.status(400).json({ error: 'Payment signature verification failed' });
    }

    // Update user subscription in DB
    const planConfig = PLANS[plan];
    let subscription = null;
    if (planConfig) {
      const now = new Date();
      const expiresAt = new Date(now.getTime() + planConfig.days * 24 * 60 * 60 * 1000);
      await User.findByIdAndUpdate(req.user.id, {
        plan: planConfig.tier,
        planBillingCycle: planConfig.cycle,
        planStartDate: now,
        planExpiresAt: expiresAt,
      });
      subscription = { plan: planConfig.tier, planBillingCycle: planConfig.cycle, planExpiresAt: expiresAt };
    }

    res.json({
      success: true,
      payment_id: razorpay_payment_id,
      order_id: razorpay_order_id,
      message: 'Payment verified successfully',
      subscription,
    });
  } catch (error) {
    console.error('Razorpay verify error:', error);
    res.status(500).json({ error: 'Payment verification failed' });
  }
});

// GET /api/payments/status
router.get('/status', authenticateToken, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('plan planBillingCycle planStartDate planExpiresAt');
    if (!user) return res.status(404).json({ error: 'User not found' });

    const now = new Date();
    const isActive = user.plan !== 'free' && user.planExpiresAt && user.planExpiresAt > now;
    const daysRemaining = isActive
      ? Math.ceil((user.planExpiresAt - now) / (1000 * 60 * 60 * 24))
      : 0;

    res.json({
      plan: user.plan || 'free',
      planBillingCycle: user.planBillingCycle || null,
      planStartDate: user.planStartDate || null,
      planExpiresAt: user.planExpiresAt || null,
      isActive,
      daysRemaining,
    });
  } catch (error) {
    console.error('Payment status error:', error);
    res.status(500).json({ error: 'Failed to fetch subscription status' });
  }
});

export default router;
