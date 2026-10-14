import { apiRequest } from './api.js';

export const getMyWaitlist = (token, options = {}) => apiRequest('/api/waitlist/my', { ...options, token });
export const joinWaitlist = (token, area) => apiRequest('/api/waitlist', { method: 'POST', token, body: { area } });
export const leaveWaitlist = (token, id) => apiRequest(`/api/waitlist/${id}`, { method: 'DELETE', token });
