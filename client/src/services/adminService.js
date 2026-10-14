import { apiRequest } from './api.js';

export const getDashboardStats = (token, options = {}) => apiRequest('/api/admin/stats', { ...options, token });
export const getHeatmap = (token, options = {}) => apiRequest('/api/admin/heatmap', { ...options, token });
export const listUsers = (token, options = {}) => apiRequest('/api/admin/users', { ...options, token });
export const updateUserRole = (token, id, role) => apiRequest(`/api/admin/users/${id}/role`, { method: 'PATCH', token, body: { role } });

export function listAdminReservations(token, filters = {}, options = {}) {
  const query = new URLSearchParams(Object.entries(filters).filter(([, value]) => value));
  return apiRequest(`/api/admin/reservations${query.size ? `?${query}` : ''}`, { ...options, token });
}
