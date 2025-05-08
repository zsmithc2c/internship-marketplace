export function getAccess() {
  return localStorage.getItem('access') ?? '';
}
export function getRefresh() {
  return localStorage.getItem('refresh') ?? '';
}

export function saveTokens(access: string, refresh?: string) {
  localStorage.setItem('access', access);
  if (refresh) localStorage.setItem('refresh', refresh);
}

export function clearTokens() {
  localStorage.removeItem('access');
  localStorage.removeItem('refresh');
}

export async function refreshTokens(): Promise<string> {
  const refresh = getRefresh();
  if (!refresh) throw new Error('No refresh token');
  const res = await fetch('/api/auth/refresh/', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refresh }),
  });
  if (!res.ok) throw new Error('Token refresh failed');
  const { access } = (await res.json()) as { access: string };
  saveTokens(access, refresh);
  return access;
}
