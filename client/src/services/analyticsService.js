import { apiRequest } from './api.js';

export const getAnalyticsDashboard = (token, options = {}) => apiRequest('/api/analytics/dashboard', { ...options, token });
export const getOccupancyAnalytics = (token, options = {}) => apiRequest('/api/analytics/occupancy', { ...options, token });
export const getPeakHours = (token, options = {}) => apiRequest('/api/analytics/peak-hours', { ...options, token });
