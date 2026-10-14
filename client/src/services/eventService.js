import { apiRequest } from './api.js';

export function listEvents(token, { destination = '' } = {}, options = {}) {
  const query = destination ? `?destination=${destination}` : '';
  return apiRequest(`/api/events${query}`, { ...options, token });
}

export const createEvent = (token, body) => apiRequest('/api/events', { method: 'POST', token, body });
export const deleteEvent = (token, id) => apiRequest(`/api/events/${id}`, { method: 'DELETE', token });
