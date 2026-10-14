import { apiRequest } from './api.js';

export function listDestinations(token, { q = '', category = '' } = {}, options = {}) {
  const query = new URLSearchParams();
  if (q) query.set('q', q);
  if (category) query.set('category', category);
  const suffix = query.toString() ? `?${query}` : '';
  return apiRequest(`/api/destinations${suffix}`, { ...options, token });
}

export const getDestination = (token, id, options = {}) => apiRequest(`/api/destinations/${id}`, { ...options, token });

export const getDestinationInsights = (token, id, options = {}) => apiRequest(`/api/destinations/${id}/insights`, { ...options, token });

export function getDestinationParking(token, id, { vehicleType = '' } = {}, options = {}) {
  const query = vehicleType ? `?vehicleType=${vehicleType}` : '';
  return apiRequest(`/api/destinations/${id}/parking${query}`, { ...options, token });
}
