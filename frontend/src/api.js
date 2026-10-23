async function request(path, options = {}) {
  const res = await fetch(`/api/transcriptions${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  if (res.status === 204) return null;
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(body.error || `Request failed (${res.status})`);
  return body;
}

export const api = {
  list: ({ page = 1, limit = 8, search = '' } = {}) =>
    request(`?page=${page}&limit=${limit}&search=${encodeURIComponent(search)}`),
  create: (payload) =>
    request('', { method: 'POST', body: JSON.stringify(payload) }),
  update: (id, payload) =>
    request(`/${id}`, { method: 'PUT', body: JSON.stringify(payload) }),
  remove: (id) => request(`/${id}`, { method: 'DELETE' }),
};
