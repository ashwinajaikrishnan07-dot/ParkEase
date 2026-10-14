import { apiRequest } from './api.js';

export const listParkingAreas = (token, options = {}) => apiRequest('/api/parking-areas', { ...options, token });
export const getParkingArea = (token, id, options = {}) => apiRequest(`/api/parking-areas/${id}`, { ...options, token });
export const getAlternatives = (token, id, options = {}) => apiRequest(`/api/parking-areas/${id}/alternatives`, { ...options, token });
export const createParkingArea = (token, body) => apiRequest('/api/parking-areas', { method: 'POST', token, body });
export const updateParkingArea = (token, id, body) => apiRequest(`/api/parking-areas/${id}`, { method: 'PUT', token, body });
export const deleteParkingArea = (token, id) => apiRequest(`/api/parking-areas/${id}`, { method: 'DELETE', token });

export function listParkingSlots(token, filters = {}, options = {}) {
  const query = new URLSearchParams(Object.entries(filters).filter(([, value]) => value));
  const suffix = query.size ? `?${query}` : '';
  return apiRequest(`/api/parking-slots${suffix}`, { ...options, token });
}

export const createParkingSlot = (token, body) => apiRequest('/api/parking-slots', { method: 'POST', token, body });
export const updateParkingSlot = (token, id, body) => apiRequest(`/api/parking-slots/${id}`, { method: 'PUT', token, body });
export const deleteParkingSlot = (token, id) => apiRequest(`/api/parking-slots/${id}`, { method: 'DELETE', token });
