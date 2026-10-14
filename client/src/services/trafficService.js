import { apiRequest } from './api.js';

export const getTrafficReports = (token, destination, options = {}) =>
  apiRequest(`/api/traffic?destination=${encodeURIComponent(destination)}`, { ...options, token });

export const createTrafficReport = (token, body) =>
  apiRequest('/api/traffic', { method: 'POST', token, body });
