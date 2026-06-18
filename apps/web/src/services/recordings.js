import { apiRequest } from './http.js';

export const recordingsApi = {
  async getAll() {
    return apiRequest('/recordings');
  },

  // Server-paginated list. Returns { recordings, total, page, pages, limit }.
  async list({ page = 1, limit = 12, status = '', q = '' } = {}) {
    const params = new URLSearchParams({ page: String(page), limit: String(limit) });
    if (status) params.set('status', status);
    if (q) params.set('q', q);
    return apiRequest(`/recordings?${params.toString()}`);
  },

  async getLimits() {
    return apiRequest('/recordings/limits');
  },

  async getOne(id) {
    return apiRequest(`/recordings/${id}`);
  },

  // Presigned URL for direct upload to R2
  async getUploadUrl(mimeType) {
    return apiRequest('/recordings/upload-url', {
      method: 'POST',
      body: JSON.stringify({ mimeType }),
    });
  },

  // Upload file directly to R2 using the presigned URL
  async uploadToR2(uploadUrl, file, onProgress) {
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();

      xhr.upload.addEventListener('progress', (e) => {
        if (e.lengthComputable && onProgress) {
          onProgress(Math.round((e.loaded / e.total) * 100));
        }
      });

      xhr.addEventListener('load', () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          resolve();
        } else {
          reject(new Error(`Upload failed with status ${xhr.status}`));
        }
      });

      xhr.addEventListener('error', () => reject(new Error('Upload failed')));
      xhr.addEventListener('abort', () => reject(new Error('Upload aborted')));

      xhr.open('PUT', uploadUrl);
      xhr.setRequestHeader('Content-Type', file.type || 'audio/webm');
      xhr.send(file);
    });
  },

  // The web client uses the async pipeline: the API enqueues transcription and
  // returns immediately with status "transcribing"; poll via waitForTranscript.
  async create(recordingData) {
    return apiRequest('/recordings', {
      method: 'POST',
      body: JSON.stringify({ ...recordingData, async: true }),
    });
  },

  /**
   * Poll a recording until it leaves "transcribing" (async pipeline).
   * Calls onUpdate(recording) on each poll; resolves with the final recording.
   */
  async waitForTranscript(id, { intervalMs = 3000, timeoutMs = 10 * 60 * 1000, onUpdate } = {}) {
    const deadline = Date.now() + timeoutMs;
    for (;;) {
      const { recording } = await this.getOne(id);
      onUpdate?.(recording);
      if (recording.status !== 'transcribing' && recording.status !== 'pending') {
        return recording;
      }
      if (Date.now() > deadline) throw new Error('Transcription timed out');
      await new Promise((r) => setTimeout(r, intervalMs));
    }
  },

  async update(id, data) {
    return apiRequest(`/recordings/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  },

  async delete(id) {
    return apiRequest(`/recordings/${id}`, { method: 'DELETE' });
  },

  async transcribe(id) {
    return apiRequest(`/recordings/${id}/transcribe`, { method: 'POST' });
  },

  async summarize(id, transcript) {
    return apiRequest(`/recordings/${id}/summarize`, {
      method: 'POST',
      body: JSON.stringify({ transcript }),
    });
  },

  async generateMinutes(id) {
    return apiRequest(`/recordings/${id}/minutes`, { method: 'POST' });
  },

  async extractActions(id) {
    return apiRequest(`/recordings/${id}/actions`, { method: 'POST' });
  },

  async generateTitle(id) {
    return apiRequest(`/recordings/${id}/generate-title`, { method: 'POST' });
  },
};
