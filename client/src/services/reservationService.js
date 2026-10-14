import { apiRequest } from './api.js';

export const createReservation = (token, body) => apiRequest('/api/reservations', { method: 'POST', token, body });
export const getMyReservations = (token, options = {}) => apiRequest('/api/reservations/my', { ...options, token });
export const getReservation = (token, id, options = {}) => apiRequest(`/api/reservations/${id}`, { ...options, token });
export const cancelReservation = (token, id) => apiRequest(`/api/reservations/${id}/cancel`, { method: 'PATCH', token });
export const checkInReservation = (token, id) => apiRequest(`/api/reservations/${id}/check-in`, { method: 'POST', token });
export const checkOutReservation = (token, id) => apiRequest(`/api/reservations/${id}/check-out`, { method: 'POST', token });
export const extendReservation = (token, id, endTime) => apiRequest(`/api/reservations/${id}/extend`, { method: 'PATCH', token, body: { endTime } });
export const verifyReservation = (token, id) => apiRequest(`/api/reservations/${id}/verify`, { token });
export const getReceipt = (token, id, options = {}) => apiRequest(`/api/reservations/${id}/receipt`, { ...options, token });
export const getExpenses = (token, options = {}) => apiRequest('/api/reservations/expenses', { ...options, token });
