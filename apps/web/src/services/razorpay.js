// Razorpay checkout wrapper: lazy script injection + order/verify flow.
// Used by Pricing.vue (and anywhere else that starts a checkout).

import { authState } from './http.js';
import { paymentsApi } from './payments.js';

export const PLAN_LABELS = {
  starter_monthly: 'Echobit Starter – Monthly',
  starter_annual: 'Echobit Starter – Annual',
  pro_monthly: 'Echobit Pro – Monthly',
  pro_annual: 'Echobit Pro – Annual',
  growth_monthly: 'Echobit Growth – Monthly',
  growth_annual: 'Echobit Growth – Annual',
};

const loadRazorpayScript = () =>
  new Promise((resolve, reject) => {
    if (window.Razorpay) {
      resolve();
      return;
    }
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('Failed to load Razorpay checkout'));
    document.head.appendChild(script);
  });

/**
 * Run the full checkout for `plan`. Callbacks:
 * - onSuccess(message, status)  — payment verified, subscription status refreshed
 * - onError(message)
 * - onDismiss()                 — user closed the modal
 * - onMock(order)               — RAZORPAY_MOCK backend response
 */
export async function checkout(plan, { couponCode, onSuccess, onError, onDismiss, onMock } = {}) {
  await loadRazorpayScript();

  const order = await paymentsApi.createOrder(plan, couponCode);

  if (order.mock) {
    onMock?.(order);
    return;
  }

  const options = {
    key: import.meta.env.VITE_RAZORPAY_KEY_ID,
    amount: order.amount,
    currency: order.currency,
    name: 'Echobit',
    description: order.description || PLAN_LABELS[plan],
    image: '/favicon.png',
    order_id: order.order_id,
    prefill: {
      name: authState.user?.name || '',
      email: authState.user?.email || '',
    },
    theme: { color: '#10b981' },
    config_id: import.meta.env.VITE_RAZORPAY_CONFIG_ID || undefined,
    webview_intent: true,
    handler: async (response) => {
      try {
        await paymentsApi.verifyPayment(
          {
            razorpay_order_id: response.razorpay_order_id,
            razorpay_payment_id: response.razorpay_payment_id,
            razorpay_signature: response.razorpay_signature,
          },
          plan,
        );

        let status = null;
        try {
          status = await paymentsApi.getStatus();
          if (authState.user) {
            authState.user.plan = status.plan;
            authState.user.planExpiresAt = status.planExpiresAt;
            authState.user.planBillingCycle = status.planBillingCycle;
            localStorage.setItem('user', JSON.stringify(authState.user));
          }
        } catch { /* status refresh is best-effort */ }

        onSuccess?.(`Payment successful! Your ${PLAN_LABELS[plan]} plan is now active.`, status);
      } catch {
        onError?.('Payment received but verification failed. Please contact support.');
      }
    },
    modal: {
      ondismiss() {
        onDismiss?.();
      },
    },
  };

  const rzp = new window.Razorpay(options);
  rzp.on('payment.failed', (response) => {
    onError?.(response.error?.description || 'Payment failed. Please try again.');
  });
  rzp.open();
}
