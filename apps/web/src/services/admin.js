import { apiRequest } from './http.js';

export const adminApi = {
  async getMe() {
    return apiRequest('/admin/me');
  },
  async getStats() {
    return apiRequest('/admin/stats');
  },
  async getUsers(page = 1, search = '') {
    return apiRequest(`/admin/users?page=${page}&search=${encodeURIComponent(search)}`);
  },
  async getUser(id) {
    return apiRequest(`/admin/users/${id}`);
  },
  async deleteUser(id) {
    return apiRequest(`/admin/users/${id}`, { method: 'DELETE' });
  },
  async updateUserOverrides(id, overrides) {
    return apiRequest(`/admin/users/${id}/overrides`, {
      method: 'PATCH',
      body: JSON.stringify(overrides),
    });
  },
  async getRecordings(page = 1, search = '') {
    return apiRequest(`/admin/recordings?page=${page}&search=${encodeURIComponent(search)}`);
  },
  async getActivity(limit = 30) {
    return apiRequest(`/admin/activity?limit=${limit}`);
  },
  async getAnalytics(days = 30) {
    return apiRequest(`/admin/analytics?days=${days}`);
  },
  async getCosts(days = 30) {
    return apiRequest(`/admin/costs?days=${days}`);
  },
  async getSubscriptions() {
    return apiRequest('/admin/subscriptions');
  },
};

export const couponsApi = {
  async getAll() {
    return apiRequest('/admin/coupons');
  },
  async create(data) {
    return apiRequest('/admin/coupons', { method: 'POST', body: JSON.stringify(data) });
  },
  async update(id, data) {
    return apiRequest(`/admin/coupons/${id}`, { method: 'PATCH', body: JSON.stringify(data) });
  },
  async remove(id) {
    return apiRequest(`/admin/coupons/${id}`, { method: 'DELETE' });
  },
};
