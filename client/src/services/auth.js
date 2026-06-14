import api from './api';

export async function login(email, password) {
  const res = await api.post('/api/auth/login', { email, password });
  const data = res.data.data;

  // Store token in sessionStorage for mobile fallback (Authorization header)
  if (data.token) {
    sessionStorage.setItem('authToken', data.token);
  }

  return data;
}

export async function register(payload) {
  const res = await api.post('/api/auth/register', payload);
  return res.data.data;
}

export async function logout() {
  sessionStorage.removeItem('authToken');
  await api.post('/api/auth/logout');
}

export async function refresh() {
  const res = await api.post('/api/auth/refresh');
  return res.data.data;
}

export async function getMe() {
  const res = await api.get('/api/users/me');
  return res.data.data;
}
