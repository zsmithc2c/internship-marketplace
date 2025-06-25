import { getAccess, refreshTokens } from "@/lib/auth";

/**
 * Thin wrapper around fetch that
 *   • injects the current JWT (if any)
 *   • retries once after a silent refresh on **401 Unauthorized**
 */
export async function fetchWithAuth(
  input: RequestInfo | URL,
  init: RequestInit = {},
): Promise<Response> {
  /* normalise caller-supplied headers */
  const headers =
    init.headers instanceof Headers
      ? new Headers(init.headers) // clone so we can mutate safely
      : new Headers(init.headers ?? {});

  /** ensure the Bearer token is present (don’t overwrite if caller set one) */
  const addAuth = (token: string | null | undefined) => {
    if (token && !headers.has("Authorization")) {
      headers.set("Authorization", `Bearer ${token}`);
    }
  };

  addAuth(getAccess());

  /* first attempt */
  let res = await fetch(input, { ...init, headers });

  /* one retry after a token refresh */
  if (res.status === 401 && getAccess()) {
    try {
      const fresh = await refreshTokens();
      addAuth(fresh);
      res = await fetch(input, { ...init, headers });
    } catch {
      /* refresh failed – fall through with original 401 response */
    }
  }

  return res;
}
