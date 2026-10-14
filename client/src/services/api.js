const API_BASE_URL = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '');

export async function apiRequest(path, { token, body, headers, ...options } = {}) {
  const requestHeaders = new Headers(headers);
  requestHeaders.set('Accept', 'application/json');

  if (body !== undefined) requestHeaders.set('Content-Type', 'application/json');
  if (token) requestHeaders.set('Authorization', `Bearer ${token}`);

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers: requestHeaders,
    body: body === undefined ? undefined : JSON.stringify(body),
  });

  const contentType = response.headers.get('content-type') || '';
  const payload = contentType.includes('application/json') ? await response.json() : null;

  if (!response.ok) {
    const error = new Error(payload?.message || 'Unable to complete the request');
    error.status = response.status;
    error.errors = payload?.errors || {};
    throw error;
  }

  return payload?.data;
}
