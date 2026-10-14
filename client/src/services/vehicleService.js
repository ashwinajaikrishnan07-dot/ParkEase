import { apiRequest } from './api.js';

export function getVehicles(token) {
  return apiRequest('/api/vehicles', { token });
}

export function createVehicle(token, vehicle) {
  return apiRequest('/api/vehicles', { method: 'POST', token, body: vehicle });
}

export function updateVehicle(token, id, vehicle) {
  return apiRequest(`/api/vehicles/${id}`, { method: 'PUT', token, body: vehicle });
}

export function deleteVehicle(token, id) {
  return apiRequest(`/api/vehicles/${id}`, { method: 'DELETE', token });
}
