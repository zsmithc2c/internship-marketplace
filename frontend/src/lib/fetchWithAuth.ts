import { getAccess, refreshTokens, saveTokens } from "@/lib/auth";

/**
 * Thin wrapper around fetch that
 *   • injects the current JWT (if any)
 *   • retries once after a silent refresh on **401 Unauthorized**
 */
export async function fetchWithAuth(
  input: RequestInfo | URL,
  init: RequestInit = {},
): Promise<Response> {
  /* clone / normalise caller-supplied headers */
  const headers =
    init.headers instanceof Headers
      ? new Headers(init.headers) // safe mutable copy
      : new Headers(init.headers ?? {});

  /** attach Bearer token unless caller already set one */
  const addAuth = (token: string | null | undefined) => {
    if (token && !headers.has("Authorization")) {
      headers.set("Authorization", `Bearer ${token}`);
    }
  };

  addAuth(getAccess());

  /* first attempt */
  let res = await fetch(input, { ...init, headers });

  /* one retry after token refresh */
  if (res.status === 401 && getAccess()) {
    try {
      const fresh = await refreshTokens();   // may throw
      if (fresh) {
        saveTokens(fresh);                   // make it primary for other tabs
        addAuth(fresh);
        res = await fetch(input, { ...init, headers });
      }
    } catch {
      /* refresh failed – fall through with original 401 response */
    }
  }

  return res;
}
