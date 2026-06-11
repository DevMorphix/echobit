import { apiRequest } from './http.js';

export const paymentsApi = {
  async createOrder(plan, couponCode) {
    return apiRequest('/payments/create-order', {
      method: 'POST',
      body: JSON.stringify({ plan, couponCode: couponCode || undefined }),
    });
  },
  async validateCoupon(code, plan) {
    return apiRequest('/payments/validate-coupon', {
      method: 'POST',
      body: JSON.stringify({ code, plan }),
    });
  },
  async verifyPayment(payload, plan) {
    return apiRequest('/payments/verify', {
      method: 'POST',
      body: JSON.stringify({ ...payload, plan }),
    });
  },
  async getStatus() {
    return apiRequest('/payments/status');
  },
};

export const plansApi = {
  async getAll() {
    return apiRequest('/plans');
  },
  async update(plan, features, monthlyPrice, annualMonthly, annualTotal, monthlyPaise, gates) {
    return apiRequest(`/admin/plans/${plan}`, {
      method: 'PUT',
      body: JSON.stringify({ features, monthlyPrice, annualMonthly, annualTotal, monthlyPaise, gates }),
    });
  },
};
