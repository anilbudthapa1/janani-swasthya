import { useAuth } from './store';

export async function api(path, options = {}) {
  const token = useAuth.getState().token;
  const response = await fetch(`${import.meta.env.VITE_API_URL || ''}/api${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers
    }
  });
  const data = await response.json().catch(() => ({}));
  if (response.status === 401 && token) useAuth.getState().logout();
  if (!response.ok) throw new Error(data.message || 'Request failed.');
  return data;
}
