import { apiRequest } from './api.js';

export const getNotifications = (token, options = {}) => apiRequest('/api/notifications', { ...options, token });
export const markNotificationRead = (token, id) => apiRequest(`/api/notifications/${id}/read`, { method: 'PATCH', token });
export const markAllNotificationsRead = (token) => apiRequest('/api/notifications/read-all', { method: 'PATCH', token });
export const clearNotifications = (token) => apiRequest('/api/notifications', { method: 'DELETE', token });
