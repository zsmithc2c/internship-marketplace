// frontend/src/lib/auth.ts
/* ----------------------------------------------------------------
   Safe helpers for JWT storage.  Every function guards against
   server-side execution where `window` / `localStorage` are absent.
   ---------------------------------------------------------------- */

   function isBrowser(): boolean {
    return typeof window !== "undefined";
  }
  
  /* -------------------- getters -------------------- */
  export function getAccess(): string {
    return isBrowser() ? localStorage.getItem("access") ?? "" : "";
  }
  
  export function getRefresh(): string {
    return isBrowser() ? localStorage.getItem("refresh") ?? "" : "";
  }
  
  /* -------------------- setters -------------------- */
  export function saveTokens(access: string, refresh?: string) {
    if (!isBrowser()) return;
    localStorage.setItem("access", access);
    if (refresh) localStorage.setItem("refresh", refresh);
  }
  
  export function clearTokens() {
    if (!isBrowser()) return;
    localStorage.removeItem("access");
    localStorage.removeItem("refresh");
  }
  
  /* ------------- silent refresh flow -------------- */
  export async function refreshTokens(): Promise<string> {
    const refresh = getRefresh();
    if (!refresh) throw new Error("No refresh token");
  
    const res = await fetch("/api/auth/refresh/", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refresh }),
    });
    if (!res.ok) throw new Error("Token refresh failed");
  
    const { access } = (await res.json()) as { access: string };
    saveTokens(access, refresh);
    return access;
  }
  