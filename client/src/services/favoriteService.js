import { apiRequest } from './api.js';

export const listFavorites = (token, options = {}) => apiRequest('/api/favorites', { ...options, token });
export const addFavorite = (token, destination) => apiRequest('/api/favorites', { method: 'POST', token, body: { destination } });
export const removeFavorite = (token, destinationId) => apiRequest(`/api/favorites/${destinationId}`, { method: 'DELETE', token });
