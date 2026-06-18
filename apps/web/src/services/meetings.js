import { apiRequest } from './http.js';

export const meetingsApi = {
  // Schedule (or start now) a Google Meet recording bot.
  // { meetingUrl, title?, scheduledAt? (ISO) }
  async create(data) {
    return apiRequest('/meetings', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async list() {
    return apiRequest('/meetings');
  },

  async getOne(id) {
    return apiRequest(`/meetings/${id}`);
  },

  async cancel(id) {
    return apiRequest(`/meetings/${id}`, { method: 'DELETE' });
  },
};
