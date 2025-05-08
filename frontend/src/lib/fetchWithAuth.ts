import { getAccess, refreshTokens } from '@/lib/auth';

/** Thin wrapper that injects JWT and silently refreshes once on 401. */
export async function fetchWithAuth(
  input: RequestInfo | URL,
  init: RequestInit = {}
): Promise<Response> {
  let access = getAccess();
  const headers = new Headers(init.headers ?? {});
  if (access) headers.set('Authorization', `Bearer ${access}`);

  let res = await fetch(input, { ...init, headers });

  /* one retry after refresh */
  if (res.status === 401 && getAccess()) {
    try {
      access = await refreshTokens();
      headers.set('Authorization', `Bearer ${access}`);
      res = await fetch(input, { ...init, headers });
    } catch {
      /* still fails → bubble up */
    }
  }
  return res;
}
