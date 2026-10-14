import { apiRequest } from './api.js';

export const createReport = (token, body) => apiRequest('/api/reports', { method: 'POST', token, body });
export const getMyReports = (token, options = {}) => apiRequest('/api/reports/my', { ...options, token });
export function listReports(token, filters = {}, options = {}) {
  const query = new URLSearchParams(Object.entries(filters).filter(([, value]) => value));
  return apiRequest(`/api/reports${query.size ? `?${query}` : ''}`, { ...options, token });
}
export const getReport = (token, id, options = {}) => apiRequest(`/api/reports/${id}`, { ...options, token });
export const updateReportStatus = (token, id, status) => apiRequest(`/api/reports/${id}/status`, { method: 'PATCH', token, body: { status } });
